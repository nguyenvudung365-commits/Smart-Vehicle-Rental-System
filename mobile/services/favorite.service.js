import api from './api';

export const favoriteService = {
  async getMyFavorites() {
    const { data } = await api.get('/favorites');
    return data;
  },
  async toggle(vehicleId) {
    const { data } = await api.post(`/favorites/${vehicleId}`);
    return data;
  },
  async check(vehicleId) {
    const { data } = await api.get(`/favorites/${vehicleId}/check`);
    return data;
  },
};
