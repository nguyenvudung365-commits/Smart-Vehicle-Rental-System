// src/routes/kyc.routes.js
// FR-03: Xac thuc GPLX
const router = require('express').Router();
const controller = require('../controllers/kyc.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadFields } = require('../middlewares/upload');

// Tat ca route kyc deu can dang nhap
router.use(authenticate);

// POST /api/kyc — gửi hồ sơ KYC: GPLX (bắt buộc) + CCCD (tùy chọn)
router.post(
  '/',
  uploadFields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'cccdFront', maxCount: 1 },
    { name: 'cccdBack', maxCount: 1 },
  ]),
  controller.submit
);

// GET /api/kyc — xem trang thai KYC cua toi
router.get('/', controller.getMine);

module.exports = router;
