const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { generateTokenPair, verifyRefreshToken, generateAccessToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

class AuthService {
  // FR-01: Đăng ký tài khoản
  async register(data) {
    const { phone, email, password, fullName } = data;
    // Kiểm tra phone đã tồn tại
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new Error('Số điện thoại đã được sử dụng');
    }

    // Kiểm tra email (nếu có)
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new Error('Email đã được sử dụng');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Sinh referral code ngẫu nhiên 8 ký tự
    const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Kiểm tra referral code của người giới thiệu (nếu có)
    let referredBy = null;
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: data.referralCode } });
      if (referrer) {
        referredBy = data.referralCode;
        // Cộng 50 điểm cho người giới thiệu
        await prisma.user.update({
          where: { id: referrer.id },
          data: { rewardPoints: { increment: 50 } },
        });
        // Thông báo cho người giới thiệu
        const { createNotification } = require('./notification.service');
        createNotification(referrer.id, {
          title: 'Bạn nhận được 50 điểm thưởng!',
          body: `${fullName} vừa đăng ký qua mã giới thiệu của bạn. Bạn được cộng 50 điểm thưởng.`,
          type: 'referral_bonus',
        }).catch(() => {});
      }
    }

    // Tạo user mới
    const user = await prisma.user.create({
      data: {
        phone,
        email,
        passwordHash,
        fullName,
        role: 'renter',
        referralCode,
        referredBy,
        rewardPoints: referredBy ? 30 : 0, // Người được giới thiệu nhận 30 điểm
      },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        role: true,
        birthday: true,
        createdAt: true,
        rewardPoints: true,
        referralCode: true,
      },
    });

    // Sinh token pair
    const tokens = generateTokenPair(user);

    return { user, tokens };
  }

  // FR-02: Đăng nhập
  async login({ phone, password }) {
    const user = await prisma.user.findUnique({ where: { phone } });

    // Thông báo lỗi giống nhau cho cả "SĐT không tồn tại" và "sai mật khẩu"
    // để tránh hacker biết số điện thoại nào đã đăng ký trong hệ thống
    if (!user) {
      throw new Error('Số điện thoại hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new Error('Tài khoản đã bị vô hiệu hóa');
    }

    // bcrypt.compare so sánh mật khẩu gõ vào với hash trong DB
    // Không thể đảo ngược hash để lấy lại mật khẩu gốc
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Số điện thoại hoặc mật khẩu không đúng');
    }

    const tokens = generateTokenPair(user);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        birthday: user.birthday,
        createdAt: user.createdAt,
        rewardPoints: user.rewardPoints,
        referralCode: user.referralCode,
      },
      tokens,
    };
  }

  // FR-02 (tt): Refresh access token
  async refreshAccessToken(refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new Error('Người dùng không tồn tại hoặc bị vô hiệu hóa');
    }

    return generateAccessToken({ userId: user.id, role: user.role });
  }

  // Lấy thông tin user hiện tại (cho FR-14)
  async getProfile(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        birthday: true,
        role: true,
        referralCode: true,
        rewardPoints: true,
        createdAt: true,
      },
    });
  }

  // FR-14: Cập nhật hồ sơ cá nhân
  async updateProfile(userId, { fullName, email, birthday, avatarUrl } = {}) {
    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
      if (existing) {
        const err = new Error('Email đã được sử dụng bởi tài khoản khác');
        err.status = 409;
        throw err;
      }
    }
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(email !== undefined && { email }),
        ...(birthday && { birthday: new Date(birthday) }),
        ...(avatarUrl && { avatarUrl }),
      },
      select: {
        id: true, phone: true, email: true, avatarUrl: true,
        fullName: true, birthday: true, role: true,
        rewardPoints: true, referralCode: true, createdAt: true,
      },
    });
  }

  // Đổi mật khẩu
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('Người dùng không tồn tại'), { status: 404 });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw Object.assign(new Error('Mật khẩu hiện tại không đúng'), { status: 400 });

    if (newPassword.length < 6)
      throw Object.assign(new Error('Mật khẩu mới tối thiểu 6 ký tự'), { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  // Yêu cầu xóa tài khoản — gửi thông báo cho admin xét duyệt
  async deleteAccount(userId) {
    const { createNotification } = require('./notification.service');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, phone: true },
    });
    // Đánh dấu yêu cầu xóa trong DB (cần prisma db push trước)
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { deleteRequestedAt: new Date() },
      });
    } catch (e) {
      // Bỏ qua nếu cột chưa tồn tại, vẫn gửi thông báo
    }
    // Tạo thông báo cho tất cả admin
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    await Promise.all(admins.map(admin =>
      createNotification(admin.id, {
        title: 'Yêu cầu xóa tài khoản',
        body: `Người dùng ${user?.fullName} (${user?.phone}) yêu cầu xóa tài khoản. Vào Admin để xử lý.`,
        type: 'delete_request',
      })
    ));
    // Xác nhận cho người dùng
    await createNotification(userId, {
      title: 'Yêu cầu đã được gửi',
      body: 'Yêu cầu xóa tài khoản đã gửi đến Admin. Chúng tôi sẽ xử lý trong 1–3 ngày làm việc.',
      type: 'delete_request',
    });
  }

  // Luu push token cho thiet bi (Expo Notifications)
  async updatePushToken(userId, pushToken) {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: pushToken || null },
    });
  }
}

module.exports = new AuthService();
