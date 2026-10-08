import axios from 'axios';

// Backend (Express + MongoDB) and the admin portal. Override in frontend/.env.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export const ADMIN_PORTAL_URL = import.meta.env.VITE_ADMIN_PORTAL_URL || 'http://localhost:5174';

export const AUTH_EXPIRED_EVENT = 'edutrack:auth-expired';

// Create a centralized Axios instance connected to our Node backend
const API = axios.create({ baseURL: API_URL, timeout: 15000 });

// Automatically attach JWT token to every request if user is logged in
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('edutrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired or rejected token signs the user out (AuthContext listens for this).
API.interceptors.response.use(undefined, (error) => {
  const url = error.config?.url || '';
  if (error.response?.status === 401 && !url.includes('/auth/login')) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return Promise.reject(error);
});

// Human-readable message from an API/network error.
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error?.response?.data?.message ||
  (error?.request && !error.response ? `Cannot reach the EduTrack server at ${API_URL}.` : fallback);

export default API;
