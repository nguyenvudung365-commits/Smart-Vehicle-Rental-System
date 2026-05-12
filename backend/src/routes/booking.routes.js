// src/routes/booking.routes.js
// FR-07: Dat xe, FR-08: Huy, FR-09: Danh sach chuyen di
const router = require('express').Router();
const controller = require('../controllers/booking.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const { createBookingSchema, cancelBookingSchema } = require('../validators');
const { uploadSingle } = require('../middlewares/upload');

// Tat ca route booking deu can dang nhap
router.use(authenticate);

// POST /api/bookings — dat xe
router.post('/', validate(createBookingSchema), controller.create);

// GET /api/bookings — danh sach chuyen di cua toi (query: ?status=confirmed)
router.get('/', controller.listMine);

// GET /api/bookings/host — don thue xe cua host (xe do host so huu)
router.get('/host', controller.listHost);

// GET /api/bookings/host/stats — thong ke host
router.get('/host/stats', controller.hostStats);

// GET /api/bookings/:id — chi tiet 1 don
router.get('/:id', controller.getOne);

// PATCH /api/bookings/:id/confirm-payment — xác nhận OTP thanh toán
router.patch('/:id/confirm-payment', controller.confirmPayment);

// PATCH /api/bookings/:id/cancel — huy don
router.patch('/:id/cancel', validate(cancelBookingSchema), controller.cancel);

// PATCH /api/bookings/:id/status — cap nhat trang thai
router.patch('/:id/status', controller.updateStatus);

// PATCH /api/bookings/:id/host-confirm — host xac nhan don
router.patch('/:id/host-confirm', controller.hostConfirm);

// PATCH /api/bookings/:id/host-reject — host tu choi don
router.patch('/:id/host-reject', controller.hostReject);

// Luong ban giao xe 4 buoc (anh khong bat buoc)
router.patch('/:id/host-handover',   uploadSingle('image'), controller.hostHandover);
router.patch('/:id/renter-received', uploadSingle('image'), controller.renterReceived);
router.patch('/:id/renter-return',   uploadSingle('image'), controller.renterReturn);
router.patch('/:id/host-received',   uploadSingle('image'), controller.hostReceived);

module.exports = router;
