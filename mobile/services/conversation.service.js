import api from './api';

export const conversationService = {
  getMyConversations: async () => {
    const res = await api.get('/conversations');
    return res.data; // { success: true, data: [...] }
  },
  getOrCreate: (hostId, vehicleId) => api.post('/conversations', { hostId, vehicleId }).then(r => r.data),
};
