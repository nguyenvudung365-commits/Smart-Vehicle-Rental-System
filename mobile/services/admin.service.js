import api from './api';

export const adminService = {
  // KYC
  getPendingKyc: () => api.get('/admin/kyc'),
  reviewKyc: (id, status, rejectReason) => api.patch(`/admin/kyc/${id}`, { status, rejectReason }),

  // Xe
  getPendingVehicles: () => api.get('/admin/vehicles'),
  reviewVehicle: (id, status, rejectReason) => api.patch(`/admin/vehicles/${id}`, { status, rejectReason }),

  // Yêu cầu xóa tài khoản
  getDeleteRequests: () => api.get('/admin/delete-requests'),
  confirmDelete: (id) => api.patch(`/admin/delete-requests/${id}/confirm`),
  rejectDelete: (id) => api.patch(`/admin/delete-requests/${id}/reject`),

  // Thống kê
  getStats: () => api.get('/admin/stats'),
  getDashboard: () => api.get('/admin/dashboard'),

  // Quản lý user
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),

  // Voucher
  getVouchers: () => api.get('/admin/vouchers'),
  createVoucher: (payload) => api.post('/admin/vouchers', payload),
  toggleVoucher: (id) => api.patch(`/admin/vouchers/${id}/toggle`),
  deleteVoucher: (id) => api.delete(`/admin/vouchers/${id}`),

  // Cấu hình hệ thống
  getConfig: () => api.get('/admin/config'),
  updateConfig: (payload) => api.patch('/admin/config', payload),
};
