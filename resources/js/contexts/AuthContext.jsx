import React, { createContext, useContext, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      // Corrupted localStorage (e.g. "undefined") — clear it so the page can load
      localStorage.removeItem('auth_user');
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authService.login(credentials);
      // API response shape: { success, data: { user, access_token, refresh_token, ... } }
      const { user, access_token, refresh_token } = res.data;
      localStorage.setItem('auth_token',         access_token);
      localStorage.setItem('auth_refresh_token', refresh_token);
      localStorage.setItem('auth_user',          JSON.stringify(user));
      setUser(user);
      return res.data;   // return inner data so Login.jsx gets { user, access_token, … }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAdmin:    user?.role === 'admin',
      isSalesman: user?.role === 'salesman',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
