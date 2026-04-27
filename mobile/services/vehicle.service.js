import api from './api';

export const vehicleService = {
  async getFeatures() {
    const { data } = await api.get('/vehicles/features');
    return data;
  },

  // FR-04, FR-05: Tim kiem xe (public)
  async search(params = {}) {
    const { data } = await api.get('/vehicles/search', { params });
    return data;
  },

  // FR-06: Chi tiet xe (public)
  async getById(id) {
    const { data } = await api.get(`/vehicles/${id}`);
    return data;
  },

  // === Buoi 5: CRUD cho host ===

  // Danh sach xe cua toi
  async getMyVehicles() {
    const { data } = await api.get('/vehicles/mine');
    return data;
  },

  // Tao xe moi
  async create(vehicleData) {
    const { data } = await api.post('/vehicles', vehicleData);
    return data;
  },

  // Cap nhat xe
  async update(id, vehicleData) {
    const { data } = await api.put(`/vehicles/${id}`, vehicleData);
    return data;
  },

  // Xoa xe
  async remove(id) {
    const { data } = await api.delete(`/vehicles/${id}`);
    return data;
  },

  // Bat/tat hien thi
  async toggleAvailability(id) {
    const { data } = await api.patch(`/vehicles/${id}/availability`);
    return data;
  },

  // Gui duyet
  async submitForReview(id) {
    const { data } = await api.post(`/vehicles/${id}/submit`);
    return data;
  },

  // Upload anh xe
  async uploadImages(id, formData) {
    const { data } = await api.post(`/vehicles/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return data;
  },

  // Xoa 1 anh
  async deleteImage(vehicleId, imageId) {
    const { data } = await api.delete(`/vehicles/${vehicleId}/images/${imageId}`);
    return data;
  },
};
