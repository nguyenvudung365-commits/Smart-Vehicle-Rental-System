const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
const { createVoucher, listVouchers, toggleVoucher } = require('../services/voucher.service');

router.use(authenticate);

router.get('/kyc', async (req, res) => {
  try {
    const list = await prisma.kyc.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    return success(res, list);
  } catch (e) { return error(res, e.message, 500); }
});

router.patch('/kyc/:id', async (req, res) => {
  try {
    const { status, rejectReason } = req.body;
    const updated = await prisma.kyc.update({
      where: { id: req.params.id },
      data: { status, ...(rejectReason ? { rejectReason } : {}), reviewedAt: new Date() },
    });
    return success(res, updated);
  } catch (e) { return error(res, e.message, 500); }
});

router.get('/vehicles', async (req, res) => {
  try {
    const list = await prisma.vehicle.findMany({
      where: { status: 'pending' },
      include: {
        owner: { select: { id: true, fullName: true, phone: true, email: true } },
        address: true,
        images: { orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }] },
        features: { include: { feature: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return success(res, list);
  } catch (e) { return error(res, e.message, 500); }
});

router.patch('/vehicles/:id', async (req, res) => {
  try {
    const { status, rejectReason } = req.body;
    const updated = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { status, ...(rejectReason ? { rejectReason } : {}), ...(status === 'approved' ? { approvedAt: new Date() } : {}) },
    });
    return success(res, updated);
  } catch (e) { return error(res, e.message, 500); }
});

// Thong ke tong quan he thong
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalUsers, activeUsers, hosts, renters, admins,
      totalVehicles, approvedVehicles, pendingVehicles,
      totalBookings, completedBookings, pendingBookings,
      pendingKyc,
      revenueTotal, revenueThisMonth, revenueLastMonth,
      newUsersThisMonth, newBookingsThisMonth,
      recentBookings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'host', isActive: true } }),
      prisma.user.count({ where: { role: 'renter', isActive: true } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'approved' } }),
      prisma.vehicle.count({ where: { status: 'pending' } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'completed' } }),
      prisma.booking.count({ where: { status: 'pending_payment' } }),
      prisma.kyc.count({ where: { status: 'pending' } }),
      prisma.booking.aggregate({ where: { status: 'completed' }, _sum: { totalAmount: true } }),
      prisma.booking.aggregate({ where: { status: 'completed', createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true } }),
      prisma.booking.aggregate({ where: { status: 'completed', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { totalAmount: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          vehicle: { select: { brand: true, model: true } },
          renter: { select: { fullName: true } },
        },
      }),
    ]);

    return success(res, {
      users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers, hosts, renters, admins, newThisMonth: newUsersThisMonth },
      vehicles: { total: totalVehicles, approved: approvedVehicles, pending: pendingVehicles },
      bookings: { total: totalBookings, completed: completedBookings, pending: pendingBookings, newThisMonth: newBookingsThisMonth },
      revenue: {
        total: Number(revenueTotal._sum.totalAmount || 0),
        thisMonth: Number(revenueThisMonth._sum.totalAmount || 0),
        lastMonth: Number(revenueLastMonth._sum.totalAmount || 0),
      },
      pendingKyc,
      recentBookings,
    });
  } catch (e) { return error(res, e.message, 500); }
});

// Danh sách yêu cầu xóa tài khoản
router.get('/delete-requests', async (req, res) => {
  try {
    const list = await prisma.user.findMany({
      where: {
        deleteRequestedAt: { not: null },
        isActive: true,
      },
      select: {
        id: true, fullName: true, phone: true, email: true,
        role: true, deleteRequestedAt: true, createdAt: true,
      },
      orderBy: { deleteRequestedAt: 'asc' },
    });
    return success(res, list);
  } catch (e) { return error(res, e.message, 500); }
});

// Xác nhận xóa tài khoản — xóa hoàn toàn khỏi DB theo đúng thứ tự FK
router.patch('/delete-requests/:id/confirm', async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.$transaction(async (tx) => {
      // Lấy danh sách xe của user (cần để xóa booking/review của xe đó)
      const vehicles = await tx.vehicle.findMany({ where: { ownerId: id }, select: { id: true } });
      const vehicleIds = vehicles.map(v => v.id);

      // Xóa HostReview liên quan (hostId hoặc renterId là user này)
      await tx.hostReview.deleteMany({ where: { OR: [{ hostId: id }, { renterId: id }] } });

      // Xóa Review: cả review do user viết và review cho xe của user
      const reviewWhere = vehicleIds.length
        ? { OR: [{ renterId: id }, { vehicleId: { in: vehicleIds } }] }
        : { renterId: id };
      await tx.review.deleteMany({ where: reviewWhere });

      // Xóa Booking: cả booking user đặt và booking cho xe của user
      const bookingWhere = vehicleIds.length
        ? { OR: [{ renterId: id }, { vehicleId: { in: vehicleIds } }] }
        : { renterId: id };
      await tx.booking.deleteMany({ where: bookingWhere });

      // Xóa BlockedRenter liên quan
      await tx.blockedRenter.deleteMany({ where: { OR: [{ hostId: id }, { renterId: id }] } });

      // Xóa Conversation (Message cascade theo Conversation)
      await tx.conversation.deleteMany({ where: { OR: [{ renterId: id }, { hostId: id }] } });

      // Xóa Message còn sót (senderId = user, trong conversation khác)
      await tx.message.deleteMany({ where: { senderId: id } });

      // Xóa Vehicle (VehicleImage, VehicleFeature, Favorite cascade)
      await tx.vehicle.deleteMany({ where: { ownerId: id } });

      // Xóa User — Kyc, Address, Favorite, PaymentCard, Notification, PointHistory cascade tự động
      await tx.user.delete({ where: { id } });
    });
    return success(res, null, 'Đã xóa tài khoản thành công');
  } catch (e) { return error(res, e.message, 500); }
});

// Từ chối yêu cầu xóa (xóa cờ deleteRequestedAt)
router.patch('/delete-requests/:id/reject', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { deleteRequestedAt: null },
    });
    return success(res, null, 'Đã từ chối yêu cầu xóa');
  } catch (e) { return error(res, e.message, 500); }
});

// ===== QUẢN LÝ USER =====

// Danh sách users, hỗ trợ lọc theo role, isActive, tìm kiếm
// GET /api/admin/users?role=host&isActive=true&search=nguyen&page=1&limit=20
router.get('/users', async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, fullName: true, phone: true, email: true,
          role: true, isActive: true, rewardPoints: true,
          createdAt: true, deleteRequestedAt: true,
          kyc: { select: { status: true } },
          _count: { select: { bookings: true, vehicles: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);
    return success(res, { users, total, page: Number(page), limit: Number(limit) });
  } catch (e) { return error(res, e.message, 500); }
});

// Khóa/mở khóa tài khoản user
// PATCH /api/admin/users/:id/toggle-active
router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return error(res, 'Không tìm thấy user', 404);
    if (user.role === 'admin') return error(res, 'Không thể khóa tài khoản admin', 400);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive, ...(user.isActive ? { pushToken: null } : {}) },
    });
    const msg = updated.isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản';
    return success(res, { id: updated.id, isActive: updated.isActive }, msg);
  } catch (e) { return error(res, e.message, 500); }
});

// ===== VOUCHER =====

router.get('/vouchers', async (req, res) => {
  try { return success(res, await listVouchers()); }
  catch (e) { return error(res, e.message, 500); }
});

router.post('/vouchers', async (req, res) => {
  try { return success(res, await createVoucher(req.body), 'Tạo voucher thành công', 201); }
  catch (e) { return error(res, e.message, e.status || 500); }
});

router.patch('/vouchers/:id/toggle', async (req, res) => {
  try {
    const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id } });
    if (!voucher) return error(res, 'Không tìm thấy voucher', 404);
    return success(res, await toggleVoucher(req.params.id, !voucher.isActive));
  } catch (e) { return error(res, e.message, 500); }
});

router.delete('/vouchers/:id', async (req, res) => {
  try {
    await prisma.voucher.delete({ where: { id: req.params.id } });
    return success(res, null, 'Đã xóa voucher');
  } catch (e) { return error(res, e.message, 500); }
});

// ===== CẤU HÌNH HỆ THỐNG (PHÍ NỀN TẢNG) =====

// Lấy toàn bộ config
router.get('/config', async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const result = configs.reduce((acc, c) => { acc[c.key] = c.value; return acc; }, {});
    // Giá trị mặc định nếu chưa có
    if (!result.platform_fee_rate) result.platform_fee_rate = '0.20';
    return success(res, result);
  } catch (e) { return error(res, e.message, 500); }
});

// Cập nhật config
// PATCH /api/admin/config  { platform_fee_rate: "0.15" }
router.patch('/config', async (req, res) => {
  try {
    const updates = req.body;
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        prisma.systemConfig.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        })
      )
    );
    return success(res, null, 'Đã cập nhật cấu hình');
  } catch (e) { return error(res, e.message, 500); }
});

// ===== DASHBOARD REALTIME =====

// GET /api/admin/dashboard  — số liệu realtime: đơn đang xử lý, xe đang cho thuê, v.v.
router.get('/dashboard', async (req, res) => {
  try {
    const [
      pendingBookings, confirmedBookings, inProgressBookings,
      pendingKyc, pendingVehicles,
      activeUsers, activeVehicles,
      todayRevenue, todayBookings,
    ] = await Promise.all([
      prisma.booking.count({ where: { status: 'pending_payment' } }),
      prisma.booking.count({ where: { status: 'confirmed' } }),
      prisma.booking.count({ where: { status: 'in_progress' } }),
      prisma.kyc.count({ where: { status: 'pending' } }),
      prisma.vehicle.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.vehicle.count({ where: { status: 'approved', isAvailable: true } }),
      prisma.booking.aggregate({
        where: {
          status: 'completed',
          updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { totalAmount: true },
      }),
      prisma.booking.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);

    return success(res, {
      bookings: {
        pendingApproval: pendingBookings,
        confirmed: confirmedBookings,
        activeRentals: inProgressBookings,
        todayNew: todayBookings,
      },
      pending: { kyc: pendingKyc, vehicles: pendingVehicles },
      platform: { activeUsers, activeVehicles },
      todayRevenue: Number(todayRevenue._sum.totalAmount || 0),
    });
  } catch (e) { return error(res, e.message, 500); }
});

module.exports = router;
