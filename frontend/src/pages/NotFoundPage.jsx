import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCompass } from 'react-icons/fa';
import { AuthContext } from '../context/auth-context';

// Catch-all route for URLs that don't match any page.
const NotFoundPage = () => {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const home = user?.role === 'student' ? '/student/dashboard' : '/login';

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" style={{ backgroundColor: '#0f172a' }}>
      <div className="card border-0 shadow-lg text-white rounded-4 text-center" style={{ backgroundColor: '#1e293b', maxWidth: '440px' }}>
        <div className="card-body p-4 p-sm-5">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-25 text-primary mb-3"
            style={{ width: '56px', height: '56px', fontSize: '24px' }}
          >
            <FaCompass />
          </div>
          <p className="text-secondary small fw-semibold mb-1">Error 404</p>
          <h1 className="h4 fw-bold text-white mb-2">Page not found</h1>
          <p className="text-secondary small mb-4 text-break">
            There is no page at <code className="text-info">{pathname}</code>.
          </p>
          <Link to={home} className="btn btn-primary d-inline-flex align-items-center gap-2 px-4">
            <FaArrowLeft /> {user?.role === 'student' ? 'Back to Dashboard' : 'Back to Login'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
