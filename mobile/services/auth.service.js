import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  // FR-01: Đăng ký
  async register({ phone, email, password, fullName }) {
    const { data } = await api.post('/auth/register', { phone, email, password, fullName });
    if (data.success) {
      await this._saveAuthData(data.data);
    }
    return data;
  },

  // FR-02: Đăng nhập
  async login({ phone, password }) {
    const { data } = await api.post('/auth/login', { phone, password });
    if (data.success) {
      await this._saveAuthData(data.data);
    }
    return data;
  },

  // FR-02: Đăng xuất
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore lỗi server, vẫn xóa token local
    }
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  },

  async getProfile() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async getStoredUser() {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async isAuthenticated() {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  },

  // Helper: lưu token + user vào AsyncStorage
  async _saveAuthData({ user, tokens }) {
    await AsyncStorage.multiSet([
      ['accessToken', tokens.accessToken],
      ['refreshToken', tokens.refreshToken],
      ['user', JSON.stringify(user)],
    ]);
  },
};
