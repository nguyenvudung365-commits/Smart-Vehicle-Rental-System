import api from './api';

export const bookingService = {
  // FR-07: Dat xe — gửi toàn bộ payload (vehicleId, startDate, endDate, cardId, note, usePoints)
  async create(payload) {
    const { data } = await api.post('/bookings', payload);
    return data;
  },

  // FR-09: Danh sach chuyen di
  async getMyBookings(status) {
    const params = status && status !== 'all' ? { status } : {};
    const { data } = await api.get('/bookings', { params });
    return data;
  },

  // Chi tiet 1 don
  async getById(id) {
    const { data } = await api.get(`/bookings/${id}`);
    return data;
  },

  // FR-08: Huy don
  async cancel(id, reason) {
    const { data } = await api.patch(`/bookings/${id}/cancel`, { reason });
    return data;
  },
};
