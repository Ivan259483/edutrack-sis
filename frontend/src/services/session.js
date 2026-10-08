import { ADMIN_PORTAL_URL } from './api';

// Administrators work in the separate admin portal; hand the session over
// in the URL fragment (never sent to any server) and drop it here.
export const openAdminPortal = (token) => {
  localStorage.removeItem('edutrack_token');
  localStorage.removeItem('edutrack_user');
  window.location.assign(`${ADMIN_PORTAL_URL}/#token=${encodeURIComponent(token)}`);
};
