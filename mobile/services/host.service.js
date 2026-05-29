import api from './api';

export const hostService = {
  // ===== ĐÁNH GIÁ KHÁCH =====
  async reviewRenter(bookingId, rating, comment) {
    const { data } = await api.post('/host/reviews', { bookingId, rating, comment });
    return data;
  },
  async getRenterReviews(renterId) {
    const { data } = await api.get(`/host/renter-reviews/${renterId}`);
    return data;
  },

  // ===== CHẶN KHÁCH =====
  async getBlockedList() {
    const { data } = await api.get('/host/blocked');
    return data;
  },
  async blockRenter(renterId, reason) {
    const { data } = await api.post('/host/blocked', { renterId, reason });
    return data;
  },
  async unblockRenter(renterId) {
    const { data } = await api.delete(`/host/blocked/${renterId}`);
    return data;
  },

  // ===== LỊCH XE =====
  async getCalendar(year, month) {
    const { data } = await api.get('/host/calendar', { params: { year, month } });
    return data;
  },
  async getVehicleCalendar(vehicleId, year, month) {
    const { data } = await api.get(`/host/vehicle-calendar/${vehicleId}`, { params: { year, month } });
    return data;
  },
};
