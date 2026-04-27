import api from './api';

export const cardService = {
  // FR-10: Them the
  async addCard({ cardNumber, holderName, expiryMonth, expiryYear, cvv }) {
    const { data } = await api.post('/cards', { cardNumber, holderName, expiryMonth, expiryYear, cvv });
    return data;
  },

  // Danh sach the
  async getMyCards() {
    const { data } = await api.get('/cards');
    return data;
  },

  // Xoa the
  async deleteCard(id) {
    const { data } = await api.delete(`/cards/${id}`);
    return data;
  },

  // Dat the mac dinh
  async setDefault(id) {
    const { data } = await api.patch(`/cards/${id}/default`);
    return data;
  },
};
