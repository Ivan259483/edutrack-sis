import {
  calculateRemark,
  canPublishGrade,
  hasPrerequisiteConcerns,
  initials,
  normalize,
  validateSchedule,
  validateTarget,
} from '@/lib/domain';
import * as seed from './mock-data';
import { stateSchema, type AdminState } from './schema';
export function seedState(): AdminState {
  return structuredClone({
    students: seed.students.map((s) => ({
      ...s,
      avatarInitials: initials(s.fullName),
    })),
    enrollments: seed.enrollments,
    grades: seed.gradeRecords,
    schedules: seed.schedules,
    announcements: seed.announcements,
    tickets: seed.supportTickets,
    settings: seed.initialSettings,
    activityLogs: seed.activityLogs,
    notifications: seed.notifications.map((n) => {
      const record =
        n.type === 'ticket'
          ? seed.supportTickets.find((t) =>
              n.description.includes(t.studentName)
            )
          : seed.enrollments.find((e) => n.description.includes(e.studentName));
      const page = n.type === 'ticket' ? '/helpdesk' : '/enrollment';
      return {
        ...n,
        href: record ? `${page}?record=${encodeURIComponent(record.id)}` : page,
      };
    }),
  });
}
export function applyChange<K extends keyof AdminState>(
  state: AdminState,
  key: K,
  value: AdminState[K]
): AdminState {
  let next = stateSchema.parse({ ...state, [key]: value });
  if (key === 'students') {
    const ids = new Set<string>(),
      emails = new Set<string>();
    for (const s of next.students) {
      if (ids.has(normalize(s.studentId)) || emails.has(normalize(s.email)))
        throw new Error('Student ID and email must be unique.');
      ids.add(normalize(s.studentId));
      emails.add(normalize(s.email));
      if (!s.section.startsWith(`${s.program} ${s.yearLevel[0]}`))
        throw new Error(
          'Section must match the selected program and year level.'
        );
      s.avatarInitials = initials(s.fullName);
    }
    const removed = state.students.filter(
      (s) => !next.students.some((n) => n.id === s.id)
    );
    if (
      removed.some(
        (s) =>
          state.enrollments.some((e) => e.studentId === s.id) ||
          state.grades.some((g) => g.studentId === s.id) ||
          state.tickets.some((t) => t.studentNumber === s.studentId)
      )
    )
      throw new Error(
        'This student has enrollment, grade, or support history. Keep the record and update their status instead.'
      );
    const sync = <
      T extends {
        studentId: string;
        studentName: string;
        studentNumber: string;
      },
    >(
      record: T
    ): T => {
      const student = next.students.find((s) => s.id === record.studentId);
      return student
        ? {
            ...record,
            studentName: student.fullName,
            studentNumber: student.studentId,
            program: student.program,
            section: student.section,
            ...('yearLevel' in record ? { yearLevel: student.yearLevel } : {}),
          }
        : record;
    };
    next = {
      ...next,
      enrollments: next.enrollments.map(sync),
      grades: next.grades.map(sync),
      tickets: next.tickets.map((t) => {
        const previous = state.students.find(
          (s) => s.studentId === t.studentNumber
        );
        const s = next.students.find((s) => s.id === previous?.id);
        return s
          ? { ...t, studentName: s.fullName, studentNumber: s.studentId }
          : t;
      }),
    };
  }
  if (key === 'grades')
    for (const g of next.grades) {
      const old = state.grades.find((item) => item.id === g.id);
      if (JSON.stringify(g) === JSON.stringify(old)) continue;
      if (!state.settings.gradeEncodingOpen)
        throw new Error('Grade encoding is disabled in Settings.');
      if (g.publishStatus === 'Published' && !canPublishGrade(g))
        throw new Error('Only valid, complete final grades can be published.');
      g.numericalGrade = g.finalGrade;
      g.remark = calculateRemark(g.finalGrade);
    }
  if (key === 'enrollments')
    for (const e of next.enrollments) {
      const old = state.enrollments.find((item) => item.id === e.id);
      if (!old && !state.settings.enrollmentOpen)
        throw new Error('Enrollment submissions are closed.');
      if (old && old.status !== e.status && old.status !== 'Pending')
        throw new Error('Only pending enrollments can be reviewed.');
      if (
        e.status === 'Approved' &&
        hasPrerequisiteConcerns(e) &&
        !e.prerequisiteOverride
      )
        throw new Error('Confirm the prerequisite override before approval.');
      if (e.status === 'Rejected' && !e.remarks.trim())
        throw new Error('Rejection remarks are required.');
      e.totalUnits = e.subjects.reduce(
        (sum, subject) => sum + subject.units,
        0
      );
    }
  if (key === 'schedules')
    for (const s of next.schedules) validateSchedule(s, next.schedules);
  if (key === 'announcements')
    for (const a of next.announcements)
      validateTarget(a, {
        programs: seed.programOptions,
        years: seed.yearLevelOptions,
        sections: seed.sectionOptions,
      });
  return next;
}
