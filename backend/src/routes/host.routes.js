// Routes dành riêng cho host: đánh giá khách, chặn khách, lịch xe
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
const { createNotification } = require('../services/notification.service');

router.use(authenticate);

// ===== ĐÁNH GIÁ KHÁCH (HostReview) =====

// Host đánh giá khách sau khi hoàn thành chuyến
// POST /api/host/reviews  { bookingId, rating, comment }
router.post('/reviews', async (req, res) => {
  try {
    const hostId = req.user.id;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) return error(res, 'Thiếu bookingId hoặc rating', 400);
    if (rating < 1 || rating > 5) return error(res, 'Rating phải từ 1-5', 400);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, vehicle: { ownerId: hostId }, status: 'completed' },
      include: { vehicle: true },
    });
    if (!booking) return error(res, 'Không tìm thấy đơn đã hoàn thành', 404);

    const existing = await prisma.hostReview.findUnique({ where: { bookingId } });
    if (existing) return error(res, 'Bạn đã đánh giá khách này rồi', 400);

    const review = await prisma.hostReview.create({
      data: { bookingId, hostId, renterId: booking.renterId, rating, comment: comment || null },
    });

    createNotification(booking.renterId, {
      title: 'Bạn nhận được đánh giá',
      body: `Chủ xe đã đánh giá bạn ${rating}/5 sao cho chuyến thuê vừa rồi.`,
      type: 'review_received',
    }).catch(() => {});

    return success(res, review, 'Đã gửi đánh giá');
  } catch (e) { return error(res, e.message, 500); }
});

// Lấy danh sách đánh giá một renter nhận được (host xem trước khi duyệt)
// GET /api/host/renter-reviews/:renterId
router.get('/renter-reviews/:renterId', async (req, res) => {
  try {
    const reviews = await prisma.hostReview.findMany({
      where: { renterId: req.params.renterId },
      include: { host: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const avg = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;
    return success(res, { reviews, avgRating: avg ? Math.round(avg * 10) / 10 : null });
  } catch (e) { return error(res, e.message, 500); }
});

// ===== CHẶN KHÁCH (BlockedRenter) =====

// Lấy danh sách khách bị chặn
// GET /api/host/blocked
router.get('/blocked', async (req, res) => {
  try {
    const list = await prisma.blockedRenter.findMany({
      where: { hostId: req.user.id },
      include: { renter: { select: { id: true, fullName: true, avatarUrl: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, list);
  } catch (e) { return error(res, e.message, 500); }
});

// Chặn một khách
// POST /api/host/blocked  { renterId, reason }
router.post('/blocked', async (req, res) => {
  try {
    const hostId = req.user.id;
    const { renterId, reason } = req.body;
    if (!renterId) return error(res, 'Thiếu renterId', 400);
    if (renterId === hostId) return error(res, 'Không thể chặn chính mình', 400);

    const blocked = await prisma.blockedRenter.upsert({
      where: { hostId_renterId: { hostId, renterId } },
      create: { hostId, renterId, reason: reason || null },
      update: { reason: reason || null },
    });
    return success(res, blocked, 'Đã chặn khách thuê');
  } catch (e) { return error(res, e.message, 500); }
});

// Bỏ chặn
// DELETE /api/host/blocked/:renterId
router.delete('/blocked/:renterId', async (req, res) => {
  try {
    const hostId = req.user.id;
    await prisma.blockedRenter.delete({
      where: { hostId_renterId: { hostId, renterId: req.params.renterId } },
    });
    return success(res, null, 'Đã bỏ chặn');
  } catch (e) { return error(res, e.message, 500); }
});

// ===== LỊCH XE (Calendar) =====

// Lịch đặt xe của host theo tháng
// GET /api/host/calendar?year=2026&month=5
router.get('/calendar', async (req, res) => {
  try {
    const hostId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const bookings = await prisma.booking.findMany({
      where: {
        vehicle: { ownerId: hostId },
        status: { notIn: ['cancelled'] },
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { startDate: { lte: startOfMonth }, endDate: { gte: endOfMonth } },
        ],
      },
      include: {
        vehicle: { select: { id: true, brand: true, model: true, licensePlate: true } },
        renter: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return success(res, bookings);
  } catch (e) { return error(res, e.message, 500); }
});

// Lịch của một xe cụ thể theo tháng
// GET /api/host/vehicle-calendar/:vehicleId?year=&month=
router.get('/vehicle-calendar/:vehicleId', async (req, res) => {
  try {
    const hostId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.vehicleId, ownerId: hostId },
    });
    if (!vehicle) return error(res, 'Không tìm thấy xe', 404);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const bookings = await prisma.booking.findMany({
      where: {
        vehicleId: req.params.vehicleId,
        status: { notIn: ['cancelled'] },
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { startDate: { lte: startOfMonth }, endDate: { gte: endOfMonth } },
        ],
      },
      include: { renter: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { startDate: 'asc' },
    });

    return success(res, { vehicle, bookings });
  } catch (e) { return error(res, e.message, 500); }
});

module.exports = router;
