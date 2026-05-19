import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth.service';
import api from '../services/api';

const AuthContext = createContext(null);

// Lay Expo push token (neu co expo-notifications)
async function getExpoPushToken() {
  try {
    const Notifications = require('expo-notifications');
    const Constants = require('expo-constants');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.default?.expoConfig?.extra?.eas?.projectId
      ?? Constants.default?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      // Bước 1: Hiện dữ liệu local ngay lập tức để tránh màn hình trắng
      const stored = await authService.getStoredUser();
      if (stored) setUser(stored);

      // Bước 2: Fetch profile mới nhất từ server để đồng bộ
      // Đảm bảo birthday, rewardPoints, role luôn cập nhật dù user
      // đã đăng nhập từ trước hoặc vừa đăng xuất rồi đăng nhập lại
      const res = await authService.getProfile();
      if (res?.success && res.data) {
        const fresh = res.data;
        setUser(fresh);
        await AsyncStorage.setItem('user', JSON.stringify(fresh));
      }
    } catch {
      // Không có mạng → giữ dữ liệu local, không báo lỗi cho người dùng
    } finally {
      setLoading(false);
    }
  }

  async function registerPushToken() {
    try {
      const token = await getExpoPushToken();
      if (token) {
        await api.put('/auth/push-token', { pushToken: token });
      }
    } catch {}
  }

  async function login(credentials) {
    const result = await authService.login(credentials);
    if (result.success) {
      setUser(result.data.user);
      // Lưu push token lên server sau khi đăng nhập để nhận thông báo
      // .catch() để lỗi push token không ảnh hưởng đến luồng đăng nhập
      registerPushToken().catch(() => {});
    }
    return result;
  }

  async function register(userData) {
    const result = await authService.register(userData);
    if (result.success) {
      setUser(result.data.user);
      registerPushToken().catch(() => {});
    }
    return result;
  }

  async function logout() {
    try {
      // Xóa push token trên server trước khi đăng xuất
      // Tránh server gửi thông báo đến thiết bị sau khi đã đăng xuất
      await api.put('/auth/push-token', { pushToken: null });
    } catch {}
    await authService.logout(); // Xóa token khỏi SecureStore và AsyncStorage
    setUser(null); // Xóa khỏi state → app tự điều hướng về trang đăng nhập
  }

  async function updateUser(data) {
    const result = await authService.updateProfile(data);
    if (result.success) {
      // Spread operator: giữ nguyên các trường cũ, chỉ ghi đè trường mới
      // Tránh mất dữ liệu khi chỉ cập nhật 1 trường (vd: chỉ đổi tên)
      setUser(prev => ({ ...prev, ...result.data }));
    }
    return result;
  }

  // Upload avatar + cập nhật context ngay lập tức (không cần gọi thêm updateUser)
  async function uploadAvatar(imageUri) {
    const result = await authService.uploadAvatar(imageUri);
    if (result.success && result.data) {
      setUser(prev => ({ ...prev, ...result.data }));
    }
    return result;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, uploadAvatar, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
