const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');
const prisma = require('../config/prisma');

// Middleware xác thực JWT + kiểm tra tài khoản còn hoạt động
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Thiếu access token', 401, 'NO_TOKEN');
    }

    // Cắt bỏ "Bearer " (7 ký tự) để lấy phần token thật
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // Query DB để kiểm tra isActive — token không chứa trường này.
    // Nếu admin vô hiệu hóa tài khoản, người dùng sẽ bị chặn ngay ở request tiếp theo
    // thay vì phải chờ đến khi token hết hạn (15 phút).
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      // Trả mã lỗi riêng ACCOUNT_DISABLED để mobile tự đăng xuất ngay
      return error(res, 'Tài khoản đã bị vô hiệu hóa', 401, 'ACCOUNT_DISABLED');
    }

    // Gắn thông tin user vào request để controller phía sau sử dụng
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Mobile nhận TOKEN_EXPIRED sẽ tự động dùng refresh token để lấy access token mới
      return error(res, 'Access token đã hết hạn', 401, 'TOKEN_EXPIRED');
    }
    return error(res, 'Access token không hợp lệ', 401, 'INVALID_TOKEN');
  }
}

// Middleware kiểm tra role — dùng sau authenticate
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Chưa xác thực', 401);
    }
    // 403 = biết bạn là ai nhưng không có quyền (khác 401 = chưa xác thực)
    if (!roles.includes(req.user.role)) {
      return error(res, 'Không có quyền truy cập', 403, 'FORBIDDEN');
    }
    next();
  };
}

const requireAuth = authenticate;

module.exports = { authenticate, requireAuth, requireRole };
