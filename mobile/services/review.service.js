import api from './api';

export const reviewService = {
  async create({ bookingId, rating, comment }) {
    const { data } = await api.post('/reviews', { bookingId, rating, comment });
    return data;
  },

  async getByVehicle(vehicleId) {
    const { data } = await api.get(`/reviews/vehicle/${vehicleId}`);
    return data;
  },
};
