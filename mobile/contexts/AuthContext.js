import { createContext, useContext, useEffect, useState } from 'react';
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
      const stored = await authService.getStoredUser();
      setUser(stored);
    } catch (err) {
      console.error('Load user error:', err);
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
      await api.put('/auth/push-token', { pushToken: null });
    } catch {}
    await authService.logout();
    setUser(null);
  }

  async function updateUser(data) {
    const result = await authService.updateProfile(data);
    if (result.success) setUser(prev => ({ ...prev, ...result.data }));
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, uploadAvatar }}>
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
