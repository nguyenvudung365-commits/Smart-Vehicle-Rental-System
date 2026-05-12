const prisma = require('../config/prisma');
const { createNotification } = require('./notification.service');
const { calcEarnedPoints, spendPoints, addPoints } = require('./points.service');
const { checkVoucher, applyVoucherTx } = require('./voucher.service');

const PLATFORM_FEE_RATE = 0.20; // Phí nền tảng 20%

async function getPlatformFeeRate() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'platform_fee_rate' } });
    if (config) return parseFloat(config.value);
  } catch {}
  return PLATFORM_FEE_RATE;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Làm tròn lên để thuê dưới 24h vẫn tính 1 ngày
function calcRentalDays(start, end) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / MS_PER_DAY));
}

// payload: { vehicleId, startDate, endDate, cardId, note, usePoints, voucherCode }
async function createBooking(renterId, payload) {
  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);

  // Cho phép sai lệch 10 phút vì đồng hồ mobile và server có thể lệch nhau
  if (startDate < new Date(Date.now() - 10 * 60_000)) {
    const err = new Error('Ngày bắt đầu không hợp lệ, vui lòng chọn lại');
    err.status = 400;
    throw err;
  }

  // Kiểm tra KYC trước transaction để giảm thời gian giữ lock DB
  const kyc = await prisma.kyc.findUnique({ where: { userId: renterId } });
  if (!kyc || kyc.status !== 'approved') {
    const err = new Error('Bạn cần xác thực GPLX trước khi đặt xe');
    err.status = 403;
    err.code = 'KYC_REQUIRED';
    throw err;
  }

  // Kiểm tra voucher ngoài transaction (tránh giữ lock lâu)
  let voucherData = null;
  if (payload.voucherCode) {
    // Tính tạm subtotal để validate minOrderValue — sẽ tính lại chính xác trong tx
    const tempDays = Math.max(1, Math.ceil((new Date(payload.endDate) - new Date(payload.startDate)) / (24*60*60*1000)));
    const tempVehicle = await prisma.vehicle.findUnique({ where: { id: payload.vehicleId }, select: { pricePerDay: true } });
    const tempSubtotal = tempDays * Number(tempVehicle?.pricePerDay || 0);
    voucherData = await checkVoucher(payload.voucherCode, tempSubtotal);
  }

  // Dùng transaction để đảm bảo tính nhất quán:
  // nếu bất kỳ bước nào thất bại, toàn bộ sẽ rollback
  return await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: payload.vehicleId } });
    if (!vehicle) {
      const err = new Error('Không tìm thấy xe'); err.status = 404; throw err;
    }
    if (vehicle.status !== 'approved' || !vehicle.isAvailable) {
      const err = new Error('Xe không khả dụng để đặt'); err.status = 400; throw err;
    }
    if (vehicle.ownerId === renterId) {
      const err = new Error('Không thể đặt xe của chính mình'); err.status = 400; throw err;
    }

    // Kiểm tra khách bị host chặn
    const isBlocked = await tx.blockedRenter.findUnique({
      where: { hostId_renterId: { hostId: vehicle.ownerId, renterId } },
    });
    if (isBlocked) {
      const err = new Error('Bạn không thể đặt xe của chủ xe này');
      err.status = 403; throw err;
    }

    // Phát hiện trùng lịch: đơn cũ bắt đầu trước khi đơn mới kết thúc
    // VÀ đơn cũ kết thúc sau khi đơn mới bắt đầu → chồng lịch
    const conflict = await tx.booking.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: { in: ['pending_payment', 'confirmed', 'in_progress'] },
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    });
    if (conflict) {
      const err = new Error('Xe đã có đơn thuê trong khoảng thời gian này');
      err.status = 409; throw err;
    }

    let cardLast4 = null;
    if (payload.cardId) {
      const card = await tx.paymentCard.findFirst({
        where: { id: payload.cardId, userId: renterId },
      });
      if (!card) {
        const err = new Error('Thẻ thanh toán không hợp lệ'); err.status = 400; throw err;
      }
      cardLast4 = card.last4; // Chỉ lưu 4 số cuối, không lưu số thẻ đầy đủ
    }

    const rentalDays = calcRentalDays(startDate, endDate);
    const pricePerDay = Number(vehicle.pricePerDay);
    const subtotal = rentalDays * pricePerDay;

    // Tính giảm giá bằng điểm thưởng (tối đa 30% tổng tiền, 1 điểm = 1.000đ)
    let discountAmount = 0;
    const usePoints = Math.max(0, parseInt(payload.usePoints || 0));
    if (usePoints > 0) {
      const renter = await tx.user.findUnique({
        where: { id: renterId },
        select: { rewardPoints: true },
      });
      const available = renter?.rewardPoints ?? 0;
      const actualPoints = Math.min(usePoints, available); // Không dùng nhiều hơn số dư
      const maxVnd = Math.floor(subtotal * 0.3); // Giới hạn 30% tổng tiền
      discountAmount = Math.min(actualPoints * 1000, maxVnd);

      if (discountAmount > 0) {
        const pointsToSpend = Math.ceil(discountAmount / 1000);
        // decrement là atomic — tránh race condition khi nhiều request cùng lúc
        await tx.user.update({
          where: { id: renterId },
          data: { rewardPoints: { decrement: pointsToSpend } },
        });
        await tx.pointHistory.create({
          data: {
            userId: renterId,
            points: -pointsToSpend,
            type: 'points_used',
            description: `Dùng điểm giảm giá đặt xe ${vehicle.brand} ${vehicle.model}`,
          },
        });
      }
    }

    // Tính giảm giá voucher
    let voucherDiscount = 0;
    let voucherId = null;
    if (voucherData) {
      // Tính lại chính xác trong transaction
      if (voucherData.voucher.discountType === 'percent') {
        voucherDiscount = Math.floor(subtotal * Number(voucherData.voucher.discountValue) / 100);
        if (voucherData.voucher.maxDiscount) {
          voucherDiscount = Math.min(voucherDiscount, Number(voucherData.voucher.maxDiscount));
        }
      } else {
        voucherDiscount = Math.min(Number(voucherData.voucher.discountValue), subtotal);
      }
      voucherId = voucherData.voucher.id;
      await applyVoucherTx(tx, voucherId);
    }

    const totalAmount = Math.max(0, subtotal - discountAmount - voucherDiscount);

    const booking = await tx.booking.create({
      data: {
        renterId,
        vehicleId: vehicle.id,
        voucherId,
        startDate,
        endDate,
        rentalDays,
        pricePerDay: vehicle.pricePerDay,
        subtotal,
        discountAmount,
        voucherDiscount,
        totalAmount,
        note: payload.note || null,
        cardLast4,
        status: 'pending_payment',
      },
      include: {
        vehicle: { include: { images: { where: { isCover: true }, take: 1 } } },
      },
    });

    // Tích điểm thưởng ngay khi đặt: 1 điểm / 10.000đ
    const earnedPoints = calcEarnedPoints(totalAmount);
    if (earnedPoints > 0) {
      await tx.user.update({
        where: { id: renterId },
        data: { rewardPoints: { increment: earnedPoints } },
      });
      await tx.pointHistory.create({
        data: {
          userId: renterId,
          points: earnedPoints,
          type: 'booking_reward',
          description: `Tích điểm đặt xe ${vehicle.brand} ${vehicle.model} (${rentalDays} ngày)`,
        },
      });
    }

    const otp = '000000';
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        paymentOtp: otp,
        paymentOtpExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { ...booking, earnedPoints };
  });
}

async function confirmPayment(bookingId, renterId, otp) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.renterId !== renterId) {
    const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err;
  }
  if (booking.status !== 'pending_payment') {
    const err = new Error('Đơn đã được xử lý'); err.status = 400; throw err;
  }
  if (!booking.paymentOtp || booking.paymentOtp !== otp) {
    const err = new Error('Mã OTP không đúng'); err.status = 400; throw err;
  }
  if (booking.paymentOtpExpiresAt < new Date()) {
    const err = new Error('Mã OTP đã hết hạn, vui lòng tạo đơn mới'); err.status = 400; throw err;
  }
  // Xóa OTP sau khi dùng
  return await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentOtp: null, paymentOtpExpiresAt: null },
  });
}

async function getMyBookings(renterId, statusFilter) {
  const where = { renterId };
  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter;
  }
  return await prisma.booking.findMany({
    where,
    include: {
      vehicle: {
        include: {
          images: { where: { isCover: true }, take: 1 },
          address: true,
        },
      },
      review: { select: { id: true, rating: true, comment: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getBookingById(id, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      vehicle: {
        include: {
          images: true,
          address: true,
          owner: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
        },
      },
      renter: { select: { id: true, fullName: true, avatarUrl: true, phone: true, email: true } },
      voucher: { select: { id: true, code: true, discountType: true } },
      hostReview: { select: { id: true, rating: true, comment: true } },
    },
  });
  if (!booking) return null;
  if (booking.renterId !== userId && booking.vehicle.ownerId !== userId) {
    const err = new Error('Không có quyền xem đơn này');
    err.status = 403;
    throw err;
  }
  return booking;
}

async function cancelBooking(bookingId, renterId, reason) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, renterId },
  });
  if (!booking) {
    const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err;
  }
  if (!['pending_payment', 'confirmed'].includes(booking.status)) {
    const err = new Error('Chỉ hủy được đơn chưa nhận xe'); err.status = 400; throw err;
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'cancelled', cancelReason: reason || null },
  });

  createNotification(renterId, {
    title: 'Đơn thuê đã bị hủy',
    body: `Đơn thuê xe của bạn đã được hủy thành công${reason ? ': ' + reason : ''}.`,
    type: 'booking_cancelled',
  }).catch(() => {});

  return updated;
}

async function updateBookingStatus(bookingId, userId, newStatus) {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [{ renterId: userId }, { vehicle: { ownerId: userId } }],
    },
    include: { vehicle: true },
  });
  if (!booking) {
    const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err;
  }

  const allowed = {
    confirmed:   ['in_progress'],
    in_progress: ['completed'],
  };
  if (!allowed[booking.status]?.includes(newStatus)) {
    const err = new Error(`Không thể chuyển sang trạng thái ${newStatus}`); err.status = 400; throw err;
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus },
  });

  if (newStatus === 'completed') {
    createNotification(booking.renterId, {
      title: 'Chuyến đi hoàn thành',
      body: `Chuyến thuê ${booking.vehicle?.brand || ''} đã kết thúc. Hãy đánh giá trải nghiệm!`,
      type: 'booking_confirmed',
    }).catch(() => {});
  }

  return updated;
}

async function getHostBookings(hostId, statusFilter) {
  const where = { vehicle: { ownerId: hostId } };
  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter;
  }
  return await prisma.booking.findMany({
    where,
    include: {
      vehicle: {
        include: {
          images: { where: { isCover: true }, take: 1 },
          address: true,
        },
      },
      renter: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function hostConfirmBooking(bookingId, hostId) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vehicle: { ownerId: hostId } },
    include: { vehicle: true },
  });
  if (!booking) {
    const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err;
  }
  if (booking.status !== 'pending_payment') {
    const err = new Error('Chỉ có thể xác nhận đơn đang chờ'); err.status = 400; throw err;
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'confirmed' },
  });

  createNotification(booking.renterId, {
    title: 'Đơn thuê được xác nhận',
    body: `Chủ xe đã xác nhận đơn thuê ${booking.vehicle?.brand || ''}. Chúc bạn chuyến đi vui vẻ!`,
    type: 'booking_confirmed',
  }).catch(() => {});

  return updated;
}

async function hostRejectBooking(bookingId, hostId, reason) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vehicle: { ownerId: hostId } },
    include: { vehicle: true },
  });
  if (!booking) {
    const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err;
  }
  if (booking.status !== 'pending_payment') {
    const err = new Error('Chỉ có thể từ chối đơn đang chờ'); err.status = 400; throw err;
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'cancelled', cancelReason: reason || 'Chủ xe từ chối' },
  });

  createNotification(booking.renterId, {
    title: 'Đơn thuê bị từ chối',
    body: `Chủ xe đã từ chối đơn thuê của bạn${reason ? ': ' + reason : ''}`,
    type: 'booking_cancelled',
  }).catch(() => {});

  return updated;
}

async function getHostStats(hostId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalVehicles,
    totalBookings,
    pendingBookings,
    completedBookings,
    revenueAll,
    revenueThisMonth,
    revenueLastMonth,
    recentBookings,
    topVehicles,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { ownerId: hostId } }),
    prisma.booking.count({ where: { vehicle: { ownerId: hostId } } }),
    prisma.booking.count({ where: { vehicle: { ownerId: hostId }, status: 'pending_payment' } }),
    prisma.booking.count({ where: { vehicle: { ownerId: hostId }, status: 'completed' } }),
    prisma.booking.aggregate({
      where: { vehicle: { ownerId: hostId }, status: 'completed' },
      _sum: { totalAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        vehicle: { ownerId: hostId },
        status: 'completed',
        createdAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        vehicle: { ownerId: hostId },
        status: 'completed',
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: { vehicle: { ownerId: hostId } },
      include: {
        vehicle: { select: { brand: true, model: true } },
        renter: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.vehicle.findMany({
      where: { ownerId: hostId },
      include: {
        _count: { select: { bookings: true } },
        images: { where: { isCover: true }, take: 1 },
      },
      orderBy: { bookings: { _count: 'desc' } },
      take: 3,
    }),
  ]);

  const statusBreakdown = await prisma.booking.groupBy({
    by: ['status'],
    where: { vehicle: { ownerId: hostId } },
    _count: { status: true },
  });

  const feeRate = await getPlatformFeeRate();
  const grossTotal = Number(revenueAll._sum.totalAmount || 0);
  const grossMonth = Number(revenueThisMonth._sum.totalAmount || 0);
  const grossLastMonth = Number(revenueLastMonth._sum.totalAmount || 0);

  return {
    totalVehicles,
    totalBookings,
    pendingBookings,
    completedBookings,
    platformFeeRate: feeRate,
    revenue: {
      total: grossTotal,
      thisMonth: grossMonth,
      lastMonth: grossLastMonth,
      // Doanh thu sau khi trừ phí nền tảng
      netTotal: Math.round(grossTotal * (1 - feeRate)),
      netThisMonth: Math.round(grossMonth * (1 - feeRate)),
      netLastMonth: Math.round(grossLastMonth * (1 - feeRate)),
    },
    statusBreakdown: statusBreakdown.reduce((acc, s) => {
      acc[s.status] = s._count.status;
      return acc;
    }, {}),
    recentBookings,
    topVehicles: topVehicles.map(v => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      coverImage: v.images[0]?.imageUrl || null,
      totalBookings: v._count.bookings,
    })),
  };
}

// Bước 1: Host bàn giao xe cho khách (có thể kèm ảnh)
async function hostHandover(bookingId, hostId, imageUrl) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vehicle: { ownerId: hostId } },
    include: { vehicle: true },
  });
  if (!booking) { const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err; }
  if (booking.status !== 'confirmed') {
    const err = new Error('Chỉ bàn giao được đơn đã xác nhận'); err.status = 400; throw err;
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'host_handover', ...(imageUrl && { handoverImageUrl: imageUrl }) },
  });
  createNotification(booking.renterId, {
    title: 'Chủ xe đã bàn giao xe',
    body: `${booking.vehicle?.brand} ${booking.vehicle?.model} đã sẵn sàng. Xác nhận bạn đã nhận xe nhé!`,
    type: 'booking_confirmed',
  }).catch(() => {});
  return updated;
}

// Bước 2: Khách xác nhận đã nhận xe (có thể kèm ảnh)
async function renterConfirmReceived(bookingId, renterId, imageUrl) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, renterId },
    include: { vehicle: true },
  });
  if (!booking) { const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err; }
  if (booking.status !== 'host_handover') {
    const err = new Error('Chủ xe chưa bàn giao xe'); err.status = 400; throw err;
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'in_progress', ...(imageUrl && { renterReceivedImageUrl: imageUrl }) },
  });
  createNotification(booking.vehicle.ownerId, {
    title: 'Khách đã nhận xe',
    body: `Khách thuê đã xác nhận nhận ${booking.vehicle?.brand} ${booking.vehicle?.model}. Chuyến đi bắt đầu!`,
    type: 'booking_confirmed',
  }).catch(() => {});
  return updated;
}

// Bước 3: Khách hoàn thành chuyến, trả xe (có thể kèm ảnh)
async function renterReturnVehicle(bookingId, renterId, imageUrl) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, renterId },
    include: { vehicle: true },
  });
  if (!booking) { const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err; }
  if (booking.status !== 'in_progress') {
    const err = new Error('Chuyến đi chưa bắt đầu'); err.status = 400; throw err;
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'renter_return', ...(imageUrl && { renterReturnImageUrl: imageUrl }) },
  });
  createNotification(booking.vehicle.ownerId, {
    title: 'Khách đã trả xe',
    body: `Khách thuê đã trả ${booking.vehicle?.brand} ${booking.vehicle?.model}. Hãy xác nhận nhận xe!`,
    type: 'booking_confirmed',
  }).catch(() => {});
  return updated;
}

// Bước 4: Host xác nhận đã nhận xe lại, kết thúc chuyến (có thể kèm ảnh)
async function hostConfirmReturn(bookingId, hostId, imageUrl) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vehicle: { ownerId: hostId } },
    include: { vehicle: true },
  });
  if (!booking) { const err = new Error('Không tìm thấy đơn'); err.status = 404; throw err; }
  if (booking.status !== 'renter_return') {
    const err = new Error('Khách chưa trả xe'); err.status = 400; throw err;
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'completed', ...(imageUrl && { hostReceivedImageUrl: imageUrl }) },
  });
  createNotification(booking.renterId, {
    title: 'Chuyến đi hoàn thành',
    body: `Chuyến thuê ${booking.vehicle?.brand} ${booking.vehicle?.model} đã kết thúc. Hãy đánh giá trải nghiệm!`,
    type: 'booking_confirmed',
  }).catch(() => {});
  return updated;
}

module.exports = {
  createBooking, confirmPayment,
  getMyBookings, getBookingById, cancelBooking, updateBookingStatus,
  getHostBookings, hostConfirmBooking, hostRejectBooking, getHostStats,
  hostHandover, renterConfirmReceived, renterReturnVehicle, hostConfirmReturn,
};
