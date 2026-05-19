import api from './api';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chạy 1 lần: chuyển token cũ từ AsyncStorage sang SecureStore rồi xóa khỏi AsyncStorage
async function migrateTokensIfNeeded() {
  try {
    const oldAccess = await AsyncStorage.getItem('accessToken');
    const oldRefresh = await AsyncStorage.getItem('refreshToken');
    if (oldAccess) {
      await SecureStore.setItemAsync('accessToken', oldAccess);
      await AsyncStorage.removeItem('accessToken');
    }
    if (oldRefresh) {
      await SecureStore.setItemAsync('refreshToken', oldRefresh);
      await AsyncStorage.removeItem('refreshToken');
    }
  } catch {}
}

export const authService = {
  // FR-01: Đăng ký
  async register({ phone, email, password, fullName, referralCode }) {
    const { data } = await api.post('/auth/register', { phone, email, password, fullName, referralCode });
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
    } catch {
      // Bỏ qua lỗi server, vẫn xóa token local
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await AsyncStorage.removeItem('user');
  },

  async getProfile() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async updateProfile({ fullName, email, birthday, avatarUrl }) {
    const { data } = await api.put('/auth/profile', { fullName, email, birthday, avatarUrl });
    if (data.success) {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, ...data.data }));
      }
    }
    return data;
  },

  async uploadAvatar(imageUri) {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
    const { data } = await api.put('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (data.success) {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, ...data.data }));
      }
    }
    return data;
  },

  async getStoredUser() {
    migrateTokensIfNeeded(); // fire-and-forget, không block startup
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async isAuthenticated() {
    const token = await SecureStore.getItemAsync('accessToken');
    return !!token;
  },

  // Lưu token vào SecureStore, thông tin user vào AsyncStorage
  async _saveAuthData({ user, tokens }) {
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },
};
