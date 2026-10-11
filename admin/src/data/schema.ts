import { z } from 'zod';

const text = z.string();
const required = z.string().trim().min(1);
const program = z.enum(['BSIT', 'BSBA', 'BSEd']);
const year = z.enum(['1st Year', '2nd Year', '3rd Year', '4th Year']);
const grade = z.number().finite().min(1).max(5).nullable();
const subject = z.object({
  id: required,
  code: required,
  title: required,
  units: z.number().positive(),
  prerequisite: text.optional(),
});
export const studentSchema = z.object({
  id: required,
  studentId: required,
  fullName: required,
  email: z.string().trim().email(),
  contactNumber: required,
  address: required,
  emergencyContact: required,
  emergencyContactNumber: required,
  program,
  yearLevel: year,
  section: required,
  academicStatus: z.enum(['Active', 'On Leave', 'Graduated', 'Suspended']),
  dateEnrolled: required,
  avatarInitials: required,
});
export const settingsSchema = z.object({
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Use YYYY-YYYY for the academic year.')
    .refine(
      (v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1,
      'Academic year must span consecutive years.'
    ),
  semester: z.enum(['1st Semester', '2nd Semester', 'Summer']),
  enrollmentOpen: z.boolean(),
  gradeEncodingOpen: z.boolean(),
  notifyNewEnrollments: z.boolean(),
  notifyNewTickets: z.boolean(),
  notifySystemActivity: z.boolean(),
});
export const stateSchema = z.object({
  students: z.array(studentSchema),
  enrollments: z.array(
    z.object({
      id: required,
      studentId: required,
      studentName: required,
      studentNumber: required,
      program,
      yearLevel: year,
      section: required,
      subjects: z.array(subject.extend({ hasPrerequisiteMet: z.boolean() })),
      totalUnits: z.number().nonnegative(),
      status: z.enum(['Pending', 'Approved', 'Rejected']),
      remarks: text,
      submittedDate: required,
      hasPrerequisiteConcerns: z.boolean(),
      prerequisiteOverride: z.boolean().optional(),
    })
  ),
  grades: z.array(
    z.object({
      id: required,
      studentId: required,
      studentName: required,
      studentNumber: required,
      subjectCode: required,
      subjectTitle: required,
      section: required,
      program,
      midtermGrade: grade,
      finalGrade: grade,
      numericalGrade: grade,
      remark: z.enum(['Passed', 'Failed', 'Incomplete']),
      units: z.number().positive(),
      publishStatus: z.enum(['Draft', 'Published']),
      semester: required,
      academicYear: required,
    })
  ),
  schedules: z.array(
    z.object({
      id: required,
      subjectCode: required,
      subjectTitle: required,
      section: required,
      program,
      instructor: required,
      day: z.enum([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]),
      startTime: required,
      endTime: required,
      room: required,
    })
  ),
  announcements: z.array(
    z.object({
      id: required,
      title: required,
      category: z.enum([
        'Academic',
        'Enrollment',
        'Event',
        'General',
        'Urgent',
      ]),
      message: required,
      targetAudience: z.enum([
        'All Students',
        'Specific Program',
        'Specific Year Level',
        'Specific Section',
      ]),
      targetValue: required,
      status: z.enum(['Draft', 'Published']),
      author: required,
      dateCreated: required,
      datePublished: text.nullable(),
    })
  ),
  tickets: z.array(
    z.object({
      id: required,
      ticketNumber: required,
      studentName: required,
      studentNumber: required,
      category: z.enum(['Enrollment', 'Grades', 'Technical', 'General']),
      subject: required,
      message: required,
      status: z.enum(['Open', 'In Progress', 'Resolved']),
      dateCreated: required,
      dateUpdated: required,
      replies: z.array(
        z.object({
          id: required,
          author: required,
          message: required,
          timestamp: required,
          isAdmin: z.boolean(),
        })
      ),
    })
  ),
  notifications: z.array(
    z.object({
      id: required,
      title: required,
      description: text,
      timestamp: required,
      read: z.boolean(),
      type: z.enum(['enrollment', 'ticket', 'announcement', 'grade']),
      href: z
        .string()
        .regex(
          /^\/(?:students|enrollment|grades|schedules|announcements|helpdesk|settings)?(?:\?record=[\w%-]+)?$/
        )
        .optional(),
    })
  ),
  settings: settingsSchema,
  activityLogs: z.array(
    z.object({
      id: required,
      action: required,
      actor: required,
      timestamp: required,
      type: z.enum([
        'enrollment',
        'grade',
        'announcement',
        'ticket',
        'student',
        'schedule',
        'settings',
      ]),
    })
  ),
});
export type AdminState = z.infer<typeof stateSchema>;
