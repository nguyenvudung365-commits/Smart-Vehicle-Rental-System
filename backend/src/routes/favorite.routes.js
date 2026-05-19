const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { toggleFavorite, getFavorites } = require('../services/favorite.service');
const { success, error } = require('../utils/response');
const prisma = require('../config/prisma');

router.use(authenticate);
router.get('/', async (req, res) => {
  try { return success(res, await getFavorites(req.user.id)); }
  catch (e) { return error(res, e.message, e.status || 500); }
});
router.get('/:vehicleId/check', async (req, res) => {
  try {
    const fav = await prisma.favorite.findFirst({
      where: { userId: req.user.id, vehicleId: req.params.vehicleId },
    });
    return success(res, { isFavorited: !!fav });
  } catch (e) { return error(res, e.message, e.status || 500); }
});
router.post('/:vehicleId', async (req, res) => {
  try { return success(res, await toggleFavorite(req.user.id, req.params.vehicleId)); }
  catch (e) { return error(res, e.message, e.status || 500); }
});

module.exports = router;
