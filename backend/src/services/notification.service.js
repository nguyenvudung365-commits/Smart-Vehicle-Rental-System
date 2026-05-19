const prisma = require('../config/prisma');

async function createNotification(userId, { title, body, type }) {
  return await prisma.notification.create({
    data: { userId, title, body, type },
  });
}

async function getNotifications(userId) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

async function markAsRead(notificationId, userId) {
  const notif = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notif) {
    const err = new Error('Không tìm thấy thông báo'); err.status = 404; throw err;
  }
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

async function markAllAsRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

module.exports = { createNotification, getNotifications, markAsRead, markAllAsRead };
