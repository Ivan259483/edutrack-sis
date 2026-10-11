import {
  programOptions,
  sectionOptions,
  yearLevelOptions,
} from '@/data/mock-data';
import { createLocalRepository, STORAGE_KEY } from '@/data/repository';
import { applyChange, seedState } from '@/data/transitions';
import {
  calculateRemark,
  canIssueCor,
  canPublishGrade,
  clampPage,
  filterStudents,
  formatDate,
  parseGrade,
  replyToTicket,
  scheduleConflicts,
  studentCsv,
  today,
  transcriptSummary,
  transitionEnrollment,
  validateSchedule,
  validateTarget,
  visibleTicket,
} from '@/lib/domain';
import { searchAdmin } from '@/lib/search';
import { describe, expect, it } from 'vitest';

describe('grades and official transcripts', () => {
  it.each([
    [1, 'Passed'],
    [3, 'Passed'],
    [3.01, 'Failed'],
    [5, 'Failed'],
    [null, 'Incomplete'],
  ] as const)('classifies %s as %s', (grade, remark) =>
    expect(calculateRemark(grade)).toBe(remark)
  );
  it.each([
    '0',
    '0.99',
    '5.01',
    '9',
    'NaN',
    'abc',
    '2.5x',
    '1e0',
    '1.234',
    '1..5',
    '-1',
    'Infinity',
  ])('rejects invalid input %s', (value) =>
    expect(() => parseGrade(value)).toThrow()
  );
  it('accepts blank draft and valid decimal grades', () => {
    expect(parseGrade(' ')).toBeNull();
    expect(parseGrade(' 2.50 ')).toBe(2.5);
  });
  it('excludes drafts and incomplete grades and weights failures in GPA', () => {
    const base = seedState().grades[0];
    const result = transcriptSummary([
      { ...base, finalGrade: 2, units: 3, publishStatus: 'Published' },
      { ...base, finalGrade: 5, units: 1, publishStatus: 'Published' },
      { ...base, finalGrade: 1, publishStatus: 'Draft' },
      { ...base, finalGrade: null, publishStatus: 'Published' },
    ]);
    expect(result.records).toHaveLength(2);
    expect(result.gpa).toBe(2.75);
    expect(result.completedUnits).toBe(4);
    expect(result.passedUnits).toBe(3);
    expect(transcriptSummary([]).gpa).toBeNull();
  });
  it('blocks incomplete publication and encoding while closed', () => {
    const state = seedState();
    const grade = {
      ...state.grades[0],
      finalGrade: null,
      publishStatus: 'Published' as const,
    };
    expect(canPublishGrade(grade)).toBe(false);
    expect(() => applyChange(state, 'grades', [grade])).toThrow(/complete/);
    state.settings.gradeEncodingOpen = false;
    expect(() =>
      applyChange(state, 'grades', [{ ...state.grades[0], finalGrade: 2.23 }])
    ).toThrow(/disabled/);
  });
});

describe('schedules', () => {
  const existing = seedState().schedules[0];
  const candidate = {
    ...existing,
    id: 'new',
    room: 'Other',
    instructor: 'Other',
    section: 'Other',
  };
  it('normalizes room and instructor values', () => {
    expect(
      scheduleConflicts(
        { ...candidate, room: ` ${existing.room.toUpperCase()} ` },
        [existing]
      ).room
    ).toBe(true);
    expect(
      scheduleConflicts(
        { ...candidate, instructor: ` ${existing.instructor.toUpperCase()} ` },
        [existing]
      ).instructor
    ).toBe(true);
  });
  it('allows adjacent classes and other days', () => {
    expect(
      scheduleConflicts(
        {
          ...existing,
          id: 'new',
          startTime: existing.endTime,
          endTime: '18:00',
        },
        [existing]
      ).room
    ).toBe(false);
    expect(
      scheduleConflicts(
        { ...candidate, day: existing.day === 'Monday' ? 'Tuesday' : 'Monday' },
        [existing]
      ).room
    ).toBe(false);
  });
  it.each([
    ['06:00', '08:00'],
    ['17:00', '19:00'],
    ['09:00', '08:00'],
    ['09:00', '09:00'],
    ['bad', '10:00'],
  ])('rejects unsupported %s–%s', (startTime, endTime) =>
    expect(() =>
      validateSchedule({ ...candidate, startTime, endTime }, [])
    ).toThrow()
  );
  it('requires fields and rejects overlapping sections', () => {
    expect(() => validateSchedule({ ...candidate, room: ' ' }, [])).toThrow(
      /fields/
    );
    expect(() =>
      validateSchedule({ ...candidate, section: existing.section }, [existing])
    ).toThrow(/section/);
  });
});

describe('enrollment and COR', () => {
  const pending = {
    ...seedState().enrollments[0],
    status: 'Pending' as const,
    hasPrerequisiteConcerns: false,
    subjects: seedState().enrollments[0].subjects.map((s) => ({
      ...s,
      hasPrerequisiteMet: true,
    })),
  };
  it('approves a valid pending enrollment and enables COR only afterward', () => {
    expect(canIssueCor(pending)).toBe(false);
    expect(canIssueCor(transitionEnrollment(pending, 'Approved'))).toBe(true);
  });
  it('requires a prerequisite override', () => {
    const concern = { ...pending, hasPrerequisiteConcerns: true };
    expect(() => transitionEnrollment(concern, 'Approved')).toThrow(/override/);
    expect(
      transitionEnrollment(concern, 'Approved', '', true).prerequisiteOverride
    ).toBe(true);
  });
  it('stores required rejection remarks and keeps COR unavailable', () => {
    expect(() => transitionEnrollment(pending, 'Rejected', ' ')).toThrow(
      /remarks/
    );
    const rejected = transitionEnrollment(
      pending,
      'Rejected',
      ' Missing prerequisite '
    );
    expect(rejected.remarks).toBe('Missing prerequisite');
    expect(canIssueCor(rejected)).toBe(false);
    expect(() => transitionEnrollment(rejected, 'Approved')).toThrow(/pending/);
  });
});

describe('directory and CSV', () => {
  it('combines search and all filters', () => {
    const students = seedState().students;
    const s = students[0];
    expect(
      filterStudents(
        students,
        ` ${s.studentId} `,
        s.program,
        s.yearLevel,
        s.section,
        s.academicStatus
      )
    ).toEqual([s]);
    expect(filterStudents(students, 'no-match')).toEqual([]);
  });
  it('clamps pages after deleting the final row on a page', () => {
    expect(clampPage(2, 10, 10)).toBe(1);
    expect(clampPage(8, 0, 10)).toBe(1);
    expect(clampPage(2, 11, 10)).toBe(2);
  });
  it('escapes CSV and neutralizes spreadsheet formulas', () => {
    const s = { ...seedState().students[0], fullName: '=CMD("unsafe")' };
    const csv = studentCsv([s]);
    expect(csv).toContain('Student ID');
    expect(csv).toContain('"\'=CMD(""unsafe"")"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
  it('synchronizes edits and prevents orphaned history', () => {
    const state = seedState();
    const id = state.enrollments[0].studentId;
    const student = state.students.find((s) => s.id === id)!;
    const next = applyChange(
      state,
      'students',
      state.students.map((s) =>
        s.id === id ? { ...s, fullName: 'Updated Name' } : s
      )
    );
    expect(next.enrollments[0].studentName).toBe('Updated Name');
    expect(() =>
      applyChange(
        state,
        'students',
        state.students.filter((s) => s.id !== id)
      )
    ).toThrow(/history/);
    expect(() =>
      applyChange(state, 'students', [
        ...state.students,
        { ...student, id: 'duplicate' },
      ])
    ).toThrow(/unique/);
  });
});

describe('announcements and tickets', () => {
  const options = {
    programs: programOptions,
    years: yearLevelOptions,
    sections: sectionOptions,
  };
  it.each([
    'Specific Program',
    'Specific Year Level',
    'Specific Section',
  ] as const)('requires a concrete %s target', (targetAudience) =>
    expect(() =>
      validateTarget({ targetAudience, targetValue: targetAudience }, options)
    ).toThrow()
  );
  it('allows valid targets', () => {
    expect(() =>
      validateTarget(
        { targetAudience: 'Specific Program', targetValue: 'BSIT' },
        options
      )
    ).not.toThrow();
    expect(() =>
      validateTarget(
        { targetAudience: 'All Students', targetValue: 'All Students' },
        options
      )
    ).not.toThrow();
  });
  it('persists replies and status transitions', () => {
    const ticket = { ...seedState().tickets[0], status: 'Open' as const };
    const progress = replyToTicket(ticket, ' Reviewing now ', false);
    expect(progress.status).toBe('In Progress');
    expect(progress.replies.at(-1)?.message).toBe('Reviewing now');
    const resolved = replyToTicket(progress, 'Done', true);
    expect(resolved.status).toBe('Resolved');
    expect(() => replyToTicket(resolved, 'More', true)).toThrow(/resolved/);
    expect(() => replyToTicket(ticket, ' ', false)).toThrow(/reply/);
  });
  it('never returns a selected ticket outside filtered results', () => {
    const tickets = seedState().tickets;
    expect(visibleTicket([], tickets[0].id)).toBeNull();
    expect(visibleTicket(tickets, tickets[0].id)).toEqual(tickets[0]);
  });
});

describe('repository, search, date and settings', () => {
  it('round-trips all shared collections without mutating the seed', () => {
    const repository = createLocalRepository(localStorage);
    expect(repository.load()).toBeNull();
    const state = seedState();
    state.students[0].fullName = 'Persisted';
    repository.save(state);
    expect(repository.load()).toEqual(state);
    expect(seedState().students[0].fullName).not.toBe('Persisted');
  });
  it('preserves corrupt storage rather than overwriting it', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    expect(() => createLocalRepository(localStorage).load()).toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
  it('rejects invalid versions and malformed settings', () => {
    localStorage.setItem(STORAGE_KEY, '{"version":2}');
    expect(() => createLocalRepository(localStorage).load()).toThrow(/version/);
    const state = seedState();
    expect(() =>
      applyChange(state, 'settings', {
        ...state.settings,
        academicYear: '2025-2027',
      })
    ).toThrow();
  });
  it('searches records with direct navigable results', () => {
    const state = seedState();
    expect(
      searchAdmin(state, state.students[0].studentId).some((r) =>
        r.href.startsWith('/students?record=')
      )
    ).toBe(true);
    expect(searchAdmin(state, state.tickets[0].ticketNumber)[0].href).toContain(
      '/helpdesk?record='
    );
    expect(searchAdmin(state, state.announcements[0].title)[0].href).toContain(
      '/announcements?record='
    );
    expect(searchAdmin(state, '  ')).toEqual([]);
  });
  it('uses Manila calendar boundaries without UTC date shifting', () => {
    expect(today(new Date('2026-10-02T17:00:00Z'))).toBe('2026-10-03');
    expect(formatDate('2026-10-03')).toContain('3');
    expect(formatDate('invalid')).toBe('—');
  });
});
