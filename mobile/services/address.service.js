import api from './api';

export const addressService = {
  async getMyAddresses() {
    const { data } = await api.get('/addresses');
    return data;
  },
  async create(payload) {
    const { data } = await api.post('/addresses', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/addresses/${id}`, payload);
    return data;
  },
  async remove(id) {
    const { data } = await api.delete(`/addresses/${id}`);
    return data;
  },
  async setDefault(id) {
    const { data } = await api.patch(`/addresses/${id}/default`);
    return data;
  },
};
