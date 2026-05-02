import api from './api';

export const conversationService = {
  async getOrCreate(hostId, vehicleId) {
    const res = await api.post('/conversations', { hostId, vehicleId });
    return res.data;
  },
  async getMyConversations() {
    const res = await api.get('/conversations');
    return res.data;
  },
  async getMessages(conversationId, cursor) {
    const res = await api.get(`/conversations/${conversationId}/messages`, {
      params: cursor ? { cursor } : {},
    });
    return res.data;
  },
  async sendMessage(conversationId, text) {
    const res = await api.post(`/conversations/${conversationId}/messages`, { text });
    return res.data;
  },
};
