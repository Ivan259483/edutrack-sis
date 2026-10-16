import { createContext, useContext, type SetStateAction } from 'react';
import type { AdminState } from './schema';
export type SaveResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors: Record<string, string> };
export type Store = {
  state: AdminState;
  error: string | null;
  update: <K extends keyof AdminState>(
    key: K,
    value: SetStateAction<AdminState[K]>,
    action?: string
  ) => boolean;
  /** Like update, but waits for the server and returns its verdict instead of
   *  showing a toast, so a form can stay open and show field errors. */
  save: <K extends keyof AdminState>(
    key: K,
    value: SetStateAction<AdminState[K]>,
    action?: string
  ) => Promise<SaveResult>;
};
export const Context = createContext<Store | null>(null);
export function useAdminData() {
  const value = useContext(Context);
  if (!value) throw new Error('AdminProvider is required.');
  return value;
}
export function useAdminCollection<K extends keyof AdminState>(key: K) {
  const { state, update, save } = useAdminData();
  return [
    state[key],
    (value: SetStateAction<AdminState[K]>, action?: string) =>
      update(key, value, action),
    (value: SetStateAction<AdminState[K]>, action?: string) =>
      save(key, value, action),
  ] as const;
}
