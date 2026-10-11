import { useCallback, useEffect, useState } from 'react';
import API, { AUTH_EXPIRED_EVENT, errorMessage } from '../services/api';
import { openAdminPortal } from '../services/session';
import { clearSession, readSession, writeSession } from '../services/storage';
import { AuthContext } from './auth-context';


const readStoredUser = () => {
  try {
    return JSON.parse(readSession('edutrack_user'));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(readSession('edutrack_token') || null);
  const [loading, setLoading] = useState(Boolean(token));

  const saveSession = useCallback((receivedToken, receivedUser, remember) => {
    setToken(receivedToken);
    setUser(receivedUser);
    writeSession('edutrack_token', receivedToken, remember);
    writeSession('edutrack_user', JSON.stringify(receivedUser), remember);
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearSession();
  }, []);

  // Re-validate a stored token with the server on page load.
  useEffect(() => {
    if (!readSession('edutrack_token')) return;
    API.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        writeSession('edutrack_user', JSON.stringify(data.user));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  // Login handler ("Remember Me" keeps the session after the browser closes)
  const login = async (identifier, password, role, remember = false) => {
    try {
      const response = await API.post('/auth/login', { identifier, password, role });
      const { token: receivedToken, user: receivedUser } = response.data;
      if (receivedUser.role === 'admin') {
        openAdminPortal(receivedToken, remember);
      } else {
        saveSession(receivedToken, receivedUser, remember);
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
    writeSession('edutrack_user', JSON.stringify(data.user));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, saveSession, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
