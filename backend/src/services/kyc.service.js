// src/services/kyc.service.js
// FR-03: Xac thuc GPLX + CCCD.
// Upload anh -> luu vao MinIO (folder kyc/) -> tao record KYC status = pending -> cho admin duyet.
const prisma = require('../config/prisma');
const { uploadImage, deleteImages } = require('./storage.service');

// files: { frontImage, backImage, cccdFront, cccdBack } tu multer.fields
async function submitKyc(userId, data, files) {
  const front = files?.frontImage?.[0];
  const back = files?.backImage?.[0];
  if (!front || !back) {
    const err = new Error('Cần cung cấp ảnh mặt trước và mặt sau GPLX');
    err.status = 400;
    throw err;
  }

  const existing = await prisma.kyc.findUnique({ where: { userId } });
  if (existing && existing.status === 'pending') {
    const err = new Error('Bạn đã gửi hồ sơ, đang chờ duyệt');
    err.status = 400;
    throw err;
  }
  if (existing && existing.status === 'approved') {
    const err = new Error('GPLX của bạn đã được xác thực');
    err.status = 400;
    throw err;
  }

  // Upload GPLX 2 mặt song song
  const uploadTasks = [
    uploadImage(front.buffer, 'kyc'),
    uploadImage(back.buffer, 'kyc'),
  ];

  // Upload CCCD nếu có
  const cccdFront = files?.cccdFront?.[0];
  const cccdBack = files?.cccdBack?.[0];
  if (cccdFront) uploadTasks.push(uploadImage(cccdFront.buffer, 'kyc'));
  if (cccdBack) uploadTasks.push(uploadImage(cccdBack.buffer, 'kyc'));

  const results = await Promise.all(uploadTasks);
  const [frontResult, backResult] = results;
  const cccdFrontResult = cccdFront ? results[2] : null;
  const cccdBackResult = cccdBack ? results[cccdFront ? 3 : 2] : null;

  const kycData = {
    licenseNumber: data.licenseNumber,
    fullName: data.fullName,
    dob: data.dob ? new Date(data.dob) : null,
    frontImageUrl: frontResult.url,
    frontImageKey: frontResult.storageKey,
    backImageUrl: backResult.url,
    backImageKey: backResult.storageKey,
    status: 'pending',
    rejectReason: null,
    submittedAt: new Date(),
    reviewedAt: null,
    // CCCD
    cccdNumber: data.cccdNumber || null,
    cccdFrontImageUrl: cccdFrontResult?.url || null,
    cccdFrontImageKey: cccdFrontResult?.storageKey || null,
    cccdBackImageUrl: cccdBackResult?.url || null,
    cccdBackImageKey: cccdBackResult?.storageKey || null,
  };

  // Nếu lần trước bị reject -> xóa ảnh cũ rồi update
  if (existing) {
    const keysToDelete = [
      existing.frontImageKey, existing.backImageKey,
      existing.cccdFrontImageKey, existing.cccdBackImageKey,
    ].filter(Boolean);
    deleteImages(keysToDelete).catch(() => {});
    return await prisma.kyc.update({ where: { userId }, data: kycData });
  }

  return await prisma.kyc.create({ data: { ...kycData, userId } });
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
    title: 'Xác thực thành công!',
    body: 'Hồ sơ GPLX/CCCD của bạn đã được xác minh. Bạn có thể đặt xe ngay bây giờ.',
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
    title: 'Hồ sơ bị từ chối',
    body: `Hồ sơ xác thực bị từ chối: ${reason || 'Thông tin không hợp lệ. Vui lòng gửi lại.'}`,
    type: 'kyc_rejected',
  }).catch(() => {});
  return updated;
}

module.exports = { submitKyc, getMyKyc, getPendingKycs, adminApproveKyc, adminRejectKyc };
