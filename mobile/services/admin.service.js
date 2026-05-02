import api from './api';

export const adminService = {
  // Vehicles
  async getPendingVehicles() {
    const { data } = await api.get('/admin/vehicles/pending');
    return data;
  },
  async approveVehicle(id) {
    const { data } = await api.patch(`/admin/vehicles/${id}/approve`);
    return data;
  },
  async rejectVehicle(id, reason) {
    const { data } = await api.patch(`/admin/vehicles/${id}/reject`, { reason });
    return data;
  },

  // KYC
  async getPendingKycs() {
    const { data } = await api.get('/admin/kyc/pending');
    return data;
  },
  async approveKyc(userId) {
    const { data } = await api.patch(`/admin/kyc/${userId}/approve`);
    return data;
  },
  async rejectKyc(userId, reason) {
    const { data } = await api.patch(`/admin/kyc/${userId}/reject`, { reason });
    return data;
  },
};
