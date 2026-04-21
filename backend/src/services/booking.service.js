const prisma = require('../config/prisma');
const { createNotification } = require('./notification.service');
const { calcEarnedPoints, spendPoints, addPoints } = require('./points.service');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function calcRentalDays(start, end) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / MS_PER_DAY));
}

// payload: { vehicleId, startDate, endDate, cardId, note, usePoints }
// usePoints: so diem muon dung (0 = khong dung)
async function createBooking(renterId, payload) {
  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);

  if (startDate < new Date(Date.now() - 10 * 60_000)) {
    const err = new Error('Ngày bắt đầu không hợp lệ, vui lòng chọn lại');
    err.status = 400;
    throw err;
  }

  const kyc = await prisma.kyc.findUnique({ where: { userId: renterId } });
  if (!kyc || kyc.status !== 'approved') {
    const err = new Error('Ban can xac thuc GPLX truoc khi dat xe');
    err.status = 403;
    err.code = 'KYC_REQUIRED';
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: payload.vehicleId } });
    if (!vehicle) {
      const err = new Error('Khong tim thay xe'); err.status = 404; throw err;
    }
    if (vehicle.status !== 'approved' || !vehicle.isAvailable) {
      const err = new Error('Xe khong kha dung de dat'); err.status = 400; throw err;
    }
    if (vehicle.ownerId === renterId) {
      const err = new Error('Khong the dat xe cua chinh minh'); err.status = 400; throw err;
    }

    const conflict = await tx.booking.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: { in: ['pending_payment', 'confirmed', 'in_progress'] },
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    });
    if (conflict) {
      const err = new Error('Xe da co don thue trong khoang thoi gian nay');
      err.status = 409; throw err;
    }

    let cardLast4 = null;
    if (payload.cardId) {
      const card = await tx.paymentCard.findFirst({
        where: { id: payload.cardId, userId: renterId },
      });
      if (!card) {
        const err = new Error('The thanh toan khong hop le'); err.status = 400; throw err;
      }
      cardLast4 = card.last4;
    }

    const rentalDays = calcRentalDays(startDate, endDate);
    const pricePerDay = Number(vehicle.pricePerDay);
    const subtotal = rentalDays * pricePerDay;

    // Tinh giam gia bang diem
    let discountAmount = 0;
    const usePoints = Math.max(0, parseInt(payload.usePoints || 0));
    if (usePoints > 0) {
      const renter = await tx.user.findUnique({
        where: { id: renterId },
        select: { rewardPoints: true },
      });
      const available = renter?.rewardPoints ?? 0;
      const actualPoints = Math.min(usePoints, available);
      const maxVnd = Math.floor(subtotal * 0.3);
      discountAmount = Math.min(actualPoints * 1000, maxVnd);

      if (discountAmount > 0) {
        const pointsToSpend = Math.ceil(discountAmount / 1000);
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

    const totalAmount = Math.max(0, subtotal - discountAmount);

    const booking = await tx.booking.create({
      data: {
        renterId,
        vehicleId: vehicle.id,
        startDate,
        endDate,
        rentalDays,
        pricePerDay: vehicle.pricePerDay,
        subtotal,
        discountAmount,
        totalAmount,
        note: payload.note || null,
        cardLast4,
        status: cardLast4 ? 'confirmed' : 'pending_payment',
      },
      include: {
        vehicle: { include: { images: { where: { isCover: true }, take: 1 } } },
      },
    });

    // Tich diem khi dat xe thanh cong (1 diem / 10k)
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

    createNotification(renterId, {
      title: 'Đặt xe thành công',
      body: `Chuyến đi ${booking.vehicle?.brand || ''} đã được xác nhận. Mã đơn: ${booking.id.slice(0,8).toUpperCase()}`,
      type: 'booking_confirmed',
    }).catch(() => {});

    return { ...booking, earnedPoints };
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
          owner: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!booking) return null;
  if (booking.renterId !== userId && booking.vehicle.ownerId !== userId) {
    const err = new Error('Khong co quyen xem don nay');
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
    const err = new Error('Khong tim thay don'); err.status = 404; throw err;
  }
  if (!['pending_payment', 'confirmed'].includes(booking.status)) {
    const err = new Error('Chi huy duoc don chua nhan xe'); err.status = 400; throw err;
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

module.exports = { createBooking, getMyBookings, getBookingById, cancelBooking };
