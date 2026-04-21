// src/controllers/booking.controller.js
// FR-07: Dat xe, FR-08: Huy, FR-09: Danh sach chuyen di
const bookingService = require('../services/booking.service');
const { ok, created, fail, asyncHandler } = require('../utils/response');

exports.create = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user.id, req.body);
  return created(res, booking, 'Dat xe thanh cong');
});

exports.listMine = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getMyBookings(req.user.id, req.query.status);
  return ok(res, bookings);
});

exports.getOne = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.id);
  if (!booking) return fail(res, 404, 'Khong tim thay don', 'NOT_FOUND');
  return ok(res, booking);
});

exports.cancel = asyncHandler(async (req, res) => {
  const updated = await bookingService.cancelBooking(
    req.params.id,
    req.user.id,
    req.body.reason
  );
  return ok(res, updated, 'Da huy don');
});
