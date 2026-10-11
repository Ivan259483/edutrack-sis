import { createContext, useContext, type SetStateAction } from 'react';
import type { AdminState } from './schema';
export type Store = {
  state: AdminState;
  error: string | null;
  update: <K extends keyof AdminState>(
    key: K,
    value: SetStateAction<AdminState[K]>,
    action?: string
  ) => boolean;
};
export const Context = createContext<Store | null>(null);
export function useAdminData() {
  const value = useContext(Context);
  if (!value) throw new Error('AdminProvider is required.');
  return value;
}
export function useAdminCollection<K extends keyof AdminState>(key: K) {
  const { state, update } = useAdminData();
  return [
    state[key],
    (value: SetStateAction<AdminState[K]>, action?: string) =>
      update(key, value, action),
  ] as const;
}
