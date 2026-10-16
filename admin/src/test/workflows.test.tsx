import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminRoutes } from '@/App';
import { SessionProvider } from '@/auth/session';
import type { AdminSession, AuthClient } from '@/auth/context';
import { AdminProvider } from '@/data/store';
import { createLocalRepository } from '@/data/repository';
import type { AdminRepository } from '@/data/repository';
import { seedState } from '@/data/transitions';
import { useAdminData } from '@/data/context';
import type { AdminState } from '@/data/schema';
import { leaveTo } from '@/lib/navigation';
import { AxiosError, type AxiosResponse } from 'axios';

// Leaving for the EduTrack login page is a full-page navigation; record it instead.
vi.mock('@/lib/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation')>()),
  leaveTo: vi.fn(),
}));
const STUDENT_LOGIN = 'http://localhost:5173/login?role=admin';

const admin: AdminSession = {
  id: 'u1',
  name: 'Dr. Maria Santos',
  email: 'admin@edutrack.edu',
  role: 'admin',
};
// Fake server: signed in unless `signedOut`.
const fakeAuth = (signedOut = false): AuthClient => ({
  restore: async () => (signedOut ? null : admin),
  signOut: vi.fn(),
});
function app(
  route: string,
  repository: AdminRepository = createLocalRepository(localStorage),
  auth: AuthClient = fakeAuth()
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SessionProvider client={auth}>
        <AdminProvider repository={repository}>
          <Suspense fallback={<p>Loading…</p>}>
            <AdminRoutes />
          </Suspense>
        </AdminProvider>
      </SessionProvider>
    </MemoryRouter>
  );
}
describe('Admin routes and workflows', () => {
  it.each([
    ['/', 'Dashboard'],
    ['/students', 'Student Directory'],
    ['/enrollment', 'Enrollment & COR'],
    ['/grades', 'Academic Records'],
    ['/schedules', 'Class Schedules'],
    ['/announcements', 'Announcements'],
    ['/helpdesk', 'Support Helpdesk'],
    ['/settings', 'Settings'],
    ['/not-a-route', 'Page not found'],
  ])('renders %s', async (route, heading) => {
    app(route);
    expect(
      await screen.findByRole('heading', { name: heading, level: 1 })
    ).toBeTruthy();
  });
  it('shows inline validation messages in the student form', async () => {
    const user = userEvent.setup();
    const repo = createLocalRepository(localStorage);
    app('/', repo);
    await user.click(
      await screen.findByRole('button', { name: 'Add Student' })
    );
    const dialog = await screen.findByRole('dialog', { name: 'Add Student' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Save Student' })
    );
    expect(within(dialog).getByText('Student ID is required.')).toBeTruthy();
    expect(within(dialog).getByText('Email is required.')).toBeTruthy();
    const email = within(dialog).getByLabelText('Email', { exact: true });
    expect(email.getAttribute('aria-invalid')).toBe('true');
    await user.type(email, 'not-an-email');
    expect(
      within(dialog).getByText(
        'Enter a valid email address, e.g. name@school.edu.'
      )
    ).toBeTruthy();
    expect(repo.load()).toBeNull();
  });
  it('opens a quick action and saves a student across remounts', async () => {
    const user = userEvent.setup();
    const repo = createLocalRepository(localStorage);
    const view = app('/', repo);
    await user.click(
      await screen.findByRole('button', { name: 'Add Student' })
    );
    const dialog = await screen.findByRole('dialog', { name: 'Add Student' });
    for (const [label, value] of [
      ['Student ID', '2026-00001'],
      ['Full name', 'Sample Test Student'],
      ['Email', 'sample@example.test'],
      ['Contact number', '09000000000'],
      ['Address', 'Sample address'],
      ['Emergency contact', 'Sample contact'],
      ['Emergency contact number', '09000000001'],
    ])
      await user.type(
        within(dialog).getByLabelText(label, { exact: true }),
        value
      );
    await user.click(
      within(dialog).getByRole('button', { name: 'Save Student' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add Student' })).toBeNull()
    );
    expect(repo.load()?.students).toHaveLength(13);
    view.unmount();
    app('/students?record=' + repo.load()!.students.at(-1)!.id, repo);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getAllByText('Sample Test Student').length).toBeGreaterThan(
      0
    );
  });
  it('deletes an unlinked student with confirmation and clamps the last page', async () => {
    const user = userEvent.setup();
    const state = seedState();
    state.students = Array.from({ length: 9 }, (_, i) => ({
      ...state.students[0],
      id: `test-${i}`,
      studentId: `TEST-${i}`,
      email: `test${i}@example.test`,
      fullName: `Sample Student ${i}`,
    }));
    state.enrollments = [];
    state.grades = [];
    state.tickets = [];
    const repo = createLocalRepository(localStorage);
    repo.save(state);
    app('/students', repo);
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    await user.click(
      screen.getByRole('button', { name: /actions for Sample Student 8/i })
    );
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    expect(repo.load()?.students).toHaveLength(9);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: /delete/i,
      })
    );
    await waitFor(() => expect(repo.load()?.students).toHaveLength(8));
    expect(screen.getByText('Sample Student 0')).toBeTruthy();
  });
  it('blocks invalid grade input without saving', async () => {
    const user = userEvent.setup();
    const repo = createLocalRepository(localStorage);
    app('/grades', repo);
    await user.click(
      (await screen.findAllByRole('button', { name: /^Encode / }))[0]
    );
    await user.clear(screen.getByLabelText('Final Grade (1.00 - 5.00)'));
    await user.type(screen.getByLabelText('Final Grade (1.00 - 5.00)'), '9');
    await user.click(screen.getByRole('button', { name: 'Save Grade' }));
    expect(screen.getByRole('alert').textContent).toMatch(
      /between 1.00 and 5.00/
    );
    expect(repo.load()).toBeNull();
  });
  it('global search navigates to the selected record', async () => {
    const user = userEvent.setup();
    app('/settings');
    await user.click(
      await screen.findByRole('button', { name: 'Search Admin Portal' })
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Global search' }),
      seedState().students[0].studentId
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /Student ·/,
      })
    );
    await waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toBe(
        'Student Directory'
      )
    );
    expect(screen.getByRole('dialog').textContent).toContain(
      seedState().students[0].fullName
    );
  });
  it('sends signed-out visitors to the EduTrack login (Administrator tab)', async () => {
    app('/students', undefined, fakeAuth(true));
    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(STUDENT_LOGIN));
    expect(screen.queryByRole('heading', { name: 'Student Directory' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'EduTrack sign-in page' }).getAttribute('href')
    ).toBe(STUDENT_LOGIN);
  });
  it('has no login form of its own: /login redirects too', async () => {
    app('/login', undefined, fakeAuth(true));
    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(STUDENT_LOGIN));
    expect(screen.queryByLabelText('Password')).toBeNull();
  });
  it('signs out when another tab signs out', async () => {
    app('/', undefined, fakeAuth());
    expect(
      await screen.findByRole('heading', { name: 'Dashboard', level: 1 })
    ).toBeTruthy();
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'edutrack_admin_token', newValue: null })
    );
    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(STUDENT_LOGIN));
  });
  it('signs out to the EduTrack login and clears the session', async () => {
    const user = userEvent.setup();
    const auth = fakeAuth();
    app('/', undefined, auth);
    await user.click(
      await screen.findByRole('button', { name: 'Admin account menu' })
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    expect(auth.signOut).toHaveBeenCalledOnce();
    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(STUDENT_LOGIN));
    expect(screen.queryByRole('heading', { name: 'Dashboard', level: 1 })).toBeNull();
  });
});

describe('form completion and cross-page consistency', () => {
  it('requests a downloadable CSV containing only filtered students', async () => {
    app('/students');
    const search = await screen.findByRole('textbox', {
      name: 'Search by name, ID, or email...',
    });
    fireEvent.change(search, {
      target: { value: seedState().students[0].studentId },
    });
    const createDescriptor = Object.getOwnPropertyDescriptor(
      URL,
      'createObjectURL'
    );
    const revokeDescriptor = Object.getOwnPropertyDescriptor(
      URL,
      'revokeObjectURL'
    );
    const create = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return 'blob:sample-export';
    });
    const revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: create,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revoke,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toMatch(/^students-\d{4}-\d{2}-\d{2}\.csv$/);
        expect(this.href).toBe('blob:sample-export');
      });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
      expect(create).toHaveBeenCalledOnce();
      expect(click).toHaveBeenCalledOnce();
      const blob = create.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('text/csv;charset=utf-8;');
      expect(blob.size).toBeGreaterThan(100);
      vi.runAllTimers();
      expect(revoke).toHaveBeenCalledWith('blob:sample-export');
    } finally {
      vi.useRealTimers();
      if (createDescriptor)
        Object.defineProperty(URL, 'createObjectURL', createDescriptor);
      if (revokeDescriptor)
        Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
    }
  });
  it('prints a transcript without unpublished grades', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    app('/grades');
    await user.click(
      (
        await screen.findAllByRole('button', {
          name: 'Transcript for John Michael Cruz',
        })
      )[0]
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Transcript of Records',
    });
    expect(within(dialog).queryByText('Networking 1')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalledOnce();
  });
  it('creates a targeted draft, edits, publishes and deletes it', async () => {
    const user = userEvent.setup();
    const repo = createLocalRepository(localStorage);
    app('/announcements?action=create', repo);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Sample notice');
    await user.click(within(dialog).getByLabelText('Category'));
    await user.click(screen.getByRole('option', { name: 'General' }));
    await user.type(
      within(dialog).getByLabelText('Message'),
      'Sample announcement body'
    );
    await user.click(within(dialog).getByLabelText('Target Audience'));
    await user.click(screen.getByRole('option', { name: 'Specific Program' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Save as Draft' })
    );
    expect(repo.load()).toBeNull();
    await user.click(within(dialog).getByLabelText('Program'));
    await user.click(screen.getByRole('option', { name: 'BSIT' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Save as Draft' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(repo.load()?.announcements[0]).toMatchObject({
      title: 'Sample notice',
      targetValue: 'BSIT',
      status: 'Draft',
    });
    await user.click(
      screen.getByRole('button', { name: 'Edit Sample notice' })
    );
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Edited notice');
    await user.click(screen.getByRole('button', { name: 'Update' }));
    const card = screen.getByText('Edited notice').closest('.bg-card')!;
    await user.click(
      within(card as HTMLElement).getByRole('button', { name: 'Publish' })
    );
    expect(repo.load()?.announcements[0].status).toBe('Published');
    await user.click(
      screen.getByRole('button', { name: 'Delete Edited notice' })
    );
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Delete',
      })
    );
    expect(
      repo.load()?.announcements.some((a) => a.title === 'Edited notice')
    ).toBe(false);
  });
  it('propagates saved settings through navigation and disables grade editing', async () => {
    const user = userEvent.setup();
    const repo = createLocalRepository(localStorage);
    app('/settings', repo);
    const year = await screen.findByLabelText('Academic Year');
    await user.clear(year);
    await user.type(year, '2026-2027');
    await user.click(
      screen.getByRole('switch', { name: 'Grade Encoding Open' })
    );
    await user.click(
      screen.getAllByRole('button', { name: 'Save Settings' })[0]
    );
    await user.click(screen.getByRole('link', { name: 'Academic Records' }));
    expect(await screen.findByText(/AY 2026-2027.*disabled/)).toBeTruthy();
    expect(
      (
        screen.getAllByRole('button', {
          name: /^Encode /,
        })[0] as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(repo.load()?.settings.gradeEncodingOpen).toBe(false);
  });
  it('updates dashboard counts after resolving a ticket', async () => {
    const user = userEvent.setup();
    app('/helpdesk');
    await user.click(
      (await screen.findAllByRole('button', { name: /^Open ticket/ }))[0]
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Reply to selected ticket' }),
      'Sample resolution'
    );
    await user.click(screen.getByRole('button', { name: 'Reply & Resolve' }));
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));
    await screen.findByRole('heading', { name: 'Dashboard', level: 1 });
    expect(
      screen.getByText('Open Support Tickets').parentElement?.textContent
    ).toContain('2Open Support Tickets');
  });
  it('clears selected details when a status tab removes a ticket', async () => {
    const user = userEvent.setup();
    app('/helpdesk');
    await user.click(
      (await screen.findAllByRole('button', { name: /^Open ticket/ }))[0]
    );
    expect(
      screen.getByRole('textbox', { name: 'Reply to selected ticket' })
    ).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /Resolved/ }));
    expect(
      screen.queryByRole('textbox', { name: 'Reply to selected ticket' })
    ).toBeNull();
    expect(screen.getByText('Select a ticket')).toBeTruthy();
  });
});

function MutationProbe() {
  const { state, update } = useAdminData();
  return (
    <>
      <output>{state.students[0].fullName}</output>
      <button
        onClick={() =>
          update(
            'students',
            (previous) =>
              previous.map((s, i) =>
                i === 0 ? { ...s, fullName: 'Changed' } : s
              ),
            'Edited student'
          )
        }
      >
        Update
      </button>
      <button
        onClick={() =>
          update('tickets', (previous) => [
            ...previous,
            { ...previous[0], id: 'new-ticket' },
          ])
        }
      >
        New ticket
      </button>
    </>
  );
}
describe('class schedules: edit and delete', () => {
  // Two Monday classes of BSIT 3A from the seed data (sc1 08:00, sc2 10:00).
  function scheduleRepo() {
    const state = seedState();
    state.schedules = state.schedules.filter((s) =>
      ['sc1', 'sc2'].includes(s.id)
    );
    const repo = createLocalRepository(localStorage);
    repo.save(state);
    return repo;
  }
  it('edits a class with the same form used to add one', async () => {
    const user = userEvent.setup();
    const repo = scheduleRepo();
    app('/schedules', repo);
    await user.click(
      await screen.findByRole('button', {
        name: 'Edit CS201 for BSIT 3A on Monday',
      })
    );
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Edit Class' })
    ).toBeTruthy();
    const room = within(dialog).getByLabelText('Room');
    expect((room as HTMLInputElement).value).toBe('Rm 401');
    await user.clear(room);
    await user.type(room, 'Rm 410');
    await user.click(
      within(dialog).getByRole('button', { name: 'Save Schedule' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const saved = repo.load()!.schedules;
    expect(saved).toHaveLength(2);
    expect(saved.find((s) => s.id === 'sc1')).toMatchObject({
      room: 'Rm 410',
      subjectCode: 'CS201',
      startTime: '08:00',
    });
    expect(screen.getAllByText('Rm 410').length).toBeGreaterThan(0);
  });
  it('rejects an edit that would conflict with another class', async () => {
    const user = userEvent.setup();
    const repo = scheduleRepo();
    app('/schedules', repo);
    await user.click(
      await screen.findByRole('button', {
        name: 'Edit CS201 for BSIT 3A on Monday',
      })
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Start Time'), {
      target: { value: '10:30' },
    });
    fireEvent.change(within(dialog).getByLabelText('End Time'), {
      target: { value: '11:00' },
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Save Schedule' })
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      repo.load()!.schedules.find((s) => s.id === 'sc1')?.startTime
    ).toBe('08:00');
  });
  it('deletes a class only after confirmation', async () => {
    const user = userEvent.setup();
    const repo = scheduleRepo();
    app('/schedules', repo);
    await user.click(
      await screen.findByRole('button', {
        name: 'Delete CS202 for BSIT 3A on Monday',
      })
    );
    const confirm = screen.getByRole('alertdialog');
    expect(within(confirm).getByText(/Information Management/)).toBeTruthy();
    expect(repo.load()!.schedules).toHaveLength(2);
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(repo.load()!.schedules).toHaveLength(2);
    await user.click(
      screen.getByRole('button', { name: 'Delete CS202 for BSIT 3A on Monday' })
    );
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Delete',
      })
    );
    await waitFor(() => expect(repo.load()!.schedules).toHaveLength(1));
    expect(screen.queryByText('Information Management')).toBeNull();
    expect(screen.getByText('Scheduled Classes (1)')).toBeTruthy();
    expect(repo.load()!.activityLogs[0].action).toBe(
      'Deleted class Information Management for BSIT 3A'
    );
  });
});
describe('atomic persistence and notification preferences', () => {
  it('never applies an action if persistence fails', () => {
    const state = seedState();
    const repo = {
      load: () => state,
      save: () => {
        throw new Error('Storage is full');
      },
    };
    render(
      <AdminProvider repository={repo}>
        <MutationProbe />
      </AdminProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(screen.getByRole('status').textContent).toBe(
      state.students[0].fullName
    );
  });
  it.each([true, false])(
    'respects incoming ticket notifications: %s',
    (enabled) => {
      const state = seedState();
      state.settings.notifyNewTickets = enabled;
      let saved: AdminState = state;
      render(
        <AdminProvider
          repository={{
            load: () => state,
            save: (next) => {
              saved = next;
            },
          }}
        >
          <MutationProbe />
        </AdminProvider>
      );
      fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
      expect(saved.notifications.length).toBe(
        state.notifications.length + (enabled ? 1 : 0)
      );
    }
  );
  it('refuses stale tab overwrites', () => {
    const first = createLocalRepository(localStorage),
      second = createLocalRepository(localStorage);
    first.load();
    second.load();
    first.save(seedState());
    expect(() => second.save(seedState())).toThrow(/another tab/);
  });
  it('preserves data when corrupt storage is loaded', () => {
    const save = vi.fn();
    render(
      <AdminProvider
        repository={{
          load: () => {
            throw new Error('Malformed');
          },
          save,
        }}
      >
        <MutationProbe />
      </AdminProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(save).not.toHaveBeenCalled();
  });
});

describe('form validation and server field errors', () => {
  const fill = async (
    user: ReturnType<typeof userEvent.setup>,
    dialog: HTMLElement,
    values: [string, string][]
  ) => {
    for (const [label, value] of values) {
      const input = within(dialog).getByLabelText(label, { exact: true });
      await user.clear(input);
      await user.type(input, value);
    }
  };
  const validStudent: [string, string][] = [
    ['Student ID', '2026-00002'],
    ['Full name', 'Ma. Clara Peñaflor'],
    ['Email', 'clara.penaflor@example.test'],
    ['Contact number', '0917 123 4567'],
    ['Address', 'Quezon City'],
    ['Emergency contact', "Jose O'Neil"],
    ['Emergency contact number', '+63 918 765 4321'],
  ];

  it('checks formats and duplicates on blur, before saving', async () => {
    const user = userEvent.setup();
    const repo = createLocalRepository(localStorage);
    app('/', repo);
    await user.click(await screen.findByRole('button', { name: 'Add Student' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add Student' });
    await fill(user, dialog, [
      ['Student ID', 'ABC-1'],
      ['Full name', 'J4ne'],
      ['Contact number', 'call me'],
    ]);
    await user.click(within(dialog).getByLabelText('Address', { exact: true }));
    expect(within(dialog).getByText('Student ID must use the format YYYY-NNNNN, e.g. 2024-00115.')).toBeTruthy();
    expect(
      within(dialog).getByText('Full name may only contain letters, spaces, hyphens, apostrophes and periods.')
    ).toBeTruthy();
    expect(within(dialog).getByText(/Enter a valid phone number for contact number/)).toBeTruthy();
    // Another student already uses this ID and (case-insensitively) this email.
    const taken = seedState().students[0];
    await fill(user, dialog, [
      ['Student ID', taken.studentId],
      ['Email', taken.email.toUpperCase()],
    ]);
    await user.click(within(dialog).getByRole('button', { name: 'Save Student' }));
    expect(within(dialog).getByText('Student ID is already in use.')).toBeTruthy();
    expect(within(dialog).getByText('Email is already registered.')).toBeTruthy();
    expect(repo.load()).toBeNull();
  });

  it('keeps the form open and shows the API field error when the server rejects a save', async () => {
    const user = userEvent.setup();
    const response = {
      status: 409,
      data: {
        message: 'Email is already registered.',
        errors: [{ field: 'email', message: 'Email is already registered.' }],
      },
    } as AxiosResponse;
    const onCommit = vi.fn(() =>
      Promise.reject(new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, response))
    );
    render(
      <MemoryRouter initialEntries={['/students']}>
        <SessionProvider client={fakeAuth()}>
          <AdminProvider repository={createLocalRepository(localStorage)} onCommit={onCommit}>
            <Suspense fallback={<p>Loading…</p>}>
              <AdminRoutes />
            </Suspense>
          </AdminProvider>
        </SessionProvider>
      </MemoryRouter>
    );
    await user.click(await screen.findByRole('button', { name: /Add Student/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Add Student' });
    await fill(user, dialog, validStudent);
    await user.click(within(dialog).getByRole('button', { name: 'Save Student' }));
    expect(await within(dialog).findByText('Email is already registered.')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Add Student' })).toBeTruthy();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]).toHaveLength(3);
  });

  it('shows the class schedule rules under the fields', async () => {
    const user = userEvent.setup();
    app('/schedules');
    await user.click(await screen.findByRole('button', { name: 'Add Class' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Start Time'), { target: { value: '06:30' } });
    fireEvent.change(within(dialog).getByLabelText('End Time'), { target: { value: '08:00' } });
    await user.type(within(dialog).getByLabelText('Room'), 'Rm <401>');
    await user.click(within(dialog).getByRole('button', { name: 'Save Schedule' }));
    expect(within(dialog).getByText('Subject is required.')).toBeTruthy();
    expect(within(dialog).getByText('Classes must be within 07:00–18:00.')).toBeTruthy();
    expect(within(dialog).getByText(/Room may only contain letters/)).toBeTruthy();
  });
});
