// src/routes/booking.routes.js
// FR-07: Dat xe, FR-08: Huy, FR-09: Danh sach chuyen di
const router = require('express').Router();
const controller = require('../controllers/booking.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const { createBookingSchema, cancelBookingSchema } = require('../validators');

// Tat ca route booking deu can dang nhap
router.use(authenticate);

// POST /api/bookings — dat xe
router.post('/', validate(createBookingSchema), controller.create);

// GET /api/bookings — danh sach chuyen di cua toi (query: ?status=confirmed)
router.get('/', controller.listMine);

// GET /api/bookings/:id — chi tiet 1 don
router.get('/:id', controller.getOne);

// PATCH /api/bookings/:id/cancel — huy don
router.patch('/:id/cancel', validate(cancelBookingSchema), controller.cancel);

module.exports = router;
