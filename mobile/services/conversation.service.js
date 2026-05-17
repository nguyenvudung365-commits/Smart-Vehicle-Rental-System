import api from './api';

export const conversationService = {
  getMyConversations: async () => {
    const res = await api.get('/conversations');
    return res.data; // { success: true, data: [...] }
  },
  getOrCreate: (_, vehicleId) => api.post('/conversations', { vehicleId }).then(r => r.data),
};
