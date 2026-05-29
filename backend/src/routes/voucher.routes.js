const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { checkVoucher } = require('../services/voucher.service');
const { success, error } = require('../utils/response');

router.use(authenticate);

// GET /api/vouchers — danh sach voucher con hieu luc cho user xem
router.get('/', async (req, res) => {
  try {
    const { listVouchers } = require('../services/voucher.service');
    const all = await listVouchers();
    const now = new Date();
    const available = all.filter(v =>
      v.isActive &&
      (!v.expiresAt || v.expiresAt > now) &&
      (v.usageLimit === null || v.usedCount < v.usageLimit)
    ).map(v => ({
      id: v.id, code: v.code,
      discountType: v.discountType,
      discountValue: Number(v.discountValue),
      maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : null,
      minOrderValue: Number(v.minOrderValue),
      usageLimit: v.usageLimit,
      usedCount: v.usedCount,
      expiresAt: v.expiresAt,
    }));
    return success(res, available);
  } catch (e) { return error(res, e.message, 500); }
});

// Khách kiểm tra voucher trước khi đặt xe
// GET /api/vouchers/check?code=SUMMER20&amount=500000
router.get('/check', async (req, res) => {
  try {
    const { code, amount } = req.query;
    if (!code) return error(res, 'Thiếu mã voucher', 400);
    const orderAmount = Number(amount) || 0;
    const result = await checkVoucher(code, orderAmount);
    return success(res, {
      id: result.voucher.id,
      code: result.voucher.code,
      discountType: result.voucher.discountType,
      discountValue: Number(result.voucher.discountValue),
      maxDiscount: result.voucher.maxDiscount ? Number(result.voucher.maxDiscount) : null,
      minOrderValue: Number(result.voucher.minOrderValue),
      usageLimit: result.voucher.usageLimit,
      usedCount: result.voucher.usedCount,
      expiresAt: result.voucher.expiresAt,
      discountAmount: result.discountAmount,
    });
  } catch (e) {
    return error(res, e.message, e.status || 400);
  }
});

module.exports = router;
