import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  FaBell,
  FaSearch,
  FaSun,
  FaChevronDown,
  FaUser,
  FaCog,
  FaQuestionCircle,
  FaSignOutAlt,
} from 'react-icons/fa';

const Navbar = ({ title }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="d-flex align-items-center justify-content-between px-4 py-2 bg-white border-bottom shadow-sm"
      style={{ minHeight: '64px' }}
    >
      {/* Left: Breadcrumbs matching your screenshot */}
      <div className="d-flex align-items-center gap-2 small">
        <span className="text-muted">EduTrack</span>
        <span className="text-muted">/</span>
        <strong className="text-dark fw-semibold">{title}</strong>
      </div>

      {/* Right Controls: Search, Theme Toggle, Bell, User Profile Dropdown */}
      <div className="d-flex align-items-center gap-3">
        {/* Search Bar */}
        <form
          className="input-group input-group-sm d-none d-md-flex"
          style={{ width: '240px' }}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim()) navigate(`/student/enrollment?search=${encodeURIComponent(search.trim())}`);
          }}
        >
          <span className="input-group-text bg-light border-end-0 text-muted">
            <FaSearch />
          </span>
          <input
            type="search"
            className="form-control bg-light border-start-0 ps-0"
            placeholder="Search subjects..."
            aria-label="Search subjects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="btn btn-light rounded-circle p-2 text-muted"
          title="Toggle Theme"
        >
          <FaSun />
        </button>

        {/* Notification Bell with Badge */}
        <Link
          to="/student/notifications"
          className="btn btn-light position-relative rounded-circle p-2 text-muted"
          title="Notifications"
        >
          <FaBell />
        </Link>

        {/* User Profile Pill & Dropdown (Matches Screenshot Exactly!) */}
        <div className="position-relative" ref={dropdownRef}>
          <button
            type="button"
            className="btn btn-light d-flex align-items-center gap-2 px-2 py-1 rounded-pill border bg-white shadow-sm"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div
              className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px', fontSize: '12px' }}
            >
              {user?.name ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('') : '?'}
            </div>
            <div className="text-start d-none d-sm-block pe-1">
              <span className="fw-semibold text-dark d-block small" style={{ lineHeight: '1.2' }}>
                {user?.name}
              </span>
              <span className="text-muted d-block" style={{ fontSize: '10px', lineHeight: '1' }}>
                {user?.studentId}
              </span>
            </div>
            <FaChevronDown className="text-muted small" style={{ fontSize: '10px' }} />
          </button>

          {/* Dropdown Menu (From Top Screenshot!) */}
          {dropdownOpen && (
            <div
              className="card border-0 shadow-lg position-absolute end-0 mt-2 py-2 rounded-3 bg-white"
              style={{ width: '230px', zIndex: 1050 }}
            >
              <div className="px-3 py-2 border-bottom">
                <strong className="text-dark small d-block">{user?.name}</strong>
                <span className="text-muted" style={{ fontSize: '11px' }}>
                  {user?.email}
                </span>
              </div>

              <div className="py-1">
                <Link
                  to="/student/profile"
                  className="dropdown-item px-3 py-2 small d-flex align-items-center gap-2 text-secondary"
                  onClick={() => setDropdownOpen(false)}
                >
                  <FaUser className="text-muted" /> My Profile
                </Link>
                <Link
                  to="/student/profile#security"
                  className="dropdown-item px-3 py-2 small d-flex align-items-center gap-2 text-secondary"
                  onClick={() => setDropdownOpen(false)}
                >
                  <FaCog className="text-muted" /> Settings
                </Link>
                <Link
                  to="/student/support"
                  className="dropdown-item px-3 py-2 small d-flex align-items-center gap-2 text-secondary"
                  onClick={() => setDropdownOpen(false)}
                >
                  <FaQuestionCircle className="text-muted" /> Help & Support
                </Link>
              </div>

              <div className="border-top pt-1 mt-1">
                <button
                  type="button"
                  className="dropdown-item px-3 py-2 small d-flex align-items-center gap-2 text-danger fw-semibold"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;