// Script tạo data mẫu để demo: 1 user mẫu + 5 xe đã duyệt với ảnh thật
// Chạy: node prisma/seed.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  // Tạo 1 host mẫu
  const passwordHash = await bcrypt.hash('123456', 10);
  const host = await prisma.user.upsert({
    where: { phone: '0900000001' },
    update: {},
    create: {
      phone: '0900000001',
      email: 'host@mioto.demo',
      passwordHash,
      fullName: 'Nguyễn Văn Host',
      role: 'host',
    },
  });
  console.log('Created host:', host.fullName);

  // Tạo địa chỉ
  const address = await prisma.address.create({
    data: {
      userId: host.id,
      label: 'Showroom',
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng',
      detail: '123 Xuân Thủy',
      latitude: 21.0368,
      longitude: 105.7826,
      isDefault: true,
    },
  });

  // Lấy 3 features đầu để gán cho xe
  const features = await prisma.feature.findMany({ take: 3 });

  // Tạo 5 xe mẫu với ảnh thật từ Unsplash (free, không cần auth)
  const sampleVehicles = [
    {
      brand: 'Toyota', model: 'Vios', year: 2022,
      transmission: 'automatic', fuelType: 'gasoline', seats: 5,
      plate: '30A-12345', price: 800000,
      images: [
        'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
        'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800',
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
      ]
    },
    {
      brand: 'Honda', model: 'City', year: 2023,
      transmission: 'automatic', fuelType: 'gasoline', seats: 5,
      plate: '30A-22345', price: 900000,
      images: [
        'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
        'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800',
      ]
    },
    {
      brand: 'Mazda', model: 'CX-5', year: 2021,
      transmission: 'automatic', fuelType: 'gasoline', seats: 5,
      plate: '30A-32345', price: 1500000,
      images: [
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
      ]
    },
    {
      brand: 'Kia', model: 'Morning', year: 2020,
      transmission: 'manual', fuelType: 'gasoline', seats: 4,
      plate: '30A-42345', price: 600000,
      images: [
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
        'https://images.unsplash.com/photo-1493238792000-8113da705763?w=800',
        'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800',
      ]
    },
    {
      brand: 'Vinfast', model: 'VF8', year: 2024,
      transmission: 'automatic', fuelType: 'electric', seats: 5,
      plate: '30A-52345', price: 2000000,
      images: [
        'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800',
        'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
        'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800',
      ]
    },
  ];

  for (const v of sampleVehicles) {
    const vehicle = await prisma.vehicle.create({
      data: {
        ownerId: host.id,
        addressId: address.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        transmission: v.transmission,
        fuelType: v.fuelType,
        seats: v.seats,
        licensePlate: v.plate,
        pricePerDay: v.price,
        description: `${v.brand} ${v.model} ${v.year} - xe đẹp, tiết kiệm nhiên liệu, nội thất sang trọng, đầy đủ tiện nghi hiện đại. Đã được bảo dưỡng định kỳ và vệ sinh sạch sẽ trước mỗi chuyến thuê.`,
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    // Tạo ảnh: ảnh đầu là ảnh bìa (is_cover: true)
    for (let i = 0; i < v.images.length; i++) {
      await prisma.vehicleImage.create({
        data: {
          vehicleId: vehicle.id,
          imageUrl: v.images[i],
          isCover: i === 0,
          displayOrder: i,
        },
      });
    }

    // Gán features
    for (const f of features) {
      await prisma.vehicleFeature.create({
        data: { vehicleId: vehicle.id, featureId: f.id },
      });
    }

    console.log(`  Created vehicle: ${v.brand} ${v.model} (${v.images.length} ảnh)`);
  }

  console.log('\nSeed done! Test login:');
  console.log('  phone: 0900000001');
  console.log('  password: 123456');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
