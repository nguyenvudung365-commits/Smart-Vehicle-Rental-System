const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { getMyAddresses, createAddress, updateAddress, deleteAddress, setDefault } = require('../services/address.service');
const { success } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try { success(res, await getMyAddresses(req.user.id)); } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try { success(res, await createAddress(req.user.id, req.body), 'Thêm địa chỉ thành công', 201); } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try { success(res, await updateAddress(req.params.id, req.user.id, req.body)); } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try { success(res, await deleteAddress(req.params.id, req.user.id)); } catch (e) { next(e); }
});

router.patch('/:id/default', async (req, res, next) => {
  try { success(res, await setDefault(req.params.id, req.user.id)); } catch (e) { next(e); }
});

module.exports = router;
