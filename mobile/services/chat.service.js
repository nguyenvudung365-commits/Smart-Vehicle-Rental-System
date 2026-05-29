import api from './api';

export const chatService = {
  async getMessages(conversationId) {
    const res = await api.get(`/conversations/${conversationId}/messages`);
    return res;
  },

  async send(conversationId, text) {
    const res = await api.post(`/conversations/${conversationId}/messages`, { text });
    return res;
  },

  async sendToMia(message) {
    const res = await api.post('/chat/mia', { message });
    return res.data;
  },
};
