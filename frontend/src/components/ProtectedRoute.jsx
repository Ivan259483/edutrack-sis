import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import AdminRedirect from './AdminRedirect';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-light">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  // Not logged in -> send to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role restriction
  if (requiredRole && user.role !== requiredRole) {
    return user.role === 'admin' ? <AdminRedirect /> : <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;