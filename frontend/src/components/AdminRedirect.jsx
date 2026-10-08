import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/auth-context';
import { ADMIN_PORTAL_URL } from '../services/api';
import { openAdminPortal } from '../services/session';

// Sends administrators to the admin portal (with their session, if signed in here).
const AdminRedirect = () => {
  const { user, token } = useContext(AuthContext);

  useEffect(() => {
    if (user?.role === 'admin' && token) openAdminPortal(token);
    else window.location.assign(`${ADMIN_PORTAL_URL}/login`);
  }, [user, token]);

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-light gap-2">
      <div className="spinner-border text-primary" role="status" />
      <span>Opening the admin portal…</span>
    </div>
  );
};

export default AdminRedirect;
