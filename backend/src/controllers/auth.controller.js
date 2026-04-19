const { z } = require('zod');
const authService = require('../services/auth.service');
const { success, error } = require('../utils/response');

// ===== Validation schemas (Zod) =====
const registerSchema = z.object({
  phone: z.string().regex(/^0\d{9}$/, 'SĐT phải có 10 số, bắt đầu bằng 0'),
  email: z.string().email('Email không hợp lệ').optional(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100),
});

const loginSchema = z.object({
  phone: z.string().regex(/^0\d{9}$/, 'SĐT phải có 10 số, bắt đầu bằng 0'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống'),
});

class AuthController {
  // POST /api/auth/register
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      return success(res, result, 'Đăng ký thành công', 201);
    } catch (err) {
      return error(res, err.message, 400);
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      return success(res, result, 'Đăng nhập thành công');
    } catch (err) {
      return error(res, err.message, 401);
    }
  }

  // POST /api/auth/refresh
  async refresh(req, res) {
    try {
      const accessToken = await authService.refreshAccessToken(req.body.refreshToken);
      return success(res, { accessToken }, 'Làm mới token thành công');
    } catch (err) {
      return error(res, 'Refresh token không hợp lệ hoặc đã hết hạn', 401);
    }
  }

  // GET /api/auth/me
  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      return success(res, user);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    // Logout phía client (xóa token), backend chỉ trả về OK
    // Có thể mở rộng: lưu refresh token vào blacklist trong Redis
    return success(res, null, 'Đăng xuất thành công');
  }
}

module.exports = {
  authController: new AuthController(),
  schemas: { registerSchema, loginSchema, refreshSchema },
};
