import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Lưu ý: dùng 10.0.2.2 thay vì localhost khi chạy Android emulator
// iOS simulator: dùng localhost
// Real device: thay bằng IP máy tính (vd 192.168.1.100)
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor: tự động gắn access token vào mọi request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
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
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data.data.accessToken;

        await AsyncStorage.setItem('accessToken', newAccessToken);
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (refreshErr) {
        // Refresh fail → đăng xuất
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
