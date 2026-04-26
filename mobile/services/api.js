import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Đọc từ app.json extra.apiUrl — chỉ cần đổi 1 chỗ khi thay IP/domain
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://192.168.1.9:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor: tự động gắn access token vào mọi request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: tự động refresh token khi access token hết hạn (401)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Nếu 401 và chưa retry → thử refresh
    if (err.response?.status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data.data.accessToken;

        await SecureStore.setItemAsync('accessToken', newAccessToken);
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (refreshErr) {
        // Refresh fail → đăng xuất
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await AsyncStorage.removeItem('user');
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
