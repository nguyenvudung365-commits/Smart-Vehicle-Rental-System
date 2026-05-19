// src/routes/vehicle.routes.js
const router = require('express').Router();
const controller = require('../controllers/vehicle.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const { uploadMultiple } = require('../middlewares/upload');
const { createVehicleSchema, updateVehicleSchema } = require('../validators');

// ===== Public =====
router.get('/search', controller.search);
router.get('/features', controller.listFeatures);

// GET /mine — tất cả user đã đăng nhập đều gọi được (renter → empty, host → danh sách xe)
router.get('/mine', authenticate, controller.listMyVehicles);

// POST / — mọi user đã đăng nhập (renter sẽ được tự động nâng cấp lên host)
router.post('/', authenticate, validate(createVehicleSchema), controller.create);

// Các route quản lý xe — chỉ cần authenticate, service tự kiểm tra ownerId
router.put('/:id', authenticate, validate(updateVehicleSchema), controller.update);
router.delete('/:id', authenticate, controller.remove);
router.patch('/:id/availability', authenticate, controller.toggleAvailability);
router.post('/:id/submit', authenticate, controller.submitForReview);

// Ảnh xe
router.post('/:id/images', authenticate, uploadMultiple('images', 10), controller.uploadImages);
router.delete('/:id/images/:imageId', authenticate, controller.deleteImage);

// ===== Public — ngay da dat cua 1 xe (de frontend hien thi lich) =====
router.get('/:id/booked-dates', controller.getBookedDates);

// ===== Public — xem chi tiết (đặt cuối để không bị bắt nhầm route trên) =====
router.get('/:id', controller.getOne);

module.exports = router;
