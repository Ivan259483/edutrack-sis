import { ADMIN_PORTAL_URL } from './api';
import { clearSession } from './storage';

// Administrators work in the separate admin portal; hand the session over
// in the URL fragment (never sent to any server) and drop it here.
// `remember=0` tells the admin portal to forget the session when the tab closes.
export const openAdminPortal = (token, remember = true) => {
  clearSession();
  const fragment = `#token=${encodeURIComponent(token)}${remember ? '' : '&remember=0'}`;
  window.location.assign(`${ADMIN_PORTAL_URL}/${fragment}`);
};
