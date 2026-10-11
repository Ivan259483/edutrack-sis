import { createContext, useContext } from 'react';
export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}
export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';
export interface Handoff {
  token: string;
  remember: boolean;
}
// Server boundary for authentication (replaced by a fake in tests).
// Signing in happens on the EduTrack student portal, which hands the JWT over.
export interface AuthClient {
  /**
   * Validates a stored token (or one handed over by the EduTrack login;
   * `remember: false` keeps it only for this browser tab).
   */
  restore(handoff?: Handoff): Promise<AdminSession | null>;
  signOut(): void;
}
export const Context = createContext<{
  session: AdminSession | null;
  status: SessionStatus;
  signOut: () => void;
} | null>(null);
export function useAdminSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider is required.');
  return value;
}
