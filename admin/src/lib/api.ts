import axios, { AxiosError } from 'axios';

// EduTrack backend (Express + MongoDB). Override with VITE_API_URL.
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api';
// EduTrack student portal, where students (and the shared login page) live.
export const STUDENT_PORTAL_URL: string =
  import.meta.env.VITE_STUDENT_PORTAL_URL ?? 'http://localhost:5173';

export const TOKEN_KEY = 'edutrack_admin_token';
export const AUTH_EXPIRED_EVENT = 'edutrack:auth-expired';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* Session lasts for this page only if storage is blocked. */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* Nothing stored. */
    }
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A rejected/expired token ends the session everywhere in the app.
api.interceptors.response.use(undefined, (error: AxiosError) => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
    tokenStore.clear();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return Promise.reject(error);
});

// Human-readable message from an API/network error.
export function apiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string } | undefined)
      ?.message;
    if (message) return message;
    if (!error.response)
      return `Cannot reach the EduTrack server at ${API_URL}. Is the backend running?`;
    return `Request failed (${error.response.status}).`;
  }
  return error instanceof Error ? error.message : 'Unexpected error.';
}
