const prisma = require('../config/prisma');

// Lay hoac tao cuoc hoi thoai giua renter va host
async function getOrCreateConversation(renterId, hostId, vehicleId) {
  if (renterId === hostId) {
    const err = new Error('Không thể chat với chính mình');
    err.status = 400;
    throw err;
  }

  let conv = await prisma.conversation.findFirst({
    where: { renterId, hostId },
    include: {
      renter: { select: { id: true, fullName: true, avatarUrl: true } },
      host:   { select: { id: true, fullName: true, avatarUrl: true } },
      vehicle: { select: { id: true, brand: true, model: true } },
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { renterId, hostId, vehicleId: vehicleId || null },
      include: {
        renter: { select: { id: true, fullName: true, avatarUrl: true } },
        host:   { select: { id: true, fullName: true, avatarUrl: true } },
        vehicle: { select: { id: true, brand: true, model: true } },
      },
    });
  }
  return conv;
}

// Lay danh sach conversations cua user (la renter hoac host)
async function getMyConversations(userId) {
  return prisma.conversation.findMany({
    where: {
      OR: [{ renterId: userId }, { hostId: userId }],
    },
    include: {
      renter: { select: { id: true, fullName: true, avatarUrl: true } },
      host:   { select: { id: true, fullName: true, avatarUrl: true } },
      vehicle: { select: { id: true, brand: true, model: true } },
    },
    orderBy: { lastAt: { sort: 'desc', nulls: 'last' } },
  });
}

// Lay messages cua 1 conversation (phan trang)
async function getMessages(conversationId, userId, cursor) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || (conv.renterId !== userId && conv.hostId !== userId)) {
    const err = new Error('Không có quyền xem cuộc trò chuyện này');
    err.status = 403;
    throw err;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 50,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  // Danh dau cac tin nhan chua doc cua doi phuong la da doc
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return messages;
}

// Gui tin nhan moi
async function sendMessage(conversationId, senderId, text) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || (conv.renterId !== senderId && conv.hostId !== senderId)) {
    const err = new Error('Không có quyền gửi tin nhắn');
    err.status = 403;
    throw err;
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId, text },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: text.slice(0, 100), lastAt: new Date() },
    }),
  ]);

  return message;
}

// Dem tin nhan chua doc
async function getUnreadCount(userId) {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ renterId: userId }, { hostId: userId }] },
    select: { id: true },
  });
  const convIds = convs.map(c => c.id);
  return prisma.message.count({
    where: {
      conversationId: { in: convIds },
      senderId: { not: userId },
      isRead: false,
    },
  });
}

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
};
