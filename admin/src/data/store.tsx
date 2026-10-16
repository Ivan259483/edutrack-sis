import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import { ZodError } from 'zod';
import { apiErrorMessage, apiFieldErrors } from '@/lib/api';
import { Context, type Store } from './context';
import { localRepository, type AdminRepository } from './repository';
import type { AdminState } from './schema';
import { applyChange, seedState } from './transitions';

const actionTypes = {
  students: 'student',
  enrollments: 'enrollment',
  grades: 'grade',
  schedules: 'schedule',
  announcements: 'announcement',
  tickets: 'ticket',
  settings: 'settings',
  notifications: 'settings',
  activityLogs: 'settings',
} as const;
export function AdminProvider({
  children,
  repository = localRepository,
  onCommit,
  snapshot,
}: {
  children: ReactNode;
  repository?: AdminRepository;
  /** Called after each committed change, e.g. to sync it to the server. With
   *  `quiet`, failures are not toasted: the returned promise rejects instead. */
  onCommit?: (
    previous: AdminState,
    next: AdminState,
    options?: { quiet: boolean }
  ) => Promise<void> | void;
  /** Newer records from the server; replaces the current state when it changes. */
  snapshot?: AdminState;
}) {
  const [loaded] = useState(() => {
    try {
      return { state: repository.load() ?? seedState(), error: null };
    } catch {
      return {
        state: seedState(),
        error:
          'Saved data could not be read. Existing storage has been preserved. Export or recover it before reloading; changes are disabled.',
      };
    }
  });
  const [state, setState] = useState(loaded.state);
  const current = useRef(state);
  const [error, setError] = useState<string | null>(loaded.error);
  useEffect(() => {
    if (!snapshot || snapshot === current.current) return;
    current.current = snapshot;
    setState(snapshot);
  }, [snapshot]);
  // Applies a change locally; `synced` settles once the server has it.
  const commit = <K extends keyof AdminState>(
    key: K,
    change: SetStateAction<AdminState[K]>,
    action: string | undefined,
    quiet: boolean
  ): { ok: true; synced: Promise<void> | void } | { ok: false; message: string } => {
    try {
      if (loaded.error) throw new Error(loaded.error);
      const previous = current.current;
      const value =
        typeof change === 'function' ? change(previous[key]) : change;
      let next = applyChange(previous, key, value);
      const incoming =
        key === 'enrollments' && next.settings.notifyNewEnrollments
          ? next.enrollments
              .filter(
                (e) => !previous.enrollments.some((old) => old.id === e.id)
              )
              .map((e) => ({
                title: 'New enrollment request',
                description: e.studentName,
                type: 'enrollment' as const,
                href: `/enrollment?record=${encodeURIComponent(e.id)}`,
              }))
          : key === 'tickets' && next.settings.notifyNewTickets
            ? next.tickets
                .filter((t) => !previous.tickets.some((old) => old.id === t.id))
                .map((t) => ({
                  title: 'New support ticket',
                  description: t.subject,
                  type: 'ticket' as const,
                  href: `/helpdesk?record=${encodeURIComponent(t.id)}`,
                }))
            : [];
      next.notifications = [
        ...incoming.map((n) => ({
          ...n,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
        })),
        ...next.notifications,
      ].slice(0, 200);
      if (action) {
        next = {
          ...next,
          activityLogs: [
            {
              id: crypto.randomUUID(),
              action,
              actor: 'Admin',
              timestamp: new Date().toISOString(),
              type: actionTypes[key],
            },
            ...next.activityLogs,
          ].slice(0, 200),
        };
        if (next.settings.notifySystemActivity)
          next.notifications = [
            {
              id: crypto.randomUUID(),
              title: 'Admin activity',
              description: action,
              timestamp: new Date().toISOString(),
              read: false,
              type: 'announcement' as const,
              href: {
                students: '/students',
                enrollments: '/enrollment',
                grades: '/grades',
                schedules: '/schedules',
                announcements: '/announcements',
                tickets: '/helpdesk',
                settings: '/settings',
                notifications: '/',
                activityLogs: '/',
              }[key],
            },
            ...next.notifications,
          ].slice(0, 200);
      }
      repository.save(next);
      current.current = next;
      setState(next);
      setError(null);
      return { ok: true, synced: onCommit?.(previous, next, { quiet }) };
    } catch (cause) {
      const message =
        cause instanceof ZodError
          ? cause.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')
          : cause instanceof Error
            ? cause.message
            : 'Unable to save changes.';
      setError(message);
      if (!quiet) toast.error('Changes were not saved', { description: message });
      return { ok: false, message };
    }
  };
  const update: Store['update'] = (key, change, action) =>
    commit(key, change, action, false).ok;
  const save: Store['save'] = async (key, change, action) => {
    const result = commit(key, change, action, true);
    if (!result.ok)
      return { ok: false, message: result.message, fieldErrors: {} };
    try {
      await result.synced;
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        message: apiErrorMessage(cause),
        fieldErrors: apiFieldErrors(cause),
      };
    }
  };
  return (
    <Context.Provider value={{ state, update, save, error }}>
      {children}
    </Context.Provider>
  );
}
