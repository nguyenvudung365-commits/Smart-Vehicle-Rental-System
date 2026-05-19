import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Đọc URL server từ app.json → chỉ cần đổi 1 chỗ khi đổi IP/domain
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://192.168.1.9:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor request: tự động gắn access token vào MỌI request
// Nhờ vậy không cần gắn header thủ công ở từng màn hình
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor response: tự động xử lý khi token hết hạn
// Người dùng không cần đăng nhập lại thủ công sau mỗi 15 phút
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Tài khoản bị admin vô hiệu hóa → xóa token và đăng xuất ngay
    // Không thử refresh vì dù có token mới, server vẫn chặn
    if (err.response?.data?.error === 'ACCOUNT_DISABLED') {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await AsyncStorage.removeItem('user');
      return Promise.reject(err);
    }

    // Không refresh token cho các endpoint đăng nhập/đăng ký
    // vì những endpoint này không cần xác thực, tránh vòng lặp vô tận
    const skipRefresh = ['/auth/login', '/auth/register', '/auth/refresh'];
    const shouldSkip = skipRefresh.some(u => original.url?.includes(u));

    // Access token hết hạn (401) → thử lấy token mới bằng refresh token
    // _retry = true để tránh retry vô tận nếu token mới vẫn bị lỗi
    if (err.response?.status === 401 && !original._retry && !shouldSkip) {
      original._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // Dùng axios gốc thay vì api instance để tránh interceptor này tự gọi lại
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data.data.accessToken;

        await SecureStore.setItemAsync('accessToken', newAccessToken);
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        // Thử lại request ban đầu với token mới — người dùng không hay biết
        return api(original);
      } catch (refreshErr) {
        // Refresh token cũng hết hạn (30 ngày) → buộc đăng xuất
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
