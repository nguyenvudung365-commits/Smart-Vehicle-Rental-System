// src/controllers/booking.controller.js
// FR-07: Dat xe, FR-08: Huy, FR-09: Danh sach chuyen di
const bookingService = require('../services/booking.service');
const { ok, created, fail, asyncHandler } = require('../utils/response');

exports.create = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user.id, req.body);
  return created(res, booking, 'Đặt xe thành công, kiểm tra thông báo để lấy OTP');
});

exports.confirmPayment = asyncHandler(async (req, res) => {
  const result = await bookingService.confirmPayment(req.params.id, req.user.id, req.body.otp);
  return ok(res, result, 'Xác nhận thanh toán thành công');
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

exports.updateStatus = asyncHandler(async (req, res) => {
  const updated = await bookingService.updateBookingStatus(
    req.params.id,
    req.user.id,
    req.body.status
  );
  return ok(res, updated, 'Cap nhat trang thai thanh cong');
});

exports.listHost = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getHostBookings(req.user.id, req.query.status);
  return ok(res, bookings);
});

exports.hostConfirm = asyncHandler(async (req, res) => {
  const updated = await bookingService.hostConfirmBooking(req.params.id, req.user.id);
  return ok(res, updated, 'Đã xác nhận đơn thuê');
});

exports.hostReject = asyncHandler(async (req, res) => {
  const updated = await bookingService.hostRejectBooking(req.params.id, req.user.id, req.body.reason);
  return ok(res, updated, 'Đã từ chối đơn thuê');
});

exports.hostStats = asyncHandler(async (req, res) => {
  const stats = await bookingService.getHostStats(req.user.id);
  return ok(res, stats);
});

// Lấy URL ảnh từ file upload (nếu có)
async function getImageUrl(file) {
  if (!file) return null;
  const { uploadImage } = require('../services/storage.service');
  const result = await uploadImage(file.buffer, 'booking', Date.now().toString());
  return result.url;
}

exports.hostHandover = asyncHandler(async (req, res) => {
  const imageUrl = await getImageUrl(req.file);
  const updated = await bookingService.hostHandover(req.params.id, req.user.id, imageUrl);
  return ok(res, updated, 'Đã bàn giao xe cho khách');
});

exports.renterReceived = asyncHandler(async (req, res) => {
  const imageUrl = await getImageUrl(req.file);
  const updated = await bookingService.renterConfirmReceived(req.params.id, req.user.id, imageUrl);
  return ok(res, updated, 'Đã xác nhận nhận xe');
});

exports.renterReturn = asyncHandler(async (req, res) => {
  const imageUrl = await getImageUrl(req.file);
  const updated = await bookingService.renterReturnVehicle(req.params.id, req.user.id, imageUrl);
  return ok(res, updated, 'Đã trả xe');
});

exports.hostReceived = asyncHandler(async (req, res) => {
  const imageUrl = await getImageUrl(req.file);
  const updated = await bookingService.hostConfirmReturn(req.params.id, req.user.id, imageUrl);
  return ok(res, updated, 'Chuyến đi hoàn thành');
});
