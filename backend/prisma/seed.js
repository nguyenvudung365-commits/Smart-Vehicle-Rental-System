require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const d = (offset, h = 10) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  dt.setHours(h, 0, 0, 0);
  return dt;
};
const ci = (seed) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`;

async function main() {
  console.log('🌱 Seeding chi tiết 3 tài khoản demo chính...\n');
  const pw = await bcrypt.hash('123456', 10);

  // ══════════════════════════════════════════════
  // XÓA SẠCH
  // ══════════════════════════════════════════════
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.pointHistory.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.vehicleFeature.deleteMany({});
  await prisma.vehicleImage.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.paymentCard.deleteMany({});
  await prisma.kyc.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.feature.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('🗑️  Đã xóa sạch\n');

  // ══════════════════════════════════════════════
  // TIỆN NGHI
  // ══════════════════════════════════════════════
  const FN = [
    { name: 'Bluetooth',         icon: 'bluetooth-outline',        category: 'entertainment' },  // 0
    { name: 'Camera lùi',        icon: 'camera-outline',           category: 'safety' },          // 1
    { name: 'Cảm biến đỗ xe',   icon: 'radio-button-on-outline',  category: 'safety' },          // 2
    { name: 'Màn hình giải trí', icon: 'desktop-outline',          category: 'entertainment' },   // 3
    { name: 'Định vị GPS',       icon: 'navigate-outline',         category: 'navigation' },      // 4
    { name: 'Ghế chỉnh điện',   icon: 'options-outline',          category: 'comfort' },         // 5
    { name: 'Cửa sổ trời',      icon: 'partly-sunny-outline',     category: 'comfort' },         // 6
    { name: 'Cổng sạc USB',     icon: 'phone-portrait-outline',   category: 'entertainment' },   // 7
    { name: 'Túi khí an toàn',  icon: 'shield-checkmark-outline', category: 'safety' },          // 8
    { name: 'Điều hòa tự động', icon: 'thermometer-outline',      category: 'comfort' },         // 9
    { name: 'Camera 360°',      icon: 'aperture-outline',         category: 'safety' },          // 10
    { name: 'Ghế sưởi',        icon: 'sunny-outline',            category: 'comfort' },         // 11
  ];
  const F = [];
  for (const f of FN) F.push(await prisma.feature.create({ data: f }));
  const fid = (idxs) => idxs.map(i => ({ featureId: F[i].id }));
  console.log(`✅ ${F.length} tiện nghi`);

  // ══════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════
  // 3 tài khoản chính
  const admin  = await prisma.user.create({ data: { phone: '0900000000', email: 'admin@mioto.vn', passwordHash: pw, fullName: 'Admin Mioto', role: 'admin', referralCode: 'ADMIN001', rewardPoints: 0 }});

  const host   = await prisma.user.create({ data: { phone: '0900000001', email: 'hung.nguyen@gmail.com', passwordHash: pw, fullName: 'Nguyễn Văn Hùng', role: 'host', referralCode: 'HUNG2024', rewardPoints: 250, birthday: new Date('1985-03-15'), referredBy: null }});

  const renter = await prisma.user.create({ data: { phone: '0900000002', email: 'lan.tran@gmail.com', passwordHash: pw, fullName: 'Trần Thị Lan', role: 'renter', referralCode: 'LAN20240', rewardPoints: 320, birthday: new Date('1995-06-10'), referredBy: 'HUNG2024' }});

  // Tài khoản phụ (để tạo xe, booking chéo)
  const host2  = await prisma.user.create({ data: { phone: '0900000003', email: 'tuan@mioto.vn', passwordHash: pw, fullName: 'Trần Minh Tuấn', role: 'host', referralCode: 'TUAN2024', rewardPoints: 80 }});
  const host3  = await prisma.user.create({ data: { phone: '0900000004', email: 'linh@mioto.vn', passwordHash: pw, fullName: 'Phạm Thị Linh', role: 'host', referralCode: 'LINH2024', rewardPoints: 60 }});
  const r2     = await prisma.user.create({ data: { phone: '0900000005', email: 'binh@gmail.com', passwordHash: pw, fullName: 'Lê Văn Bình', role: 'renter', referralCode: 'BINH2024', rewardPoints: 40 }});
  const r3     = await prisma.user.create({ data: { phone: '0900000006', email: 'mai@gmail.com', passwordHash: pw, fullName: 'Nguyễn Thị Mai', role: 'renter', referralCode: 'MAI20240', rewardPoints: 20 }});

  // KYC pending để admin duyệt
  const kycU1  = await prisma.user.create({ data: { phone: '0900000014', email: 'tung@gmail.com', passwordHash: pw, fullName: 'Nguyễn Minh Tùng', role: 'renter', referralCode: 'TUNG2024', rewardPoints: 0 }});
  const kycU2  = await prisma.user.create({ data: { phone: '0900000015', email: 'linhdo@gmail.com', passwordHash: pw, fullName: 'Đỗ Thị Linh', role: 'renter', referralCode: 'LINH0001', rewardPoints: 0 }});

  console.log('✅ 9 users');

  // ══════════════════════════════════════════════
  // KYC
  // ══════════════════════════════════════════════
  // renter (0900000002) — KYC approved để thuê xe
  await prisma.kyc.create({ data: {
    userId: renter.id, licenseNumber: '012345678901', fullName: 'Trần Thị Lan',
    frontImageUrl: 'https://placehold.co/800x500/059669/white?text=GPLX+Mat+Truoc',
    frontImageKey: 'kyc/renter-front.webp',
    backImageUrl:  'https://placehold.co/800x500/059669/white?text=GPLX+Mat+Sau',
    backImageKey:  'kyc/renter-back.webp',
    status: 'approved', reviewedAt: d(-30),
  }});
  // r2, r3 — cũng approved để booking
  for (const [u, name, num] of [[r2,'Lê Văn Bình',2],[r3,'Nguyễn Thị Mai',3]]) {
    await prisma.kyc.create({ data: {
      userId: u.id, licenseNumber: `09876543210${num}`, fullName: name,
      frontImageUrl: `https://placehold.co/800x500/059669/white?text=GPLX+${num}+Truoc`,
      frontImageKey: `kyc/r${num}-front.webp`,
      backImageUrl:  `https://placehold.co/800x500/059669/white?text=GPLX+${num}+Sau`,
      backImageKey:  `kyc/r${num}-back.webp`,
      status: 'approved', reviewedAt: d(-20),
    }});
  }
  // KYC pending (admin demo duyệt)
  for (const [u, name, num] of [[kycU1,'Nguyễn Minh Tùng',6],[kycU2,'Đỗ Thị Linh',7]]) {
    await prisma.kyc.create({ data: {
      userId: u.id, licenseNumber: `07654321098${num}`, fullName: name,
      frontImageUrl: `https://placehold.co/800x500/2563eb/white?text=GPLX+Pending+${num}+Truoc`,
      frontImageKey: `kyc/pending-${num}-front.webp`,
      backImageUrl:  `https://placehold.co/800x500/2563eb/white?text=GPLX+Pending+${num}+Sau`,
      backImageKey:  `kyc/pending-${num}-back.webp`,
      status: 'pending',
    }});
  }
  console.log('✅ KYC: 3 approved + 2 pending (admin demo)');

  // ══════════════════════════════════════════════
  // ĐỊA CHỈ
  // ══════════════════════════════════════════════
  // Host — nơi đặt xe
  const aH1 = await prisma.address.create({ data: { userId: host.id, label: 'Nhà riêng',    province: 'Hà Nội', district: 'Cầu Giấy',   ward: 'Dịch Vọng',  detail: '123 Xuân Thủy',      latitude: 21.0368, longitude: 105.7826, isDefault: true  }});
  const aH2 = await prisma.address.create({ data: { userId: host.id, label: 'Văn phòng',    province: 'Hà Nội', district: 'Đống Đa',    ward: 'Cát Linh',   detail: '45 Giảng Võ',        latitude: 21.0302, longitude: 105.8412, isDefault: false }});
  const aH3 = await prisma.address.create({ data: { userId: host.id, label: 'Garage xe',    province: 'Hà Nội', district: 'Hoàn Kiếm', ward: 'Hàng Bài',   detail: '10 Tràng Thi',       latitude: 21.0285, longitude: 105.8521, isDefault: false }});
  const aH4 = await prisma.address.create({ data: { userId: host.id, label: 'Bãi xe HM',   province: 'Hà Nội', district: 'Hoàng Mai',  ward: 'Tương Mai',  detail: '88 Trương Định',     latitude: 20.9977, longitude: 105.8646, isDefault: false }});

  // Host2 — HCM
  const aH2_1 = await prisma.address.create({ data: { userId: host2.id, label: 'Nhà Q7', province: 'TP. Hồ Chí Minh', district: 'Quận 7', ward: 'Tân Phú', detail: '88 Nguyễn Thị Thập', latitude: 10.7387, longitude: 106.7166, isDefault: true }});
  // Host3 — Đà Nẵng
  const aH3_1 = await prisma.address.create({ data: { userId: host3.id, label: 'Nhà ĐN', province: 'Đà Nẵng', district: 'Hải Châu', ward: 'Hải Châu 1', detail: '35 Phan Châu Trinh', latitude: 16.0606, longitude: 108.2108, isDefault: true }});

  // Renter — địa chỉ nhận giao xe (có lat/lng để tính phí giao)
  const aR1 = await prisma.address.create({ data: { userId: renter.id, label: 'Nhà tôi',    province: 'Hà Nội', district: 'Hai Bà Trưng', ward: 'Phạm Đình Hổ', detail: '15 Bạch Mai',    latitude: 21.0000, longitude: 105.8500, isDefault: true  }});
  const aR2 = await prisma.address.create({ data: { userId: renter.id, label: 'Cơ quan',    province: 'Hà Nội', district: 'Hoàn Kiếm',   ward: 'Tràng Tiền',   detail: '1 Đinh Tiên Hoàng', latitude: 21.0285, longitude: 105.8521, isDefault: false }});
  const aR3 = await prisma.address.create({ data: { userId: renter.id, label: 'Nhà bố mẹ', province: 'Hà Nội', district: 'Long Biên',    ward: 'Bồ Đề',        detail: '21 Ngọc Lâm',    latitude: 21.0441, longitude: 105.8817, isDefault: false }});
  console.log('✅ Địa chỉ: host (4) + renter (3 có lat/lng demo giao xe)');

  // ══════════════════════════════════════════════
  // THẺ THANH TOÁN
  // ══════════════════════════════════════════════
  // Renter có 2 thẻ
  await prisma.paymentCard.create({ data: { userId: renter.id, brand: 'visa',       last4: '9123', holderName: 'TRAN THI LAN', expiryMonth: 12, expiryYear: 2027, isDefault: true  }});
  await prisma.paymentCard.create({ data: { userId: renter.id, brand: 'mastercard', last4: '4567', holderName: 'TRAN THI LAN', expiryMonth: 6,  expiryYear: 2026, isDefault: false }});
  // Thẻ phụ
  await prisma.paymentCard.create({ data: { userId: r2.id, brand: 'visa', last4: '8888', holderName: 'LE VAN BINH', expiryMonth: 3, expiryYear: 2028, isDefault: true }});
  await prisma.paymentCard.create({ data: { userId: r3.id, brand: 'jcb',  last4: '3344', holderName: 'NGUYEN THI MAI', expiryMonth: 9, expiryYear: 2027, isDefault: true }});
  console.log('✅ 4 thẻ thanh toán');

  // ══════════════════════════════════════════════
  // XE — Host chính (0900000001) có 8 xe đa dạng
  // ══════════════════════════════════════════════
  async function mkVehicle({ ownerId, addressId, brand, model, year, transmission, fuelType,
    seats, plate, price, desc, fi: fiArr, fc, km, ofee, imgs, status = 'approved' }) {
    const v = await prisma.vehicle.create({ data: {
      ownerId, addressId, brand, model, year, transmission, fuelType, seats,
      licensePlate: plate, pricePerDay: price, description: desc, status,
      fuelConsumption: fc || null, kmLimitPerDay: km || null, overageFeePerKm: ofee || null,
      isAvailable: true, approvedAt: status === 'approved' ? d(-60) : null,
      features: { create: fid(fiArr || []) },
    }});
    const images = imgs || [ci(brand + model + year)];
    await prisma.vehicleImage.createMany({ data: images.map((url, i) => ({
      vehicleId: v.id, imageUrl: url, storageKey: `seed/${plate}-${i}.webp`, isCover: i === 0, displayOrder: i,
    }))});
    return v;
  }

  // ─── 8 xe của host chính (đủ loại để demo filter) ───
  const v1 = await mkVehicle({
    ownerId: host.id, addressId: aH1.id,
    brand: 'Toyota', model: 'Vios', year: 2022, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '30A-12345', price: 800000, fc: 5.5, km: 350, ofee: 3000,
    desc: 'Toyota Vios G 2022 — Sedan tiết kiệm xăng, nội đô cực êm. Ghế da mới, máy lạnh mát. Hỗ trợ giao xe trong bán kính 10km khu vực Cầu Giấy - Từ Liêm.\n\n• Xăng RON 95, mỗi lần đổ xăng đầy\n• Có thể giao nhận tại sân bay Nội Bài (phí giao thêm)\n• Cam kết xe sạch, thơm trước mỗi chuyến',
    fi: [0,1,2,7,8,9],
    imgs: [ci('toyota-vios-2022-red'), ci('toyota-vios-interior'), ci('toyota-vios-front')],
  });

  const v2 = await mkVehicle({
    ownerId: host.id, addressId: aH1.id,
    brand: 'Honda', model: 'City', year: 2023, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '30A-22345', price: 950000, fc: 6.0, km: 300, ofee: 3500,
    desc: 'Honda City RS 2023 — Bản cao cấp nhất, full option. Honda Sensing, ghế da, màn hình 9 inch, Android Auto.\n\n• Xe mới, đi dưới 15.000km\n• Bảo dưỡng đúng hạn tại Honda\n• Giao xe tận nơi trong nội thành Hà Nội',
    fi: [0,1,2,3,4,7,8,9],
    imgs: [ci('honda-city-rs-2023'), ci('honda-city-interior')],
  });

  const v3 = await mkVehicle({
    ownerId: host.id, addressId: aH2.id,
    brand: 'Mazda', model: 'CX-5', year: 2023, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '30A-32345', price: 1500000, fc: 7.2, km: 400, ofee: 4000,
    desc: 'Mazda CX-5 2.0 Premium 2023 — SUV sang trọng nhất phân khúc. Cửa sổ trời toàn cảnh, ghế da Nappa chỉnh điện, màn hình 10.25 inch.\n\n• Phù hợp gia đình hoặc công tác dài ngày\n• Hệ thống Bose 12 loa\n• i-Activsense cảnh báo va chạm, giữ làn',
    fi: [0,1,2,3,4,5,6,7,8,9],
    imgs: [ci('mazda-cx5-2023-soul'), ci('mazda-cx5-interior'), ci('mazda-cx5-panorama')],
  });

  const v4 = await mkVehicle({
    ownerId: host.id, addressId: aH2.id,
    brand: 'VinFast', model: 'VF8', year: 2024, transmission: 'automatic', fuelType: 'electric', seats: 5,
    plate: '30A-52345', price: 1900000, fc: null, km: 350, ofee: 5000,
    desc: 'VinFast VF8 Plus 2024 — SUV điện hạng sang. Đây là chiếc xe điện đầu tiên sản xuất 100% tại Việt Nam.\n\n• Pin 82kWh, đầy pin ~400km\n• ADAS: giữ làn, kiểm soát hành trình thích ứng\n• Camera 360°, màn hình 15.6" lớn nhất phân khúc\n• Trạm sạc VinFast trên toàn quốc\n• Tặng 1 lần sạc nhanh miễn phí',
    fi: [0,1,2,3,4,5,6,7,8,9,10],
    imgs: [ci('vinfast-vf8-2024-green'), ci('vinfast-vf8-interior'), ci('vinfast-vf8-charging')],
  });

  const v5 = await mkVehicle({
    ownerId: host.id, addressId: aH3.id,
    brand: 'Toyota', model: 'Camry', year: 2022, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '30B-12345', price: 2000000, fc: 7.8, km: 500, ofee: 5000,
    desc: 'Toyota Camry 2.5Q 2022 — Sedan hạng D sang trọng nhất. Xe biểu tượng cho đẳng cấp và sự thoải mái.\n\n• Ghế da Nappa thủ công, sưởi/thông gió ghế trước\n• JBL 9 loa Premium Audio\n• Màn hình 9 inch, kết nối Apple CarPlay / Android Auto\n• Thích hợp: đón tiếp đối tác, công tác, sự kiện quan trọng',
    fi: [0,1,2,3,4,5,7,8,9,11],
    imgs: [ci('toyota-camry-2022-black'), ci('toyota-camry-interior')],
  });

  const v6 = await mkVehicle({
    ownerId: host.id, addressId: aH1.id,
    brand: 'Kia', model: 'Morning', year: 2023, transmission: 'automatic', fuelType: 'gasoline', seats: 4,
    plate: '30A-42345', price: 550000, fc: 4.5, km: 200, ofee: 2000,
    desc: 'Kia Morning AT 2023 — Xe nhỏ gọn, tiết kiệm nhất cho nội đô Hà Nội.\n\n• Chỉ 4.5L/100km, tiết kiệm nhất phân khúc\n• Dễ đỗ xe phố cổ, ngõ hẹp\n• Lý tưởng cho 1-2 người đi lại hàng ngày\n• Giá tốt nhất khu vực Hoàn Kiếm',
    fi: [0,7,8,9],
    imgs: [ci('kia-morning-2023-white')],
  });

  const v7 = await mkVehicle({
    ownerId: host.id, addressId: aH4.id,
    brand: 'Ford', model: 'Ranger', year: 2022, transmission: 'automatic', fuelType: 'diesel', seats: 5,
    plate: '30A-62345', price: 1700000, fc: 8.5, km: 600, ofee: 4000,
    desc: 'Ford Ranger Wildtrak 2.0 Bi-Turbo 2022 — Bán tải mạnh mẽ nhất phân khúc. Máy dầu 210HP/500Nm.\n\n• 4x4 điện tử, vượt địa hình xuất sắc\n• Thùng xe phủ bạt + lót thùng nhựa\n• Phù hợp: chở hàng, camping, phượt núi rừng\n• Hỗ trợ giao xe khu vực Hoàng Mai, Thanh Trì',
    fi: [0,1,2,3,4,8],
    imgs: [ci('ford-ranger-wildtrak-2022'), ci('ford-ranger-cargo')],
  });

  const v8 = await mkVehicle({
    ownerId: host.id, addressId: aH1.id,
    brand: 'Toyota', model: 'Innova Cross', year: 2024, transmission: 'automatic', fuelType: 'hybrid', seats: 7,
    plate: '30B-22345', price: 1800000, fc: 5.8, km: 500, ofee: 4000,
    desc: 'Toyota Innova Cross HEV 2024 — MPV 7 chỗ hybrid thế hệ mới. Êm ái, tiết kiệm nhiên liệu vượt trội.\n\n• Hybrid tự sạc, không cần cắm điện\n• 5.8L/100km — tiết kiệm nhất phân khúc MPV 7 chỗ\n• Hàng ghế 2 chỉnh điện, ghế 3 gập phẳng\n• Cửa sổ trời toàn cảnh panoramic\n• Lý tưởng: gia đình 7 người đi xa, an toàn',
    fi: [0,1,2,3,4,5,6,7,8,9,10],
    imgs: [ci('innova-cross-hybrid-2024'), ci('innova-cross-interior'), ci('innova-cross-7seats')],
  });

  // ─── Xe của host2 và host3 (để renter thuê chéo) ───
  const v9 = await mkVehicle({
    ownerId: host2.id, addressId: aH2_1.id,
    brand: 'Hyundai', model: 'Tucson', year: 2023, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '51A-11111', price: 1400000, fc: 7.5, km: 400, ofee: 4000,
    desc: 'Hyundai Tucson 2.0 ATH 2023. SUV hiện đại, cửa sổ trời, BLIS cảnh báo điểm mù. Giao xe Q1-Q7.',
    fi: [0,1,2,3,4,6,8,9], imgs: [ci('hyundai-tucson-2023')],
  });
  const v10 = await mkVehicle({
    ownerId: host3.id, addressId: aH3_1.id,
    brand: 'Mazda', model: 'CX-3', year: 2022, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '43A-11111', price: 1000000, fc: 6.8, km: 300, ofee: 3000,
    desc: 'Mazda CX-3 2022. Crossover nhỏ gọn lý tưởng Đà Nẵng - Hội An. Xe sạch, thơm, chủ xe thân thiện.',
    fi: [0,1,2,3,7,8,9], imgs: [ci('mazda-cx3-2022')],
  });

  // ─── 3 xe pending (admin duyệt demo) ───
  const vP1 = await mkVehicle({
    ownerId: host.id, addressId: aH1.id,
    brand: 'BMW', model: '320i', year: 2023, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '30E-99901', price: 3500000, fc: 8.0, km: 300, ofee: 8000,
    desc: 'BMW 320i Sport Line 2023. M Sport Package, ghế da Vernasca, màn hình iDrive 10.25". Đang chờ admin duyệt.',
    fi: [0,1,2,3,4,5,7,8,9,11], status: 'pending',
    imgs: [ci('bmw-320i-2023-black')],
  });
  const vP2 = await mkVehicle({
    ownerId: host2.id, addressId: aH2_1.id,
    brand: 'Mercedes', model: 'GLC 300', year: 2023, transmission: 'automatic', fuelType: 'gasoline', seats: 5,
    plate: '51G-99902', price: 4500000, fc: 9.5, km: 300, ofee: 10000,
    desc: 'Mercedes GLC 300 4MATIC 2023. Burmester 13 loa, ghế massage. Đang chờ admin duyệt.',
    fi: [0,1,2,3,4,5,6,7,8,9,10,11], status: 'pending', imgs: [ci('mercedes-glc-2023')],
  });
  const vP3 = await mkVehicle({
    ownerId: host3.id, addressId: aH3_1.id,
    brand: 'Kia', model: 'EV6', year: 2024, transmission: 'automatic', fuelType: 'electric', seats: 5,
    plate: '43C-99903', price: 2800000, fc: null, km: 400, ofee: 6000,
    desc: 'Kia EV6 GT-Line 2024. Xe điện hiệu suất cao, 0-100 chỉ 5.2s. Đang chờ admin duyệt.',
    fi: [0,1,2,3,4,5,6,7,8,9,10], status: 'pending', imgs: [ci('kia-ev6-2024')],
  });

  console.log('✅ 10 xe approved (8 của host chính) + 3 xe pending');

  // ══════════════════════════════════════════════
  // BOOKINGS — Renter chính (0900000002)
  // ══════════════════════════════════════════════
  // 5 booking với đủ trạng thái để demo mọi tình huống
  const bCompleted1 = await prisma.booking.create({ data: {
    renterId: renter.id, vehicleId: v3.id,
    startDate: d(-18,8), endDate: d(-15,20), rentalDays: 3,
    pricePerDay: 1500000, subtotal: 4500000, discountAmount: 100000, totalAmount: 4400000,
    status: 'completed', cardLast4: '9123', createdAt: d(-20),
  }});

  const bCompleted2 = await prisma.booking.create({ data: {
    renterId: renter.id, vehicleId: v9.id,
    startDate: d(-10,8), endDate: d(-8,20), rentalDays: 2,
    pricePerDay: 1400000, subtotal: 2800000, discountAmount: 0, totalAmount: 2800000,
    status: 'completed', cardLast4: '9123', createdAt: d(-12),
  }});

  const bCompleted3 = await prisma.booking.create({ data: {
    renterId: renter.id, vehicleId: v1.id,
    startDate: d(-35,8), endDate: d(-33,20), rentalDays: 2,
    pricePerDay: 800000, subtotal: 1600000, discountAmount: 80000, totalAmount: 1520000,
    status: 'completed', cardLast4: '4567', createdAt: d(-37),
  }});

  const bInProgress = await prisma.booking.create({ data: {
    renterId: renter.id, vehicleId: v5.id,
    startDate: d(-1,10), endDate: d(1,20), rentalDays: 2,
    pricePerDay: 2000000, subtotal: 4000000, discountAmount: 320000, totalAmount: 3680000,
    status: 'in_progress', cardLast4: '9123', createdAt: d(-3),
  }});

  const bConfirmed = await prisma.booking.create({ data: {
    renterId: renter.id, vehicleId: v8.id,
    startDate: d(5,8), endDate: d(8,20), rentalDays: 3,
    pricePerDay: 1800000, subtotal: 5400000, discountAmount: 0, totalAmount: 5400000,
    status: 'confirmed', cardLast4: '9123', createdAt: d(-2),
  }});

  const bCancelled = await prisma.booking.create({ data: {
    renterId: renter.id, vehicleId: v2.id,
    startDate: d(-25,8), endDate: d(-23,20), rentalDays: 2,
    pricePerDay: 950000, subtotal: 1900000, discountAmount: 0, totalAmount: 1900000,
    status: 'cancelled', cardLast4: '9123', cancelReason: 'Thay đổi kế hoạch đột xuất', createdAt: d(-27),
  }});

  // Booking của r2, r3 thuê xe của host chính (để host thấy booking đến)
  const bR2 = await prisma.booking.create({ data: {
    renterId: r2.id, vehicleId: v3.id,
    startDate: d(-6,8), endDate: d(-4,20), rentalDays: 2,
    pricePerDay: 1500000, subtotal: 3000000, discountAmount: 0, totalAmount: 3000000,
    status: 'completed', cardLast4: '8888', createdAt: d(-8),
  }});
  const bR3 = await prisma.booking.create({ data: {
    renterId: r3.id, vehicleId: v4.id,
    startDate: d(10,8), endDate: d(12,20), rentalDays: 2,
    pricePerDay: 1900000, subtotal: 3800000, discountAmount: 0, totalAmount: 3800000,
    status: 'confirmed', cardLast4: '3344', createdAt: d(-1),
  }});

  console.log('✅ 8 booking (completed×3, in_progress, confirmed, cancelled + 2 của user khác thuê xe host)');

  // ══════════════════════════════════════════════
  // ĐÁNH GIÁ — Renter viết sau completed booking
  // ══════════════════════════════════════════════
  await prisma.review.create({ data: {
    bookingId: bCompleted1.id, renterId: renter.id, vehicleId: v3.id, rating: 5,
    comment: 'Mazda CX-5 quá tuyệt! Xe êm, nội thất sang trọng, cửa sổ trời mở ra ngắm phố rất đã. Anh Hùng giao xe đúng giờ, xe sạch thơm. Chắc chắn sẽ thuê lần nữa khi về Hà Nội!',
  }});
  await prisma.review.create({ data: {
    bookingId: bCompleted2.id, renterId: renter.id, vehicleId: v9.id, rating: 4,
    comment: 'Tucson đi khá ổn, máy lạnh mát, hệ thống giải trí hiện đại. Chủ xe nhiệt tình hướng dẫn sử dụng xe. Trừ 1 sao vì hơi khó tìm chỗ đỗ theo địa chỉ nhận xe.',
  }});
  await prisma.review.create({ data: {
    bookingId: bCompleted3.id, renterId: renter.id, vehicleId: v1.id, rating: 5,
    comment: 'Vios đi nội đô quá ổn. Tiết kiệm xăng, dễ đỗ phố cổ. Anh Hùng linh hoạt giờ nhận/trả xe. 5 sao không cần suy nghĩ!',
  }});
  // r2 review xe CX-5 host
  await prisma.review.create({ data: {
    bookingId: bR2.id, renterId: r2.id, vehicleId: v3.id, rating: 5,
    comment: 'CX-5 đỉnh quá! Đi Ninh Bình 2 ngày cực thích. Xe mạnh, bám đường tốt, cabin cách âm tốt. Host rất dễ tính.',
  }});

  console.log('✅ 4 đánh giá (renter viết 3, r2 viết 1)');

  // ══════════════════════════════════════════════
  // YÊU THÍCH — Renter
  // ══════════════════════════════════════════════
  for (const vid of [v3.id, v4.id, v5.id, v8.id, v9.id]) {
    await prisma.favorite.create({ data: { userId: renter.id, vehicleId: vid } });
  }
  console.log('✅ 5 xe yêu thích (CX-5, VF8, Camry, Innova Cross, Tucson)');

  // ══════════════════════════════════════════════
  // ĐIỂM THƯỞNG — Lịch sử đầy đủ cho renter
  // ══════════════════════════════════════════════
  // Tổng phải = 320 điểm hiện tại
  await prisma.pointHistory.createMany({ data: [
    { userId: renter.id, points: 30,   type: 'referral_self',  description: 'Thưởng đăng ký qua mã giới thiệu HUNG2024',         createdAt: d(-60) },
    { userId: renter.id, points: 440,  type: 'booking_reward', description: 'Tích điểm đặt Mazda CX-5 3 ngày (4.400.000đ)',       createdAt: d(-20) },
    { userId: renter.id, points: -100, type: 'points_used',    description: 'Dùng điểm giảm 100.000đ đặt xe Toyota Vios',         createdAt: d(-37) },
    { userId: renter.id, points: 152,  type: 'booking_reward', description: 'Tích điểm đặt Toyota Vios 2 ngày (1.520.000đ)',       createdAt: d(-37) },
    { userId: renter.id, points: 280,  type: 'booking_reward', description: 'Tích điểm đặt Hyundai Tucson 2 ngày (2.800.000đ)',    createdAt: d(-12) },
    { userId: renter.id, points: -482, type: 'points_used',    description: 'Dùng điểm giảm 482.000đ đặt Toyota Camry 2 ngày',    createdAt: d(-3)  },
    // Tổng: 30+440-100+152+280-482 = 320 ✓
    // Host nhận điểm referral
    { userId: host.id, points: 50, type: 'referral_bonus', description: 'Thưởng giới thiệu Trần Thị Lan đăng ký thành công', createdAt: d(-60) },
  ]});
  console.log('✅ Lịch sử điểm (renter: 30+440-100+152+280-482 = 320pt ✓)');

  // ══════════════════════════════════════════════
  // THÔNG BÁO — Đủ loại để demo
  // ══════════════════════════════════════════════
  await prisma.notification.createMany({ data: [
    // Renter — booking notifications
    { userId: renter.id, title: '🎉 Đặt xe thành công!', body: 'Mazda CX-5 (30A-32345) xác nhận. Nhận xe ngày ' + d(-18,8).toLocaleDateString('vi-VN') + '. Mã đơn: ' + bCompleted1.id.slice(0,8).toUpperCase(), type: 'booking_confirmed', isRead: true, createdAt: d(-20) },
    { userId: renter.id, title: '🎉 Đặt xe thành công!', body: 'Toyota Vios (30A-12345) xác nhận. Nhận xe ngày ' + d(-35,8).toLocaleDateString('vi-VN'), type: 'booking_confirmed', isRead: true, createdAt: d(-37) },
    { userId: renter.id, title: '🎉 Đặt xe thành công!', body: 'Hyundai Tucson (51A-11111) xác nhận tại TP.HCM.', type: 'booking_confirmed', isRead: true, createdAt: d(-12) },
    { userId: renter.id, title: '❌ Đơn thuê đã bị hủy', body: 'Honda City (30A-22345) đã hủy thành công. Lý do: Thay đổi kế hoạch đột xuất.', type: 'booking_cancelled', isRead: true, createdAt: d(-27) },
    { userId: renter.id, title: '✅ GPLX đã được xác thực', body: 'Giấy phép lái xe của bạn đã được duyệt. Bạn có thể đặt xe ngay bây giờ!', type: 'kyc_approved', isRead: true, createdAt: d(-30) },
    { userId: renter.id, title: '🚗 Chuyến đi đang diễn ra', body: 'Toyota Camry đang trong chuyến thuê. Trả xe trước 20h ngày mai nhé! Hotline: 1900 9217', type: 'booking_confirmed', isRead: false, createdAt: d(-1) },
    { userId: renter.id, title: '📅 Nhắc lịch chuyến đi', body: 'Toyota Innova Cross sẽ nhận ngày ' + d(5,8).toLocaleDateString('vi-VN') + '. Kiểm tra thông tin nhận xe!', type: 'booking_confirmed', isRead: false, createdAt: d(-1) },
    { userId: renter.id, title: '⭐ Cảm ơn bạn đã đánh giá!', body: 'Đánh giá Mazda CX-5 5 sao của bạn đã được ghi nhận. Tích 440 điểm thưởng!', type: 'booking_confirmed', isRead: false, createdAt: d(-18) },
    // Host — xe được duyệt + có booking mới
    { userId: host.id, title: '✅ Xe đã được phê duyệt', body: 'Toyota Vios (30A-12345) đã được duyệt và hiển thị trên ứng dụng. Bắt đầu nhận booking!', type: 'vehicle_approved', isRead: true, createdAt: d(-60) },
    { userId: host.id, title: '✅ Xe đã được phê duyệt', body: 'Mazda CX-5 (30A-32345) đã được duyệt thành công.', type: 'vehicle_approved', isRead: true, createdAt: d(-58) },
    { userId: host.id, title: '✅ Xe đã được phê duyệt', body: 'Honda City (30A-22345) đã được duyệt thành công.', type: 'vehicle_approved', isRead: true, createdAt: d(-55) },
    { userId: host.id, title: '🔔 Có khách đặt xe mới', body: 'Trần Thị Lan vừa đặt Mazda CX-5 từ ' + d(-18,8).toLocaleDateString('vi-VN') + '. Kiểm tra và xác nhận!', type: 'booking_confirmed', isRead: true, createdAt: d(-20) },
    { userId: host.id, title: '🔔 Có khách đặt xe mới', body: 'Nguyễn Thị Mai vừa đặt VinFast VF8 từ ngày ' + d(10).toLocaleDateString('vi-VN') + '.', type: 'booking_confirmed', isRead: false, createdAt: d(-1) },
  ]});
  console.log('✅ 13 thông báo (renter: 8, host: 5)');

  // ══════════════════════════════════════════════
  // CONVERSATIONS + MESSAGES — Thực tế, chi tiết
  // ══════════════════════════════════════════════
  // Conv 1: Renter hỏi Host về CX-5 (đã thuê rồi, đang chat lại về chuyến tiếp)
  const conv1 = await prisma.conversation.create({ data: {
    renterId: renter.id, hostId: host.id, vehicleId: v3.id,
    lastMessage: 'Ok anh! Em sẽ giữ gìn xe cẩn thận ạ', lastAt: d(-3),
  }});
  await prisma.message.createMany({ data: [
    { conversationId: conv1.id, senderId: renter.id, text: 'Chào anh Hùng! Em là Lan, em đang muốn hỏi về CX-5 của anh. Xe còn trống tuần sau không ạ?', isRead: true, createdAt: d(-22) },
    { conversationId: conv1.id, senderId: host.id,   text: 'Chào Lan! Xe vẫn còn trống đó. Em cần từ ngày mấy?', isRead: true, createdAt: d(-22) },
    { conversationId: conv1.id, senderId: renter.id, text: 'Dạ em cần 3 ngày, từ thứ Năm đến Chủ Nhật. Xe có thể giao đến Đống Đa không anh?', isRead: true, createdAt: d(-21) },
    { conversationId: conv1.id, senderId: host.id,   text: 'Được em! Anh giao trong bán kính 10km, phí 5k/km. Đống Đa cách nhà anh khoảng 8km là 40k phí giao. Xe đổ xăng đầy trước nhé.', isRead: true, createdAt: d(-21) },
    { conversationId: conv1.id, senderId: renter.id, text: 'Ok anh! Thế xe có cần thế chấp gì không ạ? Lần đầu em thuê qua Mioto nên chưa rõ.', isRead: true, createdAt: d(-20) },
    { conversationId: conv1.id, senderId: host.id,   text: 'Không cần thế chấp gì đâu Lan ơi. Chỉ cần CCCD + GPLX bản gốc khi nhận xe là được. Đặt qua app đi, anh confirm ngay!', isRead: true, createdAt: d(-20) },
    { conversationId: conv1.id, senderId: renter.id, text: 'Em đặt rồi anh ơi! Nhận thanh toán giữ chỗ chưa ạ?', isRead: true, createdAt: d(-19) },
    { conversationId: conv1.id, senderId: host.id,   text: 'Rồi em. Anh xác nhận booking rồi. Hẹn gặp em lúc 8h sáng thứ Năm nhé! 😊', isRead: true, createdAt: d(-19) },
    { conversationId: conv1.id, senderId: renter.id, text: 'Vâng anh! À anh ơi, xe có cần để xăng về mức cũ không hay đổ đầy?', isRead: true, createdAt: d(-18) },
    { conversationId: conv1.id, senderId: host.id,   text: 'Anh nhận xe xăng đầy thì em trả về xăng đầy là được. Hoặc đổ xăng rồi khấu trừ tiền lại cũng được em ạ.', isRead: true, createdAt: d(-18) },
    { conversationId: conv1.id, senderId: renter.id, text: 'Cảm ơn anh nhiều! Xe tuyệt vời lắm, em rất hài lòng. Lần sau em sẽ thuê tiếp nha anh! 🌟', isRead: true, createdAt: d(-15) },
    { conversationId: conv1.id, senderId: host.id,   text: 'Cảm ơn Lan đã tin tưởng! Em đánh giá 5 sao cho anh với nhé, hỗ trợ anh nhiều lắm ấy. Chúc em những chuyến đi vui!', isRead: true, createdAt: d(-15) },
    { conversationId: conv1.id, senderId: renter.id, text: 'Dạ anh! Giờ em muốn thuê tiếp Toyota Camry của anh. Ngày 5 tháng tới còn trống không anh?', isRead: true, createdAt: d(-4) },
    { conversationId: conv1.id, senderId: host.id,   text: 'Camry đang trống đó em. Xe sang lắm, đi đám cưới hay gặp đối tác quá chuẩn. Em chốt ngày đi!', isRead: true, createdAt: d(-4) },
    { conversationId: conv1.id, senderId: renter.id, text: 'Ok anh! Em sẽ giữ gìn xe cẩn thận ạ', isRead: false, createdAt: d(-3) },
  ]});

  // Conv 2: r2 nhắn với host (host xem được nhiều hội thoại)
  const conv2 = await prisma.conversation.create({ data: {
    renterId: r2.id, hostId: host.id, vehicleId: v3.id,
    lastMessage: 'CX-5 đỉnh quá anh ơi! 5 sao luôn nhé 🌟', lastAt: d(-4),
  }});
  await prisma.message.createMany({ data: [
    { conversationId: conv2.id, senderId: r2.id,   text: 'Anh ơi CX-5 đi Ninh Bình được không ạ? Em muốn đặt 2 ngày.', isRead: true, createdAt: d(-9) },
    { conversationId: conv2.id, senderId: host.id, text: 'Được lắm bạn! Ninh Bình đường nhựa tốt, CX-5 đi êm ru. Khoảng 100km từ HN, xe anh xăng đầy là OK.', isRead: true, createdAt: d(-9) },
    { conversationId: conv2.id, senderId: r2.id,   text: 'Cho em hỏi giới hạn km là 400km/ngày đúng không anh? Đi và về thì ok rồi.', isRead: true, createdAt: d(-8) },
    { conversationId: conv2.id, senderId: host.id, text: 'Đúng rồi, 400km/ngày. Đi Ninh Bình thì 200km/ngày là đủ thoải mái, không lo vượt giới hạn đâu.', isRead: true, createdAt: d(-8) },
    { conversationId: conv2.id, senderId: r2.id,   text: 'CX-5 đỉnh quá anh ơi! 5 sao luôn nhé 🌟', isRead: false, createdAt: d(-4) },
  ]});

  // Conv 3: r3 nhắn với host về VF8
  const conv3 = await prisma.conversation.create({ data: {
    renterId: r3.id, hostId: host.id, vehicleId: v4.id,
    lastMessage: 'Cho hỏi trạm sạc VinFast gần Cầu Giấy có không anh?', lastAt: d(-2),
  }});
  await prisma.message.createMany({ data: [
    { conversationId: conv3.id, senderId: r3.id,   text: 'Chào anh! Em quan tâm VinFast VF8. Lần đầu đi xe điện nên hơi lo về sạc điện.', isRead: true, createdAt: d(-5) },
    { conversationId: conv3.id, senderId: host.id, text: 'Chào Mai! Không lo đâu, anh sẽ giao xe khi pin đã sạc đầy (~400km). Đi trong nội đô 2 ngày thì pin thừa sức.', isRead: true, createdAt: d(-5) },
    { conversationId: conv3.id, senderId: r3.id,   text: 'Dạ nếu cần sạc thì sạc ở đâu ạ? Em chưa biết chỗ sạc VinFast.', isRead: true, createdAt: d(-4) },
    { conversationId: conv3.id, senderId: host.id, text: 'Anh sẽ hướng dẫn app VinFast, tìm trạm sạc dễ lắm. Trong nội thành HN có 50+ trạm sạc, sạc nhanh 30 phút đầy 80%.', isRead: true, createdAt: d(-4) },
    { conversationId: conv3.id, senderId: r3.id,   text: 'Cho hỏi trạm sạc VinFast gần Cầu Giấy có không anh?', isRead: false, createdAt: d(-2) },
  ]});

  console.log('✅ 3 cuộc hội thoại với 24 tin nhắn thực tế');

  // ══════════════════════════════════════════════
  // TỔNG KẾT
  // ══════════════════════════════════════════════
  console.log('\n' + '═'.repeat(65));
  console.log('🎉  SEED HOÀN TẤT — Dữ liệu demo đầy đủ cho 3 tài khoản chính');
  console.log('═'.repeat(65));
  console.log('\n📱 3 TÀI KHOẢN DEMO CHÍNH — password: 123456\n');

  console.log('┌─ ADMIN ─────────────────────────────────────────────────┐');
  console.log('│  SĐT: 0900000000                                        │');
  console.log('│  Có thể: Duyệt/từ chối xe + KYC                        │');
  console.log('│  Xe pending chờ duyệt: BMW 320i, Mercedes GLC, Kia EV6 │');
  console.log('│  KYC pending: Nguyễn Minh Tùng, Đỗ Thị Linh            │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n┌─ CHỦ XE (HOST) ─────────────────────────────────────────┐');
  console.log('│  SĐT: 0900000001  |  Nguyễn Văn Hùng                   │');
  console.log('│  Email: hung.nguyen@gmail.com                           │');
  console.log('│  250 điểm thưởng | Ngày sinh: 15/03/1985               │');
  console.log('│  8 xe đa dạng:                                          │');
  console.log('│    • Vios 800k/ng | City 950k | CX-5 1.5M | VF8 1.9M  │');
  console.log('│    • Camry 2M | Morning 550k | Ranger 1.7M | Innova 1.8M│');
  console.log('│  3 hội thoại (với renter chính, Lê Văn Bình, Nguyễn Mai)│');
  console.log('│  5 thông báo (xe duyệt, có booking mới)                 │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n┌─ KHÁCH THUÊ (RENTER) ───────────────────────────────────┐');
  console.log('│  SĐT: 0900000002  |  Trần Thị Lan                      │');
  console.log('│  Email: lan.tran@gmail.com                              │');
  console.log('│  320 điểm thưởng | Ngày sinh: 10/06/1995               │');
  console.log('│  KYC: ✅ Đã xác thực                                    │');
  console.log('│  2 thẻ: Visa ****9123 (mặc định) + MC ****4567         │');
  console.log('│  3 địa chỉ có lat/lng (demo giao xe tính km)           │');
  console.log('│  6 booking:                                             │');
  console.log('│    • CX-5 completed ⭐5 | Tucson completed ⭐4          │');
  console.log('│    • Vios completed ⭐5  | Camry IN_PROGRESS            │');
  console.log('│    • Innova CONFIRMED   | City CANCELLED                │');
  console.log('│  5 xe yêu thích | 8 thông báo (unread×3)               │');
  console.log('│  Chat với host: 15 tin nhắn thực tế về CX-5, Camry     │');
  console.log('│  Lịch sử điểm: +30+440-100+152+280-482 = 320pt ✓       │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n📌 TÀI KHOẢN PHỤ (thuê xe để host thấy booking):');
  console.log('   0900000005 | Lê Văn Bình  — đặt CX-5 completed, đang chat với host');
  console.log('   0900000006 | Nguyễn Thị Mai — đặt VF8 confirmed, đang chat với host');
  console.log('   0900000014 | Nguyễn Minh Tùng — KYC pending');
  console.log('   0900000015 | Đỗ Thị Linh — KYC pending\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
