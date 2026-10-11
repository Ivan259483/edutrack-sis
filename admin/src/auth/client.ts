import { api, tokenStore } from '@/lib/api';
import type { AdminSession, AuthClient } from './context';

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
}
const toSession = (user: ApiUser): AdminSession => {
  if (user.role !== 'admin')
    throw new Error('This account is not an administrator account.');
  return { id: user.id, name: user.name, email: user.email, role: 'admin' };
};

// JWT session handed over by the EduTrack login page (student portal).
export const apiAuthClient: AuthClient = {
  async restore(handoffToken) {
    if (handoffToken) tokenStore.set(handoffToken);
    if (!tokenStore.get()) return null;
    try {
      const { data } = await api.get<{ user: ApiUser }>('/auth/me');
      return toSession(data.user);
    } catch {
      tokenStore.clear();
      return null;
    }
  },
  signOut() {
    tokenStore.clear();
  },
};
