import type {
  Announcement,
  Enrollment,
  GradeRecord,
  GradeRemark,
  ScheduleClass,
  Student,
  SupportTicket,
  SystemSettings,
} from '@/types';

export const normalize = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
export const periodLabel = (
  period: Pick<SystemSettings, 'academicYear' | 'semester'>
) => `AY ${period.academicYear} · ${period.semester}`;
export const today = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T12:00:00+08:00`
      : value.includes('T')
        ? value
        : `${value.replace(' ', 'T')}+08:00`
  );
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
}
export function parseGrade(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error(
      'Enter a numerical grade from 1.00 to 5.00, with up to two decimal places.'
    );
  const result = Number(value);
  if (!validGrade(result))
    throw new Error('Grades must be between 1.00 and 5.00.');
  return result;
}
export const validGrade = (grade: number | null): grade is number =>
  grade !== null && Number.isFinite(grade) && grade >= 1 && grade <= 5;
export const calculateRemark = (grade: number | null): GradeRemark =>
  grade === null ? 'Incomplete' : grade <= 3 ? 'Passed' : 'Failed';
export const canPublishGrade = (grade: GradeRecord) =>
  validGrade(grade.finalGrade) &&
  (grade.midtermGrade === null || validGrade(grade.midtermGrade));
export function transcriptSummary(grades: GradeRecord[]) {
  const records = grades.filter(
    (g) => g.publishStatus === 'Published' && canPublishGrade(g)
  );
  const completedUnits = records.reduce((sum, g) => sum + g.units, 0);
  const passedUnits = records
    .filter((g) => g.finalGrade! <= 3)
    .reduce((sum, g) => sum + g.units, 0);
  const gpa = completedUnits
    ? records.reduce((sum, g) => sum + g.finalGrade! * g.units, 0) /
      completedUnits
    : null;
  return { records, completedUnits, passedUnits, gpa };
}
export function timeToMinutes(time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
export const classesOverlap = (a: ScheduleClass, b: ScheduleClass) =>
  a.day === b.day &&
  timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
  timeToMinutes(b.startTime) < timeToMinutes(a.endTime);
export function scheduleConflicts(
  item: ScheduleClass,
  schedules: ScheduleClass[]
) {
  const overlapping = schedules.filter(
    (s) => s.id !== item.id && classesOverlap(s, item)
  );
  return {
    room: overlapping.some((s) => normalize(s.room) === normalize(item.room)),
    instructor: overlapping.some(
      (s) => normalize(s.instructor) === normalize(item.instructor)
    ),
    section: overlapping.some(
      (s) => normalize(s.section) === normalize(item.section)
    ),
  };
}
export function validateSchedule(
  item: ScheduleClass,
  schedules: ScheduleClass[]
) {
  if (
    ![
      item.subjectCode,
      item.section,
      item.instructor,
      item.day,
      item.room,
    ].every((v) => v.trim())
  )
    throw new Error('Complete all schedule fields.');
  const start = timeToMinutes(item.startTime),
    end = timeToMinutes(item.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    throw new Error('Start time must be before end time.');
  if (start < 420 || end > 1080)
    throw new Error('Classes must be within 07:00–18:00.');
  const conflicts = scheduleConflicts(item, schedules);
  const reasons = Object.entries(conflicts)
    .filter(([, value]) => value)
    .map(([key]) => key);
  if (reasons.length)
    throw new Error(
      `Schedule conflict: ${reasons.join(', ')} already booked on ${item.day} at that time.`
    );
}
export const hasPrerequisiteConcerns = (e: Enrollment) =>
  e.hasPrerequisiteConcerns || e.subjects.some((s) => !s.hasPrerequisiteMet);
export const canIssueCor = (e: Enrollment) => e.status === 'Approved';
export function transitionEnrollment(
  e: Enrollment,
  status: Enrollment['status'],
  remarks = '',
  override = false
): Enrollment {
  if (e.status !== 'Pending')
    throw new Error('Only pending enrollments can be reviewed.');
  if (status === 'Approved' && hasPrerequisiteConcerns(e) && !override)
    throw new Error(
      'Resolve prerequisite concerns or confirm an admin override.'
    );
  if (status === 'Rejected' && !remarks.trim())
    throw new Error('Rejection remarks are required.');
  return {
    ...e,
    status,
    remarks: status === 'Rejected' ? remarks.trim() : '',
    prerequisiteOverride:
      status === 'Approved' && hasPrerequisiteConcerns(e) && override,
  };
}
export function validateTarget(
  announcement: Pick<Announcement, 'targetAudience' | 'targetValue'>,
  options: { programs: string[]; years: string[]; sections: string[] }
) {
  const allowed = {
    'All Students': ['All Students'],
    'Specific Program': options.programs,
    'Specific Year Level': options.years,
    'Specific Section': options.sections,
  };
  if (!allowed[announcement.targetAudience]?.includes(announcement.targetValue))
    throw new Error(
      `Choose a valid value for ${announcement.targetAudience.toLowerCase()}.`
    );
}
export function filterStudents(
  students: Student[],
  search: string,
  program = 'all',
  year = 'all',
  section = 'all',
  status = 'all'
) {
  const query = normalize(search);
  return students.filter(
    (s) =>
      [s.fullName, s.studentId, s.email].some((v) =>
        normalize(v).includes(query)
      ) &&
      (program === 'all' || s.program === program) &&
      (year === 'all' || s.yearLevel === year) &&
      (section === 'all' || s.section === section) &&
      (status === 'all' || s.academicStatus === status)
  );
}
export const clampPage = (page: number, count: number, size: number) =>
  Math.max(1, Math.min(page, Math.ceil(count / size) || 1));
export const visibleTicket = (tickets: SupportTicket[], id: string | null) =>
  tickets.find((t) => t.id === id) ?? null;
export function replyToTicket(
  ticket: SupportTicket,
  message: string,
  resolve: boolean
): SupportTicket {
  if (ticket.status === 'Resolved')
    throw new Error('This ticket is already resolved.');
  if (!message.trim()) throw new Error('Enter a reply before sending.');
  return {
    ...ticket,
    status: resolve ? 'Resolved' : 'In Progress',
    dateUpdated: today(),
    replies: [
      ...ticket.replies,
      {
        id: crypto.randomUUID(),
        author: 'Admin',
        message: message.trim(),
        timestamp: new Date().toISOString(),
        isAdmin: true,
      },
    ],
  };
}
export function studentCsv(students: Student[]) {
  const cell = (value: string) =>
    `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
  const rows = [
    [
      'Student ID',
      'Name',
      'Email',
      'Program',
      'Year Level',
      'Section',
      'Status',
    ],
    ...students.map((s) => [
      s.studentId,
      s.fullName,
      s.email,
      s.program,
      s.yearLevel,
      s.section,
      s.academicStatus,
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
export function downloadCsv(students: Student[]) {
  const url = URL.createObjectURL(
    new Blob([studentCsv(students)], { type: 'text/csv;charset=utf-8;' })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `students-${today()}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
