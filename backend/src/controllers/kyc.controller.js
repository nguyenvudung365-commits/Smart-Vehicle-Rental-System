// src/controllers/kyc.controller.js
// FR-03: Xac thuc GPLX
const kycService = require('../services/kyc.service');
const { ok, created, asyncHandler } = require('../utils/response');

exports.submit = asyncHandler(async (req, res) => {
  const kyc = await kycService.submitKyc(req.user.id, req.body, req.files);
  return created(res, kyc, 'Da gui ho so KYC');
});

exports.getMine = asyncHandler(async (req, res) => {
  const kyc = await kycService.getMyKyc(req.user.id);
  return ok(res, kyc);
});
