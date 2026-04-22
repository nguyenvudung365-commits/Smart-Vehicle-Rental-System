// src/routes/kyc.routes.js
// FR-03: Xac thuc GPLX
const router = require('express').Router();
const controller = require('../controllers/kyc.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadFields } = require('../middlewares/upload');

// Tat ca route kyc deu can dang nhap
router.use(authenticate);

// POST /api/kyc — gui ho so KYC (upload 2 anh GPLX mat truoc + mat sau)
router.post(
  '/',
  uploadFields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
  ]),
  controller.submit
);

// GET /api/kyc — xem trang thai KYC cua toi
router.get('/', controller.getMine);

module.exports = router;
