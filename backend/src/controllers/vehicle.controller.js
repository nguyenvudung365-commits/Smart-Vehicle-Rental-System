// src/controllers/vehicle.controller.js
// Buoi 5: CRUD xe + search/detail
const vehicleService = require('../services/vehicle.service');
const { ok, created, fail, asyncHandler, success } = require('../utils/response');

// POST /api/vehicles — tao xe moi (host)
exports.create = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.user.id, req.body);
  return created(res, vehicle, 'Tao xe thanh cong');
});

// GET /api/vehicles/mine — danh sach xe cua host
exports.listMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleService.getVehiclesByHost(req.user.id);
  return ok(res, vehicles);
});

// GET /api/vehicles/:id — chi tiet 1 xe
exports.getOne = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  if (!vehicle) return fail(res, 404, 'Khong tim thay xe', 'NOT_FOUND');
  return ok(res, vehicle);
});

// PUT /api/vehicles/:id — cap nhat xe (host)
exports.update = asyncHandler(async (req, res) => {
  const updated = await vehicleService.updateVehicle(
    req.params.id,
    req.user.id,
    req.body
  );
  return ok(res, updated, 'Cap nhat xe thanh cong');
});

// DELETE /api/vehicles/:id — xoa xe (host)
exports.remove = asyncHandler(async (req, res) => {
  const result = await vehicleService.deleteVehicle(req.params.id, req.user.id);
  return ok(res, result, 'Xoa xe thanh cong');
});

// PATCH /api/vehicles/:id/availability — bat/tat hien thi
exports.toggleAvailability = asyncHandler(async (req, res) => {
  const updated = await vehicleService.toggleAvailability(req.params.id, req.user.id);
  return ok(res, updated, updated.isAvailable ? 'Da hien thi xe' : 'Da an xe');
});

// POST /api/vehicles/:id/submit — gui xe di duyet
exports.submitForReview = asyncHandler(async (req, res) => {
  const updated = await vehicleService.submitForReview(req.params.id, req.user.id);
  return ok(res, updated, 'Da gui xe di duyet');
});

// POST /api/vehicles/:id/images — upload anh xe
exports.uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return fail(res, 400, 'Khong co file anh', 'NO_FILE');
  }
  const images = await vehicleService.addVehicleImages(
    req.params.id,
    req.user.id,
    req.files
  );
  return created(res, images, `Da tai ${images.length} anh`);
});

// DELETE /api/vehicles/:id/images/:imageId — xoa 1 anh
exports.deleteImage = asyncHandler(async (req, res) => {
  const result = await vehicleService.deleteVehicleImage(
    req.params.id,
    req.params.imageId,
    req.user.id
  );
  return ok(res, result, 'Da xoa anh');
});

// GET /api/vehicles/search — tim kiem xe (public, giu tu buoi 4)
exports.search = asyncHandler(async (req, res) => {
  const result = await vehicleService.search({
    ...req.query,
    page: parseInt(req.query.page) || 1,
    limit: Math.min(parseInt(req.query.limit) || 20, 50),
  });
  return success(res, result);
});

// GET /api/vehicles/features — danh sach tinh nang de hien thi filter
exports.listFeatures = asyncHandler(async (req, res) => {
  const features = await vehicleService.getAllFeatures();
  return ok(res, features);
});
