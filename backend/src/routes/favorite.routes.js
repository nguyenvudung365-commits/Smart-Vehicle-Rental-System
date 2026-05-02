const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { toggleFavorite, getMyFavorites, checkFavorite } = require('../services/favorite.service');
const { success } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try { success(res, await getMyFavorites(req.user.id)); } catch (e) { next(e); }
});

router.get('/:vehicleId/check', async (req, res, next) => {
  try { success(res, await checkFavorite(req.user.id, req.params.vehicleId)); } catch (e) { next(e); }
});

router.post('/:vehicleId', async (req, res, next) => {
  try { success(res, await toggleFavorite(req.user.id, req.params.vehicleId)); } catch (e) { next(e); }
});

module.exports = router;
