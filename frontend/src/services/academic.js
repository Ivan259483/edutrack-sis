// Shared academic helpers for the student portal.

export const PROGRAM_NAMES = {
  BSIT: 'BS Information Technology',
  BSBA: 'BS Business Administration',
  BSEd: 'Bachelor of Secondary Education',
};
export const DEPARTMENTS = {
  BSIT: 'College of Computer Studies',
  BSBA: 'College of Business Administration',
  BSEd: 'College of Education',
};
export const programName = (code) => PROGRAM_NAMES[code] || code || '—';

// Weighted GPA over published, complete grades (1.00 is highest).
export function gradeSummary(grades = []) {
  const complete = grades.filter((g) => typeof g.finalGrade === 'number');
  const units = complete.reduce((sum, g) => sum + g.units, 0);
  const earned = complete.filter((g) => g.finalGrade <= 3).reduce((sum, g) => sum + g.units, 0);
  const gpa = units ? complete.reduce((sum, g) => sum + g.finalGrade * g.units, 0) / units : null;
  return { gpa, units, earned, count: complete.length };
}

export const formatGrade = (value) => (typeof value === 'number' ? value.toFixed(2) : '—');

// "13:30" -> "1:30 PM"
export function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+08:00` : value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
}
