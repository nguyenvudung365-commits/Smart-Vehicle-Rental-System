const prisma = require('../config/prisma');

class VehicleService {
  // FR-04, FR-05: Tìm kiếm xe với bộ lọc
  async search({
    province,
    transmission,
    fuelType,
    minPrice,
    maxPrice,
    minSeats,
    yearFrom,
    sortBy = 'created_at',
    order = 'desc',
    page = 1,
    limit = 20,
  }) {
    const skip = (page - 1) * limit;

    // Xây dựng điều kiện WHERE
    const where = {
      status: 'approved',
      isAvailable: true,
    };

    if (province) {
      where.address = { province: { contains: province, mode: 'insensitive' } };
    }
    if (transmission) where.transmission = transmission;
    if (fuelType) where.fuelType = fuelType;
    if (minSeats) where.seats = { gte: parseInt(minSeats) };
    if (yearFrom) where.year = { gte: parseInt(yearFrom) };

    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
    }

    // Sắp xếp
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
      data: vehicles.map(this._formatVehicleListItem),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // FR-06: Xem chi tiết xe
  async getById(id) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        address: true,
        images: { orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }] },
        owner: {
          select: { id: true, fullName: true, avatarUrl: true, createdAt: true },
        },
        features: {
          include: {
            feature: { select: { id: true, name: true, icon: true, category: true } },
          },
        },
      },
    });

    if (!vehicle) {
      throw new Error('Không tìm thấy xe');
    }

    if (vehicle.status !== 'approved') {
      throw new Error('Xe chưa được duyệt hoặc không khả dụng');
    }

    return this._formatVehicleDetail(vehicle);
  }

  // === Helper formatters ===
  _formatVehicleListItem(v) {
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

  _formatVehicleDetail(v) {
    return {
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      transmission: v.transmission,
      fuelType: v.fuelType,
      seats: v.seats,
      licensePlate: v.licensePlate,
      pricePerDay: v.pricePerDay,
      description: v.description,
      images: v.images.map(img => ({
        id: img.id,
        url: img.imageUrl,
        isCover: img.isCover,
      })),
      address: v.address,
      features: v.features.map(vf => vf.feature),
      owner: v.owner,
      createdAt: v.createdAt,
    };
  }
}

module.exports = new VehicleService();
