import { STUDENT_PORTAL_URL } from './api';

// The only sign-in screen is the EduTrack student portal's login page, opened
// on its Administrator tab. Set VITE_STUDENT_PORTAL_URL if it isn't on :5173.
export const studentLoginUrl = () =>
  `${STUDENT_PORTAL_URL.replace(/\/+$/, '')}/login?role=admin`;

// Full-page navigation to another app. replace() drops the current admin page
// from history, so Back can't return to it after signing out.
export function leaveTo(url: string) {
  window.location.replace(url);
}
