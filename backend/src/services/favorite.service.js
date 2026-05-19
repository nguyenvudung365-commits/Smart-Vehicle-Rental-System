const prisma = require('../config/prisma');

async function toggleFavorite(userId, vehicleId) {
  const existing = await prisma.favorite.findFirst({ where: { userId, vehicleId } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { isFavorited: false };
  }
  await prisma.favorite.create({ data: { userId, vehicleId } });
  return { isFavorited: true };
}

async function getFavorites(userId) {
  return await prisma.favorite.findMany({
    where: { userId },
    include: {
      vehicle: {
        include: { images: { where: { isCover: true }, take: 1 }, address: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { toggleFavorite, getFavorites };
