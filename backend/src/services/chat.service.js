const prisma = require('../config/prisma');

async function getMessages(conversationId, userId) {
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ renterId: userId }, { hostId: userId }],
      // Chỉ cho phép xem nếu user là 1 trong 2 người trong cuộc hội thoại
    },
    include: {
      renter: { select: { id: true, isActive: true, fullName: true } },
      host:   { select: { id: true, isActive: true, fullName: true } },
    },
  });
  if (!conv) { const err = new Error('Không có quyền truy cập'); err.status = 403; throw err; }

  // Xác định "người kia" là renter hay host dựa vào userId hiện tại
  const otherId = conv.renterId === userId ? conv.hostId : conv.renterId;
  const otherUser = conv.renter.id === otherId ? conv.renter : conv.host;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Trả kèm otherIsActive để mobile hiển thị banner cảnh báo và khóa ô nhập
  return { messages, otherIsActive: otherUser?.isActive ?? true };
}

async function sendMessage(conversationId, senderId, content) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ renterId: senderId }, { hostId: senderId }] },
    include: {
      renter: { select: { id: true, isActive: true } },
      host:   { select: { id: true, isActive: true } },
    },
  });
  if (!conv) { const err = new Error('Không có quyền truy cập'); err.status = 403; throw err; }

  const otherId = conv.renterId === senderId ? conv.hostId : conv.renterId;
  const otherUser = conv.renter.id === otherId ? conv.renter : conv.host;

  // Chặn gửi tin từ phía server — dù mobile không kiểm tra, API vẫn từ chối
  if (!otherUser?.isActive) {
    const err = new Error('Tài khoản người dùng này đã bị vô hiệu hóa');
    err.status = 403;
    throw err;
  }

  const message = await prisma.message.create({
    data: { conversationId, senderId, text: content },
    include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
  });

  // Cập nhật tin nhắn cuối để hiển thị preview trong danh sách hội thoại
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: content, lastAt: new Date() },
  });
  return message;
}

module.exports = { getMessages, sendMessage };
