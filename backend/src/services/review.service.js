const prisma = require('../config/prisma');

async function createReview(renterId, { bookingId, rating, comment }) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, renterId, status: 'completed' },
  });
  if (!booking) {
    const err = new Error('Không thể đánh giá đơn này'); err.status = 400; throw err;
  }
  const existing = await prisma.review.findFirst({ where: { bookingId } });
  if (existing) {
    const err = new Error('Ban da danh gia chuyen di nay'); err.status = 400; throw err;
  }
  return await prisma.review.create({
    data: { bookingId, renterId, vehicleId: booking.vehicleId, rating, comment },
    include: { renter: { select: { id: true, fullName: true, avatarUrl: true } } },
  });
}

async function getVehicleReviews(vehicleId) {
  const reviews = await prisma.review.findMany({
    where: { vehicleId },
    include: { renter: { select: { id: true, fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  return { average: Math.round(avg * 10) / 10, total: reviews.length, reviews };
}

module.exports = { createReview, getVehicleReviews };
