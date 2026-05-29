const prisma = require('../config/prisma');

async function createVoucher(data) {
  return prisma.voucher.create({
    data: {
      code: data.code.toUpperCase().trim(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscount: data.maxDiscount || null,
      minOrderValue: data.minOrderValue || 0,
      usageLimit: data.usageLimit || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: true,
    },
  });
}

async function listVouchers() {
  return prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
}

async function toggleVoucher(id, isActive) {
  return prisma.voucher.update({ where: { id }, data: { isActive } });
}

// Kiểm tra voucher hợp lệ và tính số tiền giảm
async function checkVoucher(code, orderAmount) {
  const voucher = await prisma.voucher.findUnique({ where: { code: code.toUpperCase().trim() } });

  if (!voucher || !voucher.isActive) {
    const err = new Error('Mã voucher không tồn tại hoặc đã hết hiệu lực');
    err.status = 400; throw err;
  }
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    const err = new Error('Mã voucher đã hết hạn');
    err.status = 400; throw err;
  }
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    const err = new Error('Mã voucher đã hết lượt sử dụng');
    err.status = 400; throw err;
  }
  if (Number(voucher.minOrderValue) > 0 && orderAmount < Number(voucher.minOrderValue)) {
    const err = new Error(`Đơn hàng tối thiểu ${Number(voucher.minOrderValue).toLocaleString('vi-VN')}đ để dùng voucher này`);
    err.status = 400; throw err;
  }

  let discountAmount;
  if (voucher.discountType === 'percent') {
    discountAmount = Math.floor(orderAmount * Number(voucher.discountValue) / 100);
    if (voucher.maxDiscount) {
      discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
    }
  } else {
    discountAmount = Math.min(Number(voucher.discountValue), orderAmount);
  }

  return { voucher, discountAmount };
}

// Dùng trong transaction khi tạo booking: tăng usedCount
async function applyVoucherTx(tx, voucherId) {
  await tx.voucher.update({
    where: { id: voucherId },
    data: { usedCount: { increment: 1 } },
  });
}

module.exports = { createVoucher, listVouchers, toggleVoucher, checkVoucher, applyVoucherTx };
