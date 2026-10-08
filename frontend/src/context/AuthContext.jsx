import React, { createContext, useCallback, useEffect, useState } from 'react';
import API, { AUTH_EXPIRED_EVENT, errorMessage } from '../services/api';
import { openAdminPortal } from '../services/session';

export const AuthContext = createContext();

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('edutrack_user'));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(localStorage.getItem('edutrack_token') || null);
  const [loading, setLoading] = useState(Boolean(token));

  const saveSession = useCallback((receivedToken, receivedUser) => {
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('edutrack_token', receivedToken);
    localStorage.setItem('edutrack_user', JSON.stringify(receivedUser));
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('edutrack_token');
    localStorage.removeItem('edutrack_user');
  }, []);

  // Re-validate a stored token with the server on page load.
  useEffect(() => {
    if (!localStorage.getItem('edutrack_token')) return;
    API.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('edutrack_user', JSON.stringify(data.user));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  // Login handler
  const login = async (identifier, password, role) => {
    try {
      const response = await API.post('/auth/login', { identifier, password, role });
      const { token: receivedToken, user: receivedUser } = response.data;
      if (receivedUser.role === 'admin') {
        openAdminPortal(receivedToken);
      } else {
        saveSession(receivedToken, receivedUser);
      }
      return { success: true, user: receivedUser };
    } catch (error) {
      return { success: false, message: errorMessage(error, 'Login failed. Please check your credentials.') };
    }
  };

  // Refresh the stored profile after it changes on the server.
  const refreshUser = useCallback(async () => {
    const { data } = await API.get('/auth/me');
    setUser(data.user);
    localStorage.setItem('edutrack_user', JSON.stringify(data.user));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, saveSession, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
