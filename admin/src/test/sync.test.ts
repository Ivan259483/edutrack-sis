import { describe, expect, it } from 'vitest';
import { diffRequests } from '@/data/sync';
import { applyChange, seedState } from '@/data/transitions';

describe('server sync requests', () => {
  it('sends nothing when nothing changed', () => {
    const state = seedState();
    expect(diffRequests(state, structuredClone(state))).toEqual([]);
  });
  it('creates, updates and deletes records through their REST resources', () => {
    const before = seedState();
    const [first, ...rest] = before.announcements;
    const after = {
      ...before,
      announcements: [
        { ...first, title: 'Updated title' },
        ...rest.slice(1),
        { ...first, id: 'new-announcement' },
      ],
    };
    expect(diffRequests(before, after)).toEqual([
      {
        method: 'put',
        url: `/announcements/${first.id}`,
        data: after.announcements[0],
      },
      {
        method: 'post',
        url: '/announcements',
        data: after.announcements.at(-1),
      },
      { method: 'delete', url: `/announcements/${rest[0].id}` },
    ]);
  });
  it('syncs cascaded student details and settings', () => {
    const before = seedState();
    const student = before.students[0];
    const after = applyChange(
      before,
      'students',
      before.students.map((s) =>
        s.id === student.id ? { ...s, fullName: 'Renamed Student' } : s
      )
    );
    const urls = diffRequests(before, after).map((r) => r.url);
    expect(urls).toContain(`/students/${student.id}`);
    // Linked enrollments/grades carry a copy of the name and are updated too.
    expect(urls.some((u) => u.startsWith('/enrollments/'))).toBe(true);
    expect(urls.some((u) => u.startsWith('/grades/'))).toBe(true);
    const settings = { ...before, settings: { ...before.settings, enrollmentOpen: false } };
    expect(diffRequests(before, settings)).toEqual([
      { method: 'put', url: '/settings', data: settings.settings },
    ]);
  });
  it('sends an edited class as PUT and a deleted class as DELETE', () => {
    const before = seedState();
    const [first, second] = before.schedules;
    const edited = applyChange(
      before,
      'schedules',
      before.schedules.map((s) => (s.id === first.id ? { ...s, room: 'Rm 410' } : s))
    );
    expect(diffRequests(before, edited)).toEqual([
      {
        method: 'put',
        url: `/schedules/${first.id}`,
        data: { ...first, room: 'Rm 410' },
      },
    ]);
    const removed = applyChange(
      before,
      'schedules',
      before.schedules.filter((s) => s.id !== second.id)
    );
    expect(diffRequests(before, removed)).toEqual([
      { method: 'delete', url: `/schedules/${second.id}` },
    ]);
  });
  it('never deletes notifications or activity logs on the server', () => {
    const before = seedState();
    const after = { ...before, notifications: [], activityLogs: [] };
    expect(diffRequests(before, after)).toEqual([]);
  });
});
