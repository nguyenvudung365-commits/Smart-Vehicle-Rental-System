const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');

// Middleware xác thực JWT cho các route cần đăng nhập
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Thiếu access token', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Access token đã hết hạn', 401, 'TOKEN_EXPIRED');
    }
    return error(res, 'Access token không hợp lệ', 401, 'INVALID_TOKEN');
  }
}

// Middleware kiểm tra role
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Chưa xác thực', 401);
    }
    if (!roles.includes(req.user.role)) {
      return error(res, 'Không có quyền truy cập', 403, 'FORBIDDEN');
    }
    next();
  };
}

// Alias de code buoi 5 import duoc ca 2 ten
const requireAuth = authenticate;

module.exports = { authenticate, requireAuth, requireRole };
