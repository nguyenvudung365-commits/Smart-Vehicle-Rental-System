const prisma = require('../config/prisma');

async function createReview(renterId, { bookingId, rating, comment }) {
  // Kiem tra booking ton tai, da completed va thuoc ve renter nay
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, renterId: true, vehicleId: true, status: true },
  });

  if (!booking) {
    const err = new Error('Không tìm thấy chuyến đi');
    err.status = 404;
    throw err;
  }
  if (booking.renterId !== renterId) {
    const err = new Error('Không có quyền đánh giá chuyến đi này');
    err.status = 403;
    throw err;
  }
  if (booking.status !== 'completed') {
    const err = new Error('Chỉ đánh giá được chuyến đi đã hoàn thành');
    err.status = 400;
    throw err;
  }

  // Kiem tra da danh gia chua
  const existing = await prisma.review.findUnique({ where: { bookingId } });
  if (existing) {
    const err = new Error('Bạn đã đánh giá chuyến đi này rồi');
    err.status = 409;
    throw err;
  }

  if (rating < 1 || rating > 5) {
    const err = new Error('Đánh giá phải từ 1 đến 5 sao');
    err.status = 400;
    throw err;
  }

  return prisma.review.create({
    data: {
      bookingId,
      renterId,
      vehicleId: booking.vehicleId,
      rating,
      comment: comment || null,
    },
    include: {
      renter: { select: { fullName: true, avatarUrl: true } },
    },
  });
}

async function getVehicleReviews(vehicleId) {
  const reviews = await prisma.review.findMany({
    where: { vehicleId },
    include: {
      renter: { select: { fullName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return {
    averageRating: Math.round(avg * 10) / 10,
    totalReviews: reviews.length,
    reviews,
  };
}

module.exports = { createReview, getVehicleReviews };
