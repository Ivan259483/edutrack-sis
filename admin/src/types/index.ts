// Centralized types for the Admin Portal

export type Program = 'BSIT' | 'BSBA' | 'BSEd';

export type YearLevel = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export type AcademicStatus = 'Active' | 'On Leave' | 'Graduated' | 'Suspended';

export type EnrollmentStatus = 'Pending' | 'Approved' | 'Rejected';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

export type TicketCategory = 'Enrollment' | 'Grades' | 'Technical' | 'General';

export type AnnouncementStatus = 'Published' | 'Draft';

export type AnnouncementCategory =
  'Academic' | 'Enrollment' | 'Event' | 'General' | 'Urgent';

export type TargetAudience =
  | 'All Students'
  | 'Specific Program'
  | 'Specific Year Level'
  | 'Specific Section';

export type GradeRemark = 'Passed' | 'Failed' | 'Incomplete';

export type PublishStatus = 'Published' | 'Draft';

export type DayOfWeek =
  'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  contactNumber: string;
  address: string;
  emergencyContact: string;
  emergencyContactNumber: string;
  program: Program;
  yearLevel: YearLevel;
  section: string;
  academicStatus: AcademicStatus;
  dateEnrolled: string;
  avatarInitials: string;
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  units: number;
  prerequisite?: string;
}

export interface EnrollmentSubject extends Subject {
  hasPrerequisiteMet: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  program: Program;
  yearLevel: YearLevel;
  section: string;
  subjects: EnrollmentSubject[];
  totalUnits: number;
  status: EnrollmentStatus;
  remarks: string;
  submittedDate: string;
  hasPrerequisiteConcerns: boolean;
  prerequisiteOverride?: boolean;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  subjectCode: string;
  subjectTitle: string;
  section: string;
  program: Program;
  midtermGrade: number | null;
  finalGrade: number | null;
  numericalGrade: number | null;
  remark: GradeRemark;
  units: number;
  publishStatus: PublishStatus;
  semester: string;
  academicYear: string;
}

export interface ScheduleClass {
  id: string;
  subjectCode: string;
  subjectTitle: string;
  section: string;
  program: Program;
  instructor: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: AnnouncementCategory;
  message: string;
  targetAudience: TargetAudience;
  targetValue: string;
  status: AnnouncementStatus;
  author: string;
  dateCreated: string;
  datePublished: string | null;
}

export interface TicketReply {
  id: string;
  author: string;
  message: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  studentName: string;
  studentNumber: string;
  category: TicketCategory;
  subject: string;
  message: string;
  status: TicketStatus;
  dateCreated: string;
  dateUpdated: string;
  replies: TicketReply[];
}

export interface SystemSettings {
  academicYear: string;
  semester: '1st Semester' | '2nd Semester' | 'Summer';
  enrollmentOpen: boolean;
  gradeEncodingOpen: boolean;
  notifyNewEnrollments: boolean;
  notifyNewTickets: boolean;
  notifySystemActivity: boolean;
}

export interface ActivityLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  type:
    | 'enrollment'
    | 'grade'
    | 'announcement'
    | 'ticket'
    | 'student'
    | 'schedule'
    | 'settings';
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'enrollment' | 'ticket' | 'announcement' | 'grade';
  href?: string;
}
