const prisma = require('../config/prisma');

async function getOrCreateConversation(userId, vehicleId) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) { const err = new Error('Không tìm thấy xe'); err.status = 404; throw err; }

  const existing = await prisma.conversation.findFirst({
    where: {
      OR: [
        { renterId: userId, hostId: vehicle.ownerId },
        { renterId: vehicle.ownerId, hostId: userId },
      ],
    },
  });
  if (existing) return existing;

  return await prisma.conversation.create({
    data: { vehicleId, renterId: userId, hostId: vehicle.ownerId },
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
