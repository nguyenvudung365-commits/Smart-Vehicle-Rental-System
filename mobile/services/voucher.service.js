import api from './api';

export const voucherService = {
  // Danh sách voucher còn hiệu lực (renter xem)
  async getAvailable() {
    const { data } = await api.get('/vouchers');
    return data;
  },

  // Kiểm tra voucher hợp lệ (renter)
  async check(code, amount) {
    const { data } = await api.get('/vouchers/check', { params: { code, amount } });
    return data;
  },

  // Admin: danh sách vouchers
  async list() {
    const { data } = await api.get('/admin/vouchers');
    return data;
  },

  // Admin: tạo voucher mới
  async create(payload) {
    const { data } = await api.post('/admin/vouchers', payload);
    return data;
  },

  // Admin: toggle active/inactive
  async toggle(id) {
    const { data } = await api.patch(`/admin/vouchers/${id}/toggle`);
    return data;
  },

  // Admin: xóa voucher
  async remove(id) {
    const { data } = await api.delete(`/admin/vouchers/${id}`);
    return data;
  },
};
