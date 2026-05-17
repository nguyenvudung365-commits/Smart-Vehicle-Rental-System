import api from './api';

export const favoriteService = {
  list: () => api.get('/favorites').then(r => r.data),
  toggle: (vehicleId) => api.post(`/favorites/${vehicleId}`).then(r => r.data),
  check: (vehicleId) => api.get(`/favorites/${vehicleId}/check`).then(r => r.data),
};
