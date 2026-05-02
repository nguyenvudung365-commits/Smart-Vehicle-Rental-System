import api from './api';

export const chatService = {
  async sendToMia(message) {
    const res = await api.post('/chat/mia', { message });
    return res.data;
  },
};
