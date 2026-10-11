import type { AdminState } from '@/data/schema';
import { normalize } from './domain';
export function searchAdmin(state: AdminState, query: string) {
  const q = normalize(query);
  if (!q) return [];
  return [
    ...state.students.map((s) => ({
      id: `student-${s.id}`,
      label: s.fullName,
      detail: `Student · ${s.studentId}`,
      search: `${s.fullName} ${s.studentId} ${s.email}`,
      href: `/students?record=${encodeURIComponent(s.id)}`,
    })),
    ...state.enrollments.map((e) => ({
      id: `enrollment-${e.id}`,
      label: e.studentName,
      detail: `Enrollment · ${e.status}`,
      search: `${e.studentName} ${e.studentNumber}`,
      href: `/enrollment?record=${encodeURIComponent(e.id)}`,
    })),
    ...state.tickets.map((t) => ({
      id: `ticket-${t.id}`,
      label: t.subject,
      detail: `Ticket · ${t.ticketNumber}`,
      search: `${t.subject} ${t.studentName} ${t.ticketNumber}`,
      href: `/helpdesk?record=${encodeURIComponent(t.id)}`,
    })),
    ...state.announcements.map((a) => ({
      id: `announcement-${a.id}`,
      label: a.title,
      detail: `Announcement · ${a.status}`,
      search: `${a.title} ${a.message}`,
      href: `/announcements?record=${encodeURIComponent(a.id)}`,
    })),
  ]
    .filter((item) => normalize(item.search).includes(q))
    .slice(0, 30);
}
