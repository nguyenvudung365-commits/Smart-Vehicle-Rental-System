const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { getPointsInfo } = require('../services/points.service');
const { success } = require('../utils/response');

const router = express.Router();

// GET /api/points — số dư và lịch sử điểm thưởng
router.get('/', authenticate, async (req, res, next) => {
  try {
    const data = await getPointsInfo(req.user.id);
    success(res, data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
