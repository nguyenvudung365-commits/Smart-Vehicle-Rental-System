const prisma = require('../config/prisma');

async function getOrCreateConversation(userId, hostId, vehicleId) {
  const existing = await prisma.conversation.findFirst({
    where: {
      OR: [
        { renterId: userId, hostId },
        { renterId: hostId, hostId: userId },
      ],
    },
  });
  if (existing) return existing;

  return await prisma.conversation.create({
    data: { renterId: userId, hostId, vehicleId: vehicleId || null },
  });
}

async function getMyConversations(userId) {
  return await prisma.conversation.findMany({
    where: { OR: [{ renterId: userId }, { hostId: userId }] },
    include: {
      vehicle: { select: { id: true, brand: true, model: true } },
      renter: { select: { id: true, fullName: true, avatarUrl: true } },
      host: { select: { id: true, fullName: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastAt: 'desc' },
  });
}

module.exports = { getOrCreateConversation, getMyConversations };
