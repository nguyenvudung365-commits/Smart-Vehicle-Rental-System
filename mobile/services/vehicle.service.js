import api from './api';

export const vehicleService = {
  // FR-04, FR-05: Tìm kiếm xe
  async search(params = {}) {
    const { data } = await api.get('/vehicles/search', { params });
    return data;
  },

  // FR-06: Chi tiết xe
  async getById(id) {
    const { data } = await api.get(`/vehicles/${id}`);
    return data;
  },
};
