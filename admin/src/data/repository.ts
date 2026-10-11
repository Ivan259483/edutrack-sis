import { stateSchema, type AdminState } from './schema';

export const STORAGE_KEY = 'university-admin:v1';
export interface AdminRepository {
  load(): AdminState | null;
  save(state: AdminState): void;
}
export function createLocalRepository(
  storage: Pick<Storage, 'getItem' | 'setItem'>
): AdminRepository {
  let lastRead: string | null | undefined;
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      lastRead = raw;
      if (!raw) return null;
      const envelope = JSON.parse(raw);
      if (envelope.version !== 1)
        throw new Error('Unsupported saved data version.');
      return stateSchema.parse(envelope.data);
    },
    save(state) {
      if (lastRead !== undefined && storage.getItem(STORAGE_KEY) !== lastRead)
        throw new Error(
          'Records changed in another tab. Reload before editing to avoid overwriting newer changes.'
        );
      const raw = JSON.stringify({
        version: 1,
        data: stateSchema.parse(state),
      });
      storage.setItem(STORAGE_KEY, raw);
      lastRead = raw;
    },
  };
}
export const localRepository = createLocalRepository({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
});
