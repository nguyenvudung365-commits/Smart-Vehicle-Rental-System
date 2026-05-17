import api from './api';

export const addressService = {
  list: () => api.get('/addresses').then(r => r.data),
  getMyAddresses: () => api.get('/addresses').then(r => r.data),
  create: (data) => api.post('/addresses', data).then(r => r.data),
  update: (id, data) => api.put(`/addresses/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/addresses/${id}`).then(r => r.data),
};
