import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { LoadError } from '../components/PageState';
import { AuthContext } from '../context/AuthContext';
import useApi from '../services/useApi';
import { formatDate, formatGrade, gradeSummary } from '../services/academic';
import {
  FaBell,
  FaCheckDouble,
  FaTrashAlt,
  FaGraduationCap,
  FaClipboardCheck,
  FaCalendarAlt,
  FaBullhorn,
  FaInfoCircle,
  FaChevronRight,
  FaCheck,
  FaExternalLinkAlt,
  FaTimes,
  FaFilter,
} from 'react-icons/fa';

const ANNOUNCEMENT_STYLE = {
  Academic: { icon: <FaGraduationCap />, color: '#10b981' },
  Enrollment: { icon: <FaClipboardCheck />, color: '#3b82f6' },
  Event: { icon: <FaCalendarAlt />, color: '#8b5cf6' },
  Urgent: { icon: <FaInfoCircle />, color: '#ef4444' },
  General: { icon: <FaBullhorn />, color: '#f59e0b' },
};

// Turns announcements, the enrollment decision and released grades into notifications.
function buildNotifications(announcements = [], enrollment, grades = []) {
  const items = announcements.map((a) => ({
    id: `announcement-${a.id}`,
    category: a.category === 'Enrollment' ? 'Enrollment & Registrar' : a.category === 'Academic' ? 'Academic & Grades' : 'Administrative & Advisories',
    title: a.title,
    description: a.message.length > 160 ? `${a.message.slice(0, 157)}…` : a.message,
    fullContent: a.message,
    timestamp: formatDate(a.datePublished || a.dateCreated),
    date: formatDate(a.datePublished || a.dateCreated),
    sortDate: a.datePublished || a.dateCreated,
    priority: a.category === 'Urgent' ? 'high' : 'normal',
    ...(ANNOUNCEMENT_STYLE[a.category] || ANNOUNCEMENT_STYLE.General),
    actionLabel: a.category === 'Enrollment' ? 'Go to My Enrollment' : null,
    actionPath: a.category === 'Enrollment' ? '/student/enrollment' : null,
    sender: a.author === 'Admin' ? 'Office of the University Registrar' : a.author,
  }));

  if (enrollment && enrollment.status !== 'Pending') {
    const approved = enrollment.status === 'Approved';
    items.push({
      id: `enrollment-${enrollment.id}-${enrollment.status}`,
      category: 'Enrollment & Registrar',
      title: approved ? 'Enrollment Approved — COR Available' : 'Enrollment Application Returned',
      description: approved
        ? `Your enrollment for ${enrollment.totalUnits} units has been approved by the Registrar.`
        : `Registrar remarks: ${enrollment.remarks}`,
      fullContent: approved
        ? `Your enrollment (${enrollment.subjects.length} subjects, ${enrollment.totalUnits} units) has been approved. Your Certificate of Registration (COR) is ready to view and print.`
        : `Your enrollment application was returned with these remarks: "${enrollment.remarks}". Please revise your subjects and resubmit.`,
      timestamp: formatDate(enrollment.updatedAt),
      date: formatDate(enrollment.updatedAt),
      sortDate: enrollment.updatedAt,
      priority: 'high',
      icon: <FaClipboardCheck />,
      color: approved ? '#3b82f6' : '#ef4444',
      actionLabel: 'View Enrollment & COR',
      actionPath: '/student/enrollment',
      sender: 'University Registrar',
    });
  }

  const terms = [...new Set(grades.map((g) => `${g.semester} ${g.academicYear}`))];
  for (const term of terms) {
    const termGrades = grades.filter((g) => `${g.semester} ${g.academicYear}` === term);
    const latest = termGrades.map((g) => g.updatedAt).sort().at(-1);
    items.push({
      id: `grades-${term}-${termGrades.length}`,
      category: 'Academic & Grades',
      title: `Grades Released for ${term}`,
      description: `${termGrades.length} subject grade(s) have been published: ${termGrades.map((g) => g.subjectCode).join(', ')}.`,
      fullContent: `The Registrar has published ${termGrades.length} grade(s) for ${term}. Your term GPA is ${formatGrade(gradeSummary(termGrades).gpa)}. View the full breakdown on the My Grades page.`,
      timestamp: formatDate(latest),
      date: formatDate(latest),
      sortDate: latest,
      priority: 'normal',
      icon: <FaGraduationCap />,
      color: '#10b981',
      actionLabel: 'View My Grades',
      actionPath: '/student/grades',
      sender: 'Office of the University Registrar',
    });
  }
  return items.sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)));
}

const StudentNotifications = () => {
  const navigate = useNavigate();

  const { user } = useContext(AuthContext);
  const announcements = useApi('/portal/announcements', []);
  const enrollment = useApi('/portal/enrollment');
  const grades = useApi('/portal/grades', []);

  // Read/dismissed flags are a per-browser convenience; the records come from the server.
  const storageKey = `edutrack_notifications_${user?.id}`;
  const [prefs, setPrefs] = useState(() => {
    try {
      return { read: [], dismissed: [], ...JSON.parse(localStorage.getItem(storageKey)) };
    } catch {
      return { read: [], dismissed: [] };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {
      /* storage unavailable: flags last for this visit only */
    }
  }, [prefs, storageKey]);

  const notifications = useMemo(
    () =>
      buildNotifications(announcements.data, enrollment.data?.enrollment, grades.data)
        .filter((n) => !prefs.dismissed.includes(n.id))
        .map((n) => ({ ...n, unread: !prefs.read.includes(n.id) })),
    [announcements.data, enrollment.data, grades.data, prefs]
  );

  // Filter & Modal State
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedNotifModal, setSelectedNotifModal] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Counts
  const unreadCount = notifications.filter((n) => n.unread).length;
  const totalCount = notifications.length;

  // Filter logic
  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Unread') return item.unread;
    return item.category === activeFilter;
  });

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setPrefs((prev) => ({ ...prev, read: [...new Set([...prev.read, ...notifications.map((n) => n.id)])] }));
    showToast('All notifications marked as read');
  };

  // Mark single as read
  const handleMarkSingleAsRead = (id, e) => {
    if (e) e.stopPropagation();
    setPrefs((prev) => (prev.read.includes(id) ? prev : { ...prev, read: [...prev.read, id] }));
  };

  // Dismiss notification
  const handleDeleteNotif = (id, e) => {
    if (e) e.stopPropagation();
    setPrefs((prev) => ({ ...prev, dismissed: [...prev.dismissed, id] }));
    if (selectedNotifModal?.id === id) setSelectedNotifModal(null);
    showToast('Notification removed');
  };

  // Toast feedback helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Handle opening modal & auto-mark as read
  const handleOpenDetailModal = (item) => {
    handleMarkSingleAsRead(item.id);
    setSelectedNotifModal(item);
  };

  return (
    <AppLayout>
      <div className="p-4" style={{ backgroundColor: '#0f172a', minHeight: '100vh' }}>
        {/* Toast Alert Popup */}
        {toastMessage && (
          <div
            className="position-fixed bottom-0 end-0 p-3"
            style={{ zIndex: 1100 }}
          >
            <div
              className="toast show align-items-center text-white bg-primary border-0 rounded-3 shadow-lg px-3 py-2"
              role="alert"
            >
              <div className="d-flex align-items-center gap-2 small fw-semibold">
                <FaCheck /> {toastMessage}
              </div>
            </div>
          </div>
        )}

        {(announcements.error || enrollment.error || grades.error) && (
          <LoadError
            message={announcements.error || enrollment.error || grades.error}
            onRetry={() => [announcements, enrollment, grades].forEach((r) => r.reload())}
          />
        )}

        {/* Top Header & Breadcrumb */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <div className="text-secondary small mb-1">
              EduTrack <span className="text-white opacity-50">/</span> <span className="text-white">Notifications</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="fw-bold text-white mb-0">Notifications & Bulletins</h4>
              {unreadCount > 0 && (
                <span className="badge rounded-pill bg-danger px-2 py-1" style={{ fontSize: '11px' }}>
                  {unreadCount} New
                </span>
              )}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-2 py-2 px-3 rounded-3 small"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              style={{ opacity: unreadCount === 0 ? 0.5 : 1 }}
            >
              <FaCheckDouble /> Mark All Read
            </button>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-lg-3">
            <div
              className="p-3 rounded-4 border border-secondary border-opacity-25 h-100 text-white shadow-sm"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-medium">Total Alerts</span>
                <span className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                  <FaBell />
                </span>
              </div>
              <h3 className="fw-bold mb-1">{totalCount} Notices</h3>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                Academic Year 2026–2027
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div
              className="p-3 rounded-4 border border-secondary border-opacity-25 h-100 text-white shadow-sm"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-medium">Unread Messages</span>
                <span className="p-2 rounded-3 bg-danger bg-opacity-10 text-danger">
                  <FaInfoCircle />
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-danger">{unreadCount} Pending</h3>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                Action required on recent items
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div
              className="p-3 rounded-4 border border-secondary border-opacity-25 h-100 text-white shadow-sm"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-medium">Academic & Grades</span>
                <span className="p-2 rounded-3 bg-success bg-opacity-10 text-success">
                  <FaGraduationCap />
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-success">
                {notifications.filter((n) => n.category === 'Academic & Grades').length} Updates
              </h3>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                Evaluation records synced
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div
              className="p-3 rounded-4 border border-secondary border-opacity-25 h-100 text-white shadow-sm"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-medium">Delivery Channel</span>
                <span className="p-2 rounded-3 bg-info bg-opacity-10 text-info">
                  <FaCheck />
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-info fs-5">Active & Synced</h3>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                In-App & Email OTP Enabled
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs / Pills */}
        <div className="d-flex gap-2 flex-wrap mb-4">
          {[
            { label: 'All', key: 'All', badge: totalCount },
            { label: 'Unread', key: 'Unread', badge: unreadCount },
            { label: 'Academic & Grades', key: 'Academic & Grades' },
            { label: 'Enrollment & Registrar', key: 'Enrollment & Registrar' },
            { label: 'Administrative & Advisories', key: 'Administrative & Advisories' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`btn btn-sm py-2 px-3 rounded-pill fw-medium border-0 transition-all ${
                activeFilter === tab.key
                  ? 'btn-primary text-white shadow-sm'
                  : 'text-secondary bg-dark border border-secondary border-opacity-25'
              }`}
              style={{ fontSize: '13px' }}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`badge ms-2 rounded-pill ${
                    activeFilter === tab.key ? 'bg-white text-primary' : 'bg-secondary text-white'
                  }`}
                  style={{ fontSize: '10px' }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List Cards */}
        <div className="d-flex flex-column gap-3">
          {filteredNotifications.length === 0 ? (
            <div
              className="p-5 text-center rounded-4 border border-secondary border-opacity-25 text-secondary"
              style={{ backgroundColor: '#1e293b' }}
            >
              <FaBell style={{ fontSize: '40px', opacity: 0.3 }} className="mb-3" />
              <h5 className="fw-semibold text-white mb-1">No Notifications Found</h5>
              <p className="small mb-0">You have caught up with all alerts under this category.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleOpenDetailModal(notif)}
                className="p-3 p-md-4 rounded-4 text-white shadow-sm transition-all position-relative cursor-pointer"
                style={{
                  backgroundColor: notif.unread ? '#1e293b' : '#141e30',
                  border: notif.unread ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                }}
              >
                <div className="d-flex align-items-start gap-3">
                  {/* Category Icon */}
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: '44px',
                      height: '44px',
                      backgroundColor: `${notif.color}22`,
                      color: notif.color,
                      fontSize: '18px',
                    }}
                  >
                    {notif.icon}
                  </div>

                  {/* Main Details */}
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="badge rounded-pill"
                          style={{ backgroundColor: `${notif.color}22`, color: notif.color, fontSize: '11px' }}
                        >
                          {notif.category}
                        </span>
                        {notif.unread && (
                          <span className="badge rounded-pill bg-danger" style={{ fontSize: '10px' }}>
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-secondary small" style={{ fontSize: '11px' }}>
                        {notif.timestamp}
                      </span>
                    </div>

                    <h6 className="fw-bold text-white mb-1">{notif.title}</h6>
                    <p className="text-secondary small mb-2 text-truncate-2" style={{ lineHeight: '1.5' }}>
                      {notif.description}
                    </p>

                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2 pt-2 border-top border-secondary border-opacity-10">
                      <span className="text-secondary small" style={{ fontSize: '11px' }}>
                        From: <strong className="text-light">{notif.sender}</strong>
                      </span>

                      <div className="d-flex align-items-center gap-2">
                        {notif.actionPath && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-0 px-2 rounded-2 d-flex align-items-center gap-1"
                            style={{ fontSize: '11px', height: '26px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(notif.actionPath);
                            }}
                          >
                            {notif.actionLabel} <FaChevronRight style={{ fontSize: '8px' }} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-secondary p-0"
                          title="Dismiss"
                          onClick={(e) => handleDeleteNotif(notif.id, e)}
                        >
                          <FaTrashAlt style={{ fontSize: '12px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* NOTIFICATION DETAIL MODAL */}
        {selectedNotifModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1050 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div
                className="modal-content border-0 text-white rounded-4 shadow-lg overflow-hidden"
                style={{ backgroundColor: '#1e293b' }}
              >
                {/* Modal Header */}
                <div
                  className="modal-header border-secondary border-opacity-25 p-4"
                  style={{ borderLeft: `6px solid ${selectedNotifModal.color}` }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: `${selectedNotifModal.color}22`,
                        color: selectedNotifModal.color,
                        fontSize: '18px',
                      }}
                    >
                      {selectedNotifModal.icon}
                    </div>
                    <div>
                      <span
                        className="badge rounded-pill mb-1"
                        style={{
                          backgroundColor: `${selectedNotifModal.color}22`,
                          color: selectedNotifModal.color,
                          fontSize: '11px',
                        }}
                      >
                        {selectedNotifModal.category}
                      </span>
                      <h5 className="modal-title fw-bold text-white mb-0">
                        {selectedNotifModal.title}
                      </h5>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedNotifModal(null)}
                  />
                </div>

                {/* Modal Body */}
                <div className="modal-body p-4">
                  {/* Meta Bar */}
                  <div className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-dark border border-secondary border-opacity-25 mb-3 small">
                    <div>
                      <span className="text-secondary">Sender: </span>
                      <strong className="text-white">{selectedNotifModal.sender}</strong>
                    </div>
                    <div className="text-secondary font-monospace" style={{ fontSize: '11px' }}>
                      {selectedNotifModal.date}
                    </div>
                  </div>

                  {/* Announcement Content */}
                  <div className="p-3 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-25 mb-4">
                    <h6 className="text-secondary small fw-bold text-uppercase mb-2">Notice Details</h6>
                    <p className="text-light mb-0" style={{ lineHeight: '1.7', fontSize: '14px' }}>
                      {selectedNotifModal.fullContent}
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-secondary border-opacity-25 p-3 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                    onClick={() => handleDeleteNotif(selectedNotifModal.id)}
                  >
                    <FaTrashAlt /> Delete Alert
                  </button>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedNotifModal(null)}
                    >
                      Close
                    </button>

                    {selectedNotifModal.actionPath && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                        onClick={() => {
                          const path = selectedNotifModal.actionPath;
                          setSelectedNotifModal(null);
                          navigate(path);
                        }}
                      >
                        <FaExternalLinkAlt style={{ fontSize: '11px' }} /> {selectedNotifModal.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentNotifications;
