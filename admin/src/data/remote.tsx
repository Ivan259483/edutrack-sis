import { useAdminSession } from '@/auth/context';
import { PageLoading } from '@/components/shared/PageLoading';
import { Button } from '@/components/ui/button';
import { api, apiErrorMessage } from '@/lib/api';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { AdminRepository } from './repository';
import type { AdminState } from './schema';
import { AdminProvider } from './store';
import { diffRequests, fetchAdminState } from './sync';

// The UI keeps working from memory; MongoDB (via the API) is the source of truth.
const memoryRepository = (state: AdminState): AdminRepository => ({
  load: () => state,
  save: () => {},
});

const REFRESH_MS = 20000;

export function RemoteAdminProvider({ children }: { children: ReactNode }) {
  const { status } = useAdminSession();
  const [initial, setInitial] = useState<AdminState | null>(null);
  const [snapshot, setSnapshot] = useState<AdminState>();
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const commits = useRef(0);

  const refresh = useCallback(async () => {
    if (pending.current) return; // never overwrite edits that are still saving
    const startedAt = commits.current;
    try {
      const state = await fetchAdminState();
      // Discard responses that may predate an edit made while loading.
      if (pending.current || commits.current !== startedAt) return;
      setSnapshot(state);
    } catch {
      /* Keep showing current data; the next refresh retries. */
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      setInitial(await fetchAdminState());
    } catch (cause) {
      setError(apiErrorMessage(cause));
    }
  }, []);

  useEffect(() => {
    if (status === 'signed-in') void load();
    if (status === 'signed-out') {
      setInitial(null);
      setSnapshot(undefined);
    }
  }, [status, load]);

  useEffect(() => {
    if (!initial) return;
    const timer = window.setInterval(refresh, REFRESH_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [initial, refresh]);

  // Saves are sent in order; if the server rejects one, reload the truth.
  const onCommit = useCallback(
    (previous: AdminState, next: AdminState) => {
      const requests = diffRequests(previous, next);
      if (!requests.length) return;
      commits.current += 1;
      pending.current += 1;
      queue.current = queue.current.then(async () => {
        try {
          for (const request of requests) await api.request(request);
        } catch (cause) {
          toast.error('Change was not saved to the server', {
            description: apiErrorMessage(cause),
          });
          try {
            setSnapshot(await fetchAdminState());
          } catch {
            /* Server unreachable; the periodic refresh retries. */
          }
        } finally {
          pending.current -= 1;
        }
      });
    },
    []
  );

  if (status !== 'signed-in') return <>{children}</>;
  if (!initial)
    return error ? (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div role="alert" className="max-w-md space-y-4 rounded-lg border bg-card p-6">
          <h1 className="text-xl font-bold">Could not load records</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void load()}>Try again</Button>
        </div>
      </main>
    ) : (
      <PageLoading />
    );
  return (
    <AdminProvider
      repository={memoryRepository(initial)}
      onCommit={onCommit}
      snapshot={snapshot}
    >
      {children}
    </AdminProvider>
  );
}
