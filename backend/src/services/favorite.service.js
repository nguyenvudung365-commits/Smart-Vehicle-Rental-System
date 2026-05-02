const prisma = require('../config/prisma');

// Toggle yêu thích: nếu đã có thì xóa, chưa có thì thêm
async function toggleFavorite(userId, vehicleId) {
  const existing = await prisma.favorite.findUnique({
    where: { userId_vehicleId: { userId, vehicleId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { isFavorited: false };
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    const err = new Error('Không tìm thấy xe'); err.status = 404; throw err;
  }

  await prisma.favorite.create({ data: { userId, vehicleId } });
  return { isFavorited: true };
}

// Danh sách xe yêu thích của user
async function getMyFavorites(userId) {
  const favs = await prisma.favorite.findMany({
    where: { userId },
    include: {
      vehicle: {
        include: {
          images: { where: { isCover: true }, take: 1 },
          address: { select: { province: true, district: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return favs.map(f => ({
    favoriteId: f.id,
    ...f.vehicle,
    coverImage: f.vehicle.images[0]?.imageUrl || null,
    location: f.vehicle.address
      ? `${f.vehicle.address.district}, ${f.vehicle.address.province}` : null,
  }));
}

// Kiểm tra 1 xe có được yêu thích không
async function checkFavorite(userId, vehicleId) {
  const fav = await prisma.favorite.findUnique({
    where: { userId_vehicleId: { userId, vehicleId } },
  });
  return { isFavorited: !!fav };
}

module.exports = { toggleFavorite, getMyFavorites, checkFavorite };
