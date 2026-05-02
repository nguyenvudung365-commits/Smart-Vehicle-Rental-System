const prisma = require('../config/prisma');

async function sendExpoPush(pushToken, title, body) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body, sound: 'default' }),
    });
  } catch (e) {
    console.error('[Push] Failed:', e.message);
  }
}

async function createNotification(userId, { title, body, type }) {
  const [notification, user] = await Promise.all([
    prisma.notification.create({ data: { userId, title, body, type } }),
    prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } }),
  ]);
  if (user?.pushToken) {
    sendExpoPush(user.pushToken, title, body).catch(() => {});
  }
  return notification;
}

async function notifyMany(userIds, payload) {
  if (!userIds.length) return;
  await prisma.notification.createMany({
    data: userIds.map(userId => ({ userId, ...payload })),
  });
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, pushToken: { not: null } },
    select: { pushToken: true },
  });
  users.forEach(u => {
    if (u.pushToken) sendExpoPush(u.pushToken, payload.title, payload.body).catch(() => {});
  });
}

async function getMyNotifications(userId) {
  const list = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = list.filter(n => !n.isRead).length;
  return { list, unreadCount };
}

async function markRead(id, userId) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) {
    const err = new Error('Không tìm thấy thông báo');
    err.status = 404;
    throw err;
  }
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

module.exports = { createNotification, notifyMany, getMyNotifications, markRead, markAllRead };
