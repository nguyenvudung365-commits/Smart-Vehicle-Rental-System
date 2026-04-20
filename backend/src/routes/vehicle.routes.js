// src/routes/vehicle.routes.js
// Buoi 5: CRUD xe (host) + search/detail (public)
const router = require('express').Router();
const controller = require('../controllers/vehicle.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const { uploadMultiple } = require('../middlewares/upload');
const { createVehicleSchema, updateVehicleSchema } = require('../validators');

// ===== Public =====
router.get('/search', controller.search);
router.get('/features', controller.listFeatures);

// ===== Host-only CRUD (dat truoc route /:id de /mine khong bi bat la id) =====
router.get('/mine', authenticate, requireRole('host', 'admin'), controller.listMyVehicles);

router.post(
  '/',
  authenticate,
  requireRole('host', 'admin'),
  validate(createVehicleSchema),
  controller.create
);

router.put(
  '/:id',
  authenticate,
  requireRole('host', 'admin'),
  validate(updateVehicleSchema),
  controller.update
);

router.delete('/:id', authenticate, requireRole('host', 'admin'), controller.remove);

router.patch(
  '/:id/availability',
  authenticate,
  requireRole('host', 'admin'),
  controller.toggleAvailability
);

router.post(
  '/:id/submit',
  authenticate,
  requireRole('host', 'admin'),
  controller.submitForReview
);

// ===== Anh xe =====
router.post(
  '/:id/images',
  authenticate,
  requireRole('host', 'admin'),
  uploadMultiple('images', 10),
  controller.uploadImages
);

router.delete(
  '/:id/images/:imageId',
  authenticate,
  requireRole('host', 'admin'),
  controller.deleteImage
);

// ===== Public - xem chi tiet (dat cuoi) =====
router.get('/:id', controller.getOne);

module.exports = router;
