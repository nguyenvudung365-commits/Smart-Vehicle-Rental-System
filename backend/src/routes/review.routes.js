const express = require('express');
const { create, listByVehicle } = require('../controllers/review.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /api/reviews — tao danh gia (can dang nhap)
router.post('/', authenticate, create);

// GET /api/reviews/vehicle/:vehicleId — lay danh gia cua xe (public)
router.get('/vehicle/:vehicleId', listByVehicle);

module.exports = router;
