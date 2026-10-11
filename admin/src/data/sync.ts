import { api } from '@/lib/api';
import { stateSchema, type AdminState } from './schema';

// REST resource for each shared collection. Notifications and the activity log
// are append-only on the server (the portal only trims what it displays).
const resources = [
  ['students', '/students', true],
  ['schedules', '/schedules', true],
  ['enrollments', '/enrollments', true],
  ['grades', '/grades', true],
  ['announcements', '/announcements', true],
  ['tickets', '/tickets', true],
  ['notifications', '/notifications', false],
  ['activityLogs', '/activity-logs', false],
] as const;

export interface SyncRequest {
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: unknown;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Translates one committed state change into REST calls (create/update/delete). */
export function diffRequests(previous: AdminState, next: AdminState): SyncRequest[] {
  const requests: SyncRequest[] = [];
  if (!same(previous.settings, next.settings))
    requests.push({ method: 'put', url: '/settings', data: next.settings });
  for (const [key, url, deletable] of resources) {
    const before = new Map<string, unknown>(previous[key].map((r) => [r.id, r]));
    const after = new Set<string>();
    for (const record of next[key]) {
      after.add(record.id);
      const old = before.get(record.id);
      if (!old) requests.push({ method: 'post', url, data: record });
      else if (!same(old, record))
        requests.push({
          method: 'put',
          url: `${url}/${encodeURIComponent(record.id)}`,
          data: record,
        });
    }
    if (deletable)
      for (const id of before.keys())
        if (!after.has(id))
          requests.push({ method: 'delete', url: `${url}/${encodeURIComponent(id)}` });
  }
  return requests;
}

export async function fetchAdminState(): Promise<AdminState> {
  const { data } = await api.get<{ state: unknown }>('/admin/bootstrap');
  return stateSchema.parse(data.state);
}
