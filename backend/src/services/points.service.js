const prisma = require('../config/prisma');

// 1 diem = 1_000 VND giam gia; 1 diem tich duoc moi 10_000 VND chi tieu
const POINT_VALUE_VND = 1000;
const POINTS_PER_10K = 1;
const MAX_DISCOUNT_RATIO = 0.3; // max 30% gia tri don

function calcEarnedPoints(totalAmountVnd) {
  return Math.floor(totalAmountVnd / 10000) * POINTS_PER_10K;
}

function calcMaxUsablePoints(totalAmountVnd) {
  const maxDiscountVnd = Math.floor(totalAmountVnd * MAX_DISCOUNT_RATIO);
  return Math.floor(maxDiscountVnd / POINT_VALUE_VND);
}

async function getPointsInfo(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rewardPoints: true },
  });
  const history = await prisma.pointHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return {
    balance: user?.rewardPoints ?? 0,
    history,
    pointValueVnd: POINT_VALUE_VND,
  };
}

async function addPoints(userId, points, type, description, tx) {
  const db = tx || prisma;
  await db.user.update({
    where: { id: userId },
    data: { rewardPoints: { increment: points } },
  });
  await db.pointHistory.create({
    data: { userId, points, type, description },
  });
}

async function spendPoints(userId, points, description, tx) {
  const db = tx || prisma;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { rewardPoints: true },
  });
  if ((user?.rewardPoints ?? 0) < points) {
    const err = new Error('Không đủ điểm thưởng');
    err.status = 400;
    throw err;
  }
  await db.user.update({
    where: { id: userId },
    data: { rewardPoints: { decrement: points } },
  });
  await db.pointHistory.create({
    data: { userId, points: -points, type: 'points_used', description },
  });
  return points * POINT_VALUE_VND;
}

module.exports = {
  calcEarnedPoints,
  calcMaxUsablePoints,
  getPointsInfo,
  addPoints,
  spendPoints,
  POINT_VALUE_VND,
};
