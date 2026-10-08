import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import { openAdminPortal } from '../services/session';

// Sends administrators to the admin portal (with their session, if signed in
// here); everyone else to this login page's Administrator tab.
const AdminRedirect = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin' && token) openAdminPortal(token);
    else navigate('/login?role=admin', { replace: true });
  }, [user, token, navigate]);

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-light gap-2">
      <div className="spinner-border text-primary" role="status" />
      <span>Opening the admin portal…</span>
    </div>
  );
};

export default AdminRedirect;
