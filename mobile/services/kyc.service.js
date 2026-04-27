import api from './api';

export const kycService = {
  // FR-03: Gui ho so KYC (upload 2 anh GPLX)
  async submit(formData) {
    const { data } = await api.post('/kyc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000, // upload anh can nhieu thoi gian hon
    });
    return data;
  },

  // Xem trang thai KYC cua toi
  async getMyKyc() {
    const { data } = await api.get('/kyc');
    return data;
  },
};
