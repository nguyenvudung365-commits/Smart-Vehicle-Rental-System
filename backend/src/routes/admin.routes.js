const express = require('express');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const { success } = require('../utils/response');
const {
  getPendingVehicles, adminApproveVehicle, adminRejectVehicle,
} = require('../services/vehicle.service');
const { getPendingKycs, adminApproveKyc, adminRejectKyc } = require('../services/kyc.service');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// ===== VEHICLES =====
// GET /api/admin/vehicles/pending
router.get('/vehicles/pending', async (req, res, next) => {
  try {
    const vehicles = await getPendingVehicles();
    success(res, vehicles);
  } catch (err) { next(err); }
});

// PATCH /api/admin/vehicles/:id/approve
router.patch('/vehicles/:id/approve', async (req, res, next) => {
  try {
    const vehicle = await adminApproveVehicle(req.params.id);
    success(res, vehicle, 'Đã duyệt xe');
  } catch (err) { next(err); }
});

// PATCH /api/admin/vehicles/:id/reject
router.patch('/vehicles/:id/reject', async (req, res, next) => {
  try {
    const vehicle = await adminRejectVehicle(req.params.id, req.body.reason);
    success(res, vehicle, 'Đã từ chối xe');
  } catch (err) { next(err); }
});

// ===== KYC =====
// GET /api/admin/kyc/pending
router.get('/kyc/pending', async (req, res, next) => {
  try {
    const kycs = await getPendingKycs();
    success(res, kycs);
  } catch (err) { next(err); }
});

// PATCH /api/admin/kyc/:userId/approve
router.patch('/kyc/:userId/approve', async (req, res, next) => {
  try {
    const kyc = await adminApproveKyc(req.params.userId);
    success(res, kyc, 'Đã duyệt KYC');
  } catch (err) { next(err); }
});

// PATCH /api/admin/kyc/:userId/reject
router.patch('/kyc/:userId/reject', async (req, res, next) => {
  try {
    const kyc = await adminRejectKyc(req.params.userId, req.body.reason);
    success(res, kyc, 'Đã từ chối KYC');
  } catch (err) { next(err); }
});

module.exports = router;
