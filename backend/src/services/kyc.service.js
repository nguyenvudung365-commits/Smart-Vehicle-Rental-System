// src/services/kyc.service.js
// FR-03: Xac thuc GPLX.
// Upload 2 anh (mat truoc + mat sau) -> luu vao MinIO (folder kyc/)
// -> tao record KYC status = pending -> cho admin duyet.
const prisma = require('../config/prisma');
const { uploadImage, deleteImages } = require('./storage.service');

async function submitKyc(userId, data, files) {
  // files: { frontImage: [...], backImage: [...] } tu multer.fields
  const front = files?.frontImage?.[0];
  const back = files?.backImage?.[0];
  if (!front || !back) {
    const err = new Error('Can cung cap anh mat truoc va mat sau GPLX');
    err.status = 400;
    throw err;
  }

  const existing = await prisma.kyc.findUnique({ where: { userId } });
  if (existing && existing.status === 'pending') {
    const err = new Error('Ban da gui ho so, dang cho duyet');
    err.status = 400;
    throw err;
  }
  if (existing && existing.status === 'approved') {
    const err = new Error('GPLX cua ban da duoc xac thuc');
    err.status = 400;
    throw err;
  }

  // Upload 2 anh song song
  const [frontResult, backResult] = await Promise.all([
    uploadImage(front.buffer, 'kyc'),
    uploadImage(back.buffer, 'kyc'),
  ]);

  const kycData = {
    licenseNumber: data.licenseNumber,
    fullName: data.fullName,
    dob: data.dob ? new Date(data.dob) : null,
    frontImageUrl: frontResult.url,
    frontImageKey: frontResult.storageKey,
    backImageUrl: backResult.url,
    backImageKey: backResult.storageKey,
    status: 'approved',
    rejectReason: null,
    submittedAt: new Date(),
    reviewedAt: new Date(),
  };

  // Neu lan truoc bi reject -> xoa anh cu roi update
  if (existing) {
    deleteImages([existing.frontImageKey, existing.backImageKey]).catch(() => {});
    return await prisma.kyc.update({
      where: { userId },
      data: kycData,
    });
  }

  return await prisma.kyc.create({
    data: { ...kycData, userId },
  });
}

async function getMyKyc(userId) {
  return await prisma.kyc.findUnique({ where: { userId } });
}

// ========== ADMIN ==========
async function getPendingKycs() {
  return prisma.kyc.findMany({
    where: { status: 'pending' },
    include: { user: { select: { id: true, fullName: true, phone: true } } },
    orderBy: { submittedAt: 'asc' },
  });
}

async function adminApproveKyc(userId) {
  const { createNotification } = require('./notification.service');
  const updated = await prisma.kyc.update({
    where: { userId },
    data: { status: 'approved', reviewedAt: new Date(), rejectReason: null },
  });
  createNotification(userId, {
    title: 'GPLX đã được xác minh!',
    body: 'Giấy phép lái xe của bạn đã được xác minh thành công. Bạn có thể đặt xe ngay bây giờ.',
    type: 'kyc_approved',
  }).catch(() => {});
  return updated;
}

async function adminRejectKyc(userId, reason) {
  const { createNotification } = require('./notification.service');
  const updated = await prisma.kyc.update({
    where: { userId },
    data: { status: 'rejected', reviewedAt: new Date(), rejectReason: reason || 'Thông tin không hợp lệ' },
  });
  createNotification(userId, {
    title: 'GPLX bị từ chối',
    body: `Giấy phép lái xe bị từ chối: ${reason || 'Thông tin không hợp lệ. Vui lòng gửi lại.'}`,
    type: 'kyc_rejected',
  }).catch(() => {});
  return updated;
}

module.exports = { submitKyc, getMyKyc, getPendingKycs, adminApproveKyc, adminRejectKyc };
