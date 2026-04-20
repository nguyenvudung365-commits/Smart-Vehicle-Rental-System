// src/services/vehicle.service.js
// CRUD xe cho host (FR-19, FR-20) + search/detail tu buoi 4 (FR-04, FR-05, FR-06)
const prisma = require('../config/prisma');
const { uploadImage, deleteImages } = require('./storage.service');

// ========== CREATE (buoi 5) ==========
/**
 * Host tao xe moi o trang thai `draft`.
 * Anh upload sau qua endpoint rieng (wizard 4 buoc).
 */
async function createVehicle(ownerId, data) {
  const { province, district, ward, detail, latitude, longitude, featureIds, ...vehicleData } = data;

  return await prisma.$transaction(async (tx) => {
    // Tao address truoc (co the co toa do GPS)
    const address = await tx.address.create({
      data: {
        userId: ownerId, province, district, ward: ward || '', detail,
        ...(latitude != null && { latitude }),
        ...(longitude != null && { longitude }),
      },
    });

    // Tao vehicle gan addressId
    const vehicle = await tx.vehicle.create({
      data: {
        ...vehicleData,
        ownerId,
        addressId: address.id,
        status: 'draft',
      },
      include: { images: true, address: true },
    });

    // Tao cac lien ket tinh nang
    if (featureIds?.length) {
      await tx.vehicleFeature.createMany({
        data: featureIds.map(id => ({ vehicleId: vehicle.id, featureId: id })),
        skipDuplicates: true,
      });
    }

    return vehicle;
  });
}

// ========== READ — danh sach xe cua host ==========
async function getVehiclesByHost(ownerId) {
  return await prisma.vehicle.findMany({
    where: { ownerId },
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      address: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ========== READ — chi tiet 1 xe (buoi 5, dung cho ca public va host) ==========
async function getVehicleById(id) {
  return await prisma.vehicle.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }] },
      address: true,
      features: {
        include: {
          feature: { select: { id: true, name: true, icon: true, category: true } },
        },
      },
      owner: { select: { id: true, fullName: true, avatarUrl: true, createdAt: true } },
    },
  });
}

// ========== UPDATE ==========
async function updateVehicle(vehicleId, ownerId, data) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId },
    include: { address: true },
  });
  if (!vehicle) {
    const err = new Error('Khong tim thay xe hoac ban khong phai chu xe');
    err.status = 404;
    throw err;
  }

  const { province, district, ward, detail, latitude, longitude, featureIds, ...vehicleFields } = data;

  return await prisma.$transaction(async (tx) => {
    // Update address neu co bat ky field dia chi nao
    const hasAddressChange = province || district || ward !== undefined || detail !== undefined
      || latitude !== undefined || longitude !== undefined;
    if (hasAddressChange && vehicle.addressId) {
      await tx.address.update({
        where: { id: vehicle.addressId },
        data: {
          ...(province && { province }),
          ...(district && { district }),
          ...(ward !== undefined && { ward }),
          ...(detail !== undefined && { detail }),
          ...(latitude != null && { latitude }),
          ...(longitude != null && { longitude }),
        },
      });
    }

    // Cap nhat tinh nang neu duoc cung cap
    if (featureIds !== undefined) {
      await tx.vehicleFeature.deleteMany({ where: { vehicleId } });
      if (featureIds.length > 0) {
        await tx.vehicleFeature.createMany({
          data: featureIds.map(id => ({ vehicleId, featureId: id })),
          skipDuplicates: true,
        });
      }
    }

    // Update vehicle
    const updated = await tx.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...vehicleFields,
        // Neu xe da approved, update xong ve lai pending cho duyet
        ...(vehicle.status === 'approved' && Object.keys(vehicleFields).length > 0
          ? { status: 'pending' }
          : {}),
      },
      include: { images: true, address: true },
    });

    return updated;
  });
}

// ========== TOGGLE hien thi ==========
async function toggleAvailability(vehicleId, ownerId) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId },
  });
  if (!vehicle) {
    const err = new Error('Khong tim thay xe');
    err.status = 404;
    throw err;
  }
  if (vehicle.status !== 'approved') {
    const err = new Error('Chi xe da duyet moi bat/tat hien thi duoc');
    err.status = 400;
    throw err;
  }

  return await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { isAvailable: !vehicle.isAvailable },
  });
}

// ========== GUI DUYET ==========
async function submitForReview(vehicleId, ownerId) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId },
    include: { images: true },
  });
  if (!vehicle) {
    const err = new Error('Khong tim thay xe');
    err.status = 404;
    throw err;
  }
  if (vehicle.images.length < 1) {
    const err = new Error('Can tai len it nhat 1 anh xe truoc khi gui duyet');
    err.status = 400;
    throw err;
  }
  if (!['draft', 'rejected'].includes(vehicle.status)) {
    const err = new Error('Chi xe o trang thai nhap/bi tu choi moi gui duyet duoc');
    err.status = 400;
    throw err;
  }

  return await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: 'pending', rejectReason: null },
  });
}

// ========== DELETE ==========
async function deleteVehicle(vehicleId, ownerId) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId },
    include: { images: true },
  });
  if (!vehicle) {
    const err = new Error('Khong tim thay xe');
    err.status = 404;
    throw err;
  }

  // Kiem tra co booking dang active khong
  const activeBookings = await prisma.booking.count({
    where: {
      vehicleId,
      status: { in: ['pending_payment', 'confirmed', 'in_progress'] },
    },
  });
  if (activeBookings > 0) {
    const err = new Error('Xe dang co don thue, khong the xoa');
    err.status = 400;
    throw err;
  }

  // Xoa record DB (onDelete: Cascade se xoa vehicle_images)
  await prisma.vehicle.delete({ where: { id: vehicleId } });

  // Xoa file anh tren MinIO (fire-and-forget)
  const keys = vehicle.images.map(img => img.storageKey).filter(Boolean);
  deleteImages(keys).catch(err => console.error('[delete vehicle] cleanup', err));

  return { id: vehicleId };
}

// ========== IMAGES ==========
async function addVehicleImages(vehicleId, ownerId, files) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId },
    include: { images: true },
  });
  if (!vehicle) {
    const err = new Error('Khong tim thay xe');
    err.status = 404;
    throw err;
  }

  const existingCount = vehicle.images.length;
  const uploadResults = await Promise.all(
    files.map(f => uploadImage(f.buffer, 'vehicle', vehicleId))
  );

  const images = await prisma.$transaction(
    uploadResults.map((r, idx) =>
      prisma.vehicleImage.create({
        data: {
          vehicleId,
          imageUrl: r.url,
          storageKey: r.storageKey,
          displayOrder: existingCount + idx,
          isCover: existingCount === 0 && idx === 0, // anh dau tien lam cover
        },
      })
    )
  );

  return images;
}

async function deleteVehicleImage(vehicleId, imageId, ownerId) {
  const image = await prisma.vehicleImage.findFirst({
    where: {
      id: imageId,
      vehicleId,
      vehicle: { ownerId },
    },
  });
  if (!image) {
    const err = new Error('Khong tim thay anh');
    err.status = 404;
    throw err;
  }

  await prisma.vehicleImage.delete({ where: { id: imageId } });
  deleteImages([image.storageKey]).catch(() => {});
  return { id: imageId };
}

// ========== SEARCH (giu tu buoi 4, ho tro nhieu filter) ==========
async function search({
  province,
  transmission,
  fuelType,
  minPrice,
  maxPrice,
  minSeats,
  maxSeats,
  yearFrom,
  yearTo,
  brand,
  featureIds,       // mang string UUID, loc theo tinh nang
  minKmLimit,       // gioi han km/ngay toi thieu
  maxFuelConsumption, // tieu hao nhien lieu toi da (L/100km)
  maxOverageFee,    // phi vuot km toi da (VND/km)
  sortBy = 'created_at',
  order = 'desc',
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit;

  // Xay dung dieu kien WHERE
  const where = {
    status: 'approved',
    isAvailable: true,
  };

  if (province) {
    where.address = { province: { contains: province, mode: 'insensitive' } };
  }
  if (transmission) where.transmission = transmission;
  if (fuelType) where.fuelType = fuelType;

  // So cho: khoang min-max
  if (minSeats || maxSeats) {
    where.seats = {};
    if (minSeats) where.seats.gte = parseInt(minSeats);
    if (maxSeats) where.seats.lte = parseInt(maxSeats);
  }

  // Nam san xuat: khoang from-to
  if (yearFrom || yearTo) {
    where.year = {};
    if (yearFrom) where.year.gte = parseInt(yearFrom);
    if (yearTo) where.year.lte = parseInt(yearTo);
  }

  // Gia thue: khoang min-max
  if (minPrice || maxPrice) {
    where.pricePerDay = {};
    if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
    if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
  }

  // Hang xe: tim kiem khong phan biet hoa thuong
  if (brand) {
    where.brand = { contains: brand, mode: 'insensitive' };
  }

  // Tinh nang: xe phai co TAT CA tinh nang duoc chon
  if (featureIds && featureIds.length > 0) {
    const ids = Array.isArray(featureIds) ? featureIds : [featureIds];
    where.features = {
      some: { featureId: { in: ids } },
    };
  }

  // Tieu hao nhien lieu toi da (chi ap dung khi xe co khai bao fuelConsumption)
  if (maxFuelConsumption) {
    where.fuelConsumption = { lte: parseFloat(maxFuelConsumption) };
  }

  // Gioi han km/ngay: chap nhan xe khong gioi han (null) hoac co limit >= yeu cau
  if (minKmLimit) {
    where.AND = [
      ...(where.AND || []),
      { OR: [{ kmLimitPerDay: null }, { kmLimitPerDay: { gte: parseInt(minKmLimit) } }] },
    ];
  }

  // Phi vuot km toi da: chap nhan xe khong khai bao (null) hoac fee <= muc toi da
  if (maxOverageFee) {
    where.AND = [
      ...(where.AND || []),
      { OR: [{ overageFeePerKm: null }, { overageFeePerKm: { lte: parseFloat(maxOverageFee) } }] },
    ];
  }

  // Sap xep
  const orderBy = {};
  if (sortBy === 'price') orderBy.pricePerDay = order;
  else if (sortBy === 'year') orderBy.year = order;
  else orderBy.createdAt = order;

  // Query song song count + data
  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        address: {
          select: { province: true, district: true, ward: true },
        },
        images: {
          where: { isCover: true },
          take: 1,
          select: { imageUrl: true },
        },
        owner: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    }),
  ]);

  return {
    data: vehicles.map(formatVehicleListItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ========== FEATURES — danh sach tinh nang cho filter ==========
async function getAllFeatures() {
  return await prisma.feature.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, icon: true, category: true },
  });
}

// === Helper formatters ===
function formatVehicleListItem(v) {
  return {
    id: v.id,
    brand: v.brand,
    model: v.model,
    year: v.year,
    transmission: v.transmission,
    fuelType: v.fuelType,
    seats: v.seats,
    pricePerDay: v.pricePerDay,
    coverImage: v.images[0]?.imageUrl || null,
    location: v.address ? `${v.address.district}, ${v.address.province}` : null,
    owner: v.owner,
  };
}

// ========== ADMIN ==========
async function getPendingVehicles() {
  return prisma.vehicle.findMany({
    where: { status: 'pending' },
    include: {
      owner: { select: { id: true, fullName: true, phone: true } },
      images: { where: { isCover: true }, take: 1 },
      address: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function adminApproveVehicle(vehicleId) {
  const { createNotification } = require('./notification.service');
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    const err = new Error('Không tìm thấy xe'); err.status = 404; throw err;
  }
  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: 'approved', approvedAt: new Date(), rejectReason: null },
  });
  createNotification(vehicle.ownerId, {
    title: 'Xe đã được duyệt!',
    body: `Xe ${vehicle.brand} ${vehicle.model} của bạn đã được phê duyệt và hiển thị trên ứng dụng.`,
    type: 'vehicle_approved',
  }).catch(() => {});
  return updated;
}

async function adminRejectVehicle(vehicleId, reason) {
  const { createNotification } = require('./notification.service');
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    const err = new Error('Không tìm thấy xe'); err.status = 404; throw err;
  }
  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: 'rejected', rejectReason: reason || 'Không đáp ứng tiêu chí' },
  });
  createNotification(vehicle.ownerId, {
    title: 'Xe bị từ chối duyệt',
    body: `Xe ${vehicle.brand} ${vehicle.model}: ${reason || 'Không đáp ứng tiêu chí. Vui lòng chỉnh sửa và gửi lại.'}`,
    type: 'vehicle_rejected',
  }).catch(() => {});
  return updated;
}

module.exports = {
  createVehicle,
  getVehiclesByHost,
  getVehicleById,
  updateVehicle,
  toggleAvailability,
  submitForReview,
  getAllFeatures,
  deleteVehicle,
  addVehicleImages,
  deleteVehicleImage,
  search,
  getPendingVehicles,
  adminApproveVehicle,
  adminRejectVehicle,
};
