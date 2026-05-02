import api from './api';

export const pointsService = {
  async getPointsInfo() {
    const res = await api.get('/points');
    return res.data;
  },
};
