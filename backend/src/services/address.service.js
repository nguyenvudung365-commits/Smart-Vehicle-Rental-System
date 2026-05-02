const prisma = require('../config/prisma');

async function getMyAddresses(userId) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

async function createAddress(userId, data) {
  const { province, district, ward, detail, label, latitude, longitude, isDefault } = data;

  // Nếu đặt làm mặc định thì bỏ mặc định cũ
  if (isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  return prisma.address.create({
    data: { userId, province, district, ward, detail, label, latitude, longitude, isDefault: !!isDefault },
  });
}

async function updateAddress(id, userId, data) {
  const addr = await prisma.address.findFirst({ where: { id, userId } });
  if (!addr) { const err = new Error('Không tìm thấy địa chỉ'); err.status = 404; throw err; }

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  return prisma.address.update({ where: { id }, data });
}

async function deleteAddress(id, userId) {
  const addr = await prisma.address.findFirst({ where: { id, userId } });
  if (!addr) { const err = new Error('Không tìm thấy địa chỉ'); err.status = 404; throw err; }

  // Không xóa nếu đang gắn với xe
  const vehicleCount = await prisma.vehicle.count({ where: { addressId: id } });
  if (vehicleCount > 0) {
    const err = new Error('Địa chỉ đang được dùng cho xe, không thể xóa'); err.status = 400; throw err;
  }

  await prisma.address.delete({ where: { id } });
  return { id };
}

async function setDefault(id, userId) {
  const addr = await prisma.address.findFirst({ where: { id, userId } });
  if (!addr) { const err = new Error('Không tìm thấy địa chỉ'); err.status = 404; throw err; }

  await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  return prisma.address.update({ where: { id }, data: { isDefault: true } });
}

module.exports = { getMyAddresses, createAddress, updateAddress, deleteAddress, setDefault };
