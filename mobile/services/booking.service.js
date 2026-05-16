import api from './api';

export const bookingService = {
  // FR-07: Dat xe — gửi toàn bộ payload (vehicleId, startDate, endDate, cardId, note, usePoints)
  async create(payload) {
    const { data } = await api.post('/bookings', payload);
    return data;
  },

  async confirmPayment(bookingId, otp) {
    const { data } = await api.patch(`/bookings/${bookingId}/confirm-payment`, { otp });
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

  // Cap nhat trang thai: confirmed→in_progress→completed
  async updateStatus(id, status) {
    const { data } = await api.patch(`/bookings/${id}/status`, { status });
    return data;
  },

  // Host: danh sach don thue xe minh so huu
  async getHostBookings(status) {
    const params = status && status !== 'all' ? { status } : {};
    const { data } = await api.get('/bookings/host', { params });
    return data;
  },

  // Host: xac nhan don
  async hostConfirm(id) {
    const { data } = await api.patch(`/bookings/${id}/host-confirm`);
    return data;
  },

  // Host: tu choi don
  async hostReject(id, reason) {
    const { data } = await api.patch(`/bookings/${id}/host-reject`, { reason });
    return data;
  },

  // Host: lay thong ke
  async getHostStats() {
    const { data } = await api.get('/bookings/host/stats');
    return data;
  },

  // Bước 1: Host bàn giao xe (imageUri không bắt buộc)
  async hostHandover(id, imageUri) {
    if (!imageUri) {
      const { data } = await api.patch(`/bookings/${id}/host-handover`);
      return data;
    }
    const formData = new FormData();
    formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'handover.jpg' });
    const { data } = await api.patch(`/bookings/${id}/host-handover`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },

  // Bước 2: Khách xác nhận đã nhận xe
  async renterReceived(id, imageUri) {
    if (!imageUri) {
      const { data } = await api.patch(`/bookings/${id}/renter-received`);
      return data;
    }
    const formData = new FormData();
    formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'received.jpg' });
    const { data } = await api.patch(`/bookings/${id}/renter-received`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },

  // Bước 3: Khách trả xe
  async renterReturn(id, imageUri) {
    if (!imageUri) {
      const { data } = await api.patch(`/bookings/${id}/renter-return`);
      return data;
    }
    const formData = new FormData();
    formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'return.jpg' });
    const { data } = await api.patch(`/bookings/${id}/renter-return`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },

  // Bước 4: Host xác nhận nhận xe lại
  async hostReceived(id, imageUri) {
    if (!imageUri) {
      const { data } = await api.patch(`/bookings/${id}/host-received`);
      return data;
    }
    const formData = new FormData();
    formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'host-received.jpg' });
    const { data } = await api.patch(`/bookings/${id}/host-received`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
};
