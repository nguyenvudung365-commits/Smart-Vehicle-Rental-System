import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

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

  async function login(credentials) {
    const result = await authService.login(credentials);
    if (result.success) {
      setUser(result.data.user);
    }
    return result;
  }

  async function register(userData) {
    const result = await authService.register(userData);
    if (result.success) {
      setUser(result.data.user);
    }
    return result;
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
