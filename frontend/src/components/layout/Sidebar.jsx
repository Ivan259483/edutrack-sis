import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  FaThLarge,
  FaUser,
  FaClipboardList,
  FaGraduationCap,
  FaCalendarAlt,
  FaBell,
  FaQuestionCircle,
  FaSignOutAlt,
} from 'react-icons/fa';

// onNavigate/onClose are passed when the sidebar is shown in the mobile drawer.
const Sidebar = ({ onNavigate, onClose }) => {
  const { user, logout } = useContext(AuthContext);

  // Student portal navigation (administrators use the separate admin portal)
  const currentNav = [
    { label: 'Dashboard', path: '/student/dashboard', icon: <FaThLarge /> },
    { label: 'My Profile', path: '/student/profile', icon: <FaUser /> },
    { label: 'My Enrollment', path: '/student/enrollment', icon: <FaClipboardList /> },
    { label: 'My Grades', path: '/student/grades', icon: <FaGraduationCap /> },
    { label: 'My Schedule', path: '/student/schedule', icon: <FaCalendarAlt /> },
    { label: 'Notifications', path: '/student/notifications', icon: <FaBell /> },
    { label: 'Help and Support', path: '/student/support', icon: <FaQuestionCircle /> },
  ];

  return (
    <aside
      className={`d-flex flex-column flex-shrink-0 text-white ${onClose ? 'h-100' : 'min-vh-100'}`}
      style={{
        width: '260px',
        backgroundColor: '#0f172a', // Deep slate from your prototype
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Brand Header */}
      <div className="d-flex align-items-center gap-3 px-4 py-4 border-bottom border-secondary border-opacity-25">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 bg-primary text-white shadow-sm"
          style={{ width: '40px', height: '40px', fontSize: '20px' }}
        >
          <FaGraduationCap />
        </div>
        <div>
          <h5 className="fw-bold mb-0 text-white tracking-wide">EduTrack</h5>
          <span className="text-secondary small" style={{ fontSize: '11px' }}>
            Student Portal
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            className="btn-close btn-close-white ms-auto"
            aria-label="Close navigation menu"
            onClick={onClose}
          />
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-grow-1 px-3 py-3 overflow-y-auto">
        <ul className="nav nav-pills flex-column gap-1">
          {currentNav.map((item) => (
            <li className="nav-item" key={item.path}>
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center justify-content-between px-3 py-2 rounded-3 transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm fw-semibold'
                      : 'text-secondary hover-nav'
                  }`
                }
                style={{ fontSize: '14px', textDecoration: 'none' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="badge rounded-pill bg-danger" style={{ fontSize: '10px' }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* User Card & Logout at the Bottom */}
      <div className="p-3 border-top border-secondary border-opacity-25">
        <div
          className="d-flex align-items-center justify-content-between p-2 rounded-3"
          style={{ backgroundColor: '#1e293b' }}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div
              className="rounded-circle bg-primary bg-opacity-25 text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '36px', height: '36px', fontSize: '13px' }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <div
                className="text-white fw-semibold text-truncate small"
                style={{ maxWidth: '120px' }}
              >
                {user?.name || 'User'}
              </div>
              <div className="text-secondary" style={{ fontSize: '11px' }}>
                {user?.studentId || 'Student'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-sm btn-outline-danger border-0 p-2 text-danger"
            title="Log out"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;