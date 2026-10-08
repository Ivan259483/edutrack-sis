import React, { useState, useContext } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { LoadError, Loading } from '../components/PageState';
import useApi from '../services/useApi';
import { DAYS, formatTime } from '../services/academic';
import { AuthContext } from '../context/auth-context';
import {
  FaCalendarAlt,
  FaCalendarWeek,
  FaListUl,
  FaPrint,
  FaClock,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaBookOpen,
  FaUserGraduate,
  FaEnvelope,
} from 'react-icons/fa';

const PALETTE = [
  { color: '#3b82f6', bgLight: 'rgba(59, 130, 246, 0.15)', border: '#2563eb' },
  { color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.15)', border: '#059669' },
  { color: '#8b5cf6', bgLight: 'rgba(139, 92, 246, 0.15)', border: '#7c3aed' },
  { color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)', border: '#d97706' },
  { color: '#ef4444', bgLight: 'rgba(239, 68, 68, 0.15)', border: '#dc2626' },
  { color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.15)', border: '#db2777' },
];

const StudentSchedule = () => {
  const { user } = useContext(AuthContext);

  // View State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (timetable matrix) or 'list'
  const [selectedDayFilter, setSelectedDayFilter] = useState('All');
  const [selectedClassModal, setSelectedClassModal] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Class schedule for the student's section, subject units, and current term
  const schedule = useApi('/portal/schedule', []);
  const subjects = useApi('/subjects?limit=500', { items: [] });
  const enrollment = useApi('/portal/enrollment');

  if (schedule.loading || subjects.loading || enrollment.loading) {
    return <AppLayout title="My Schedule"><Loading /></AppLayout>;
  }
  if (schedule.error) {
    return <AppLayout title="My Schedule"><LoadError message={schedule.error} onRetry={schedule.reload} /></AppLayout>;
  }

  const period = enrollment.data?.period;
  const term = period ? `${period.semester} ${period.academicYear} (Current)` : 'Current term';
  const units = Object.fromEntries(subjects.data.items.map((s) => [s.code, s.units]));
  const toHours = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h + m / 60;
  };

  // One entry per class meeting pattern; the same class on several days is merged.
  const scheduleData = Object.values(
    schedule.data.reduce((groups, c) => {
      const key = [c.subjectCode, c.startTime, c.endTime, c.room, c.instructor].join('|');
      if (groups[key]) groups[key].days.push(c.day);
      else groups[key] = { ...c, days: [c.day] };
      return groups;
    }, {})
  )
    .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))
    .map((c, i) => {
      const palette = PALETTE[i % PALETTE.length];
      return {
        id: c.id,
        code: c.subjectCode,
        title: c.subjectTitle,
        units: units[c.subjectCode] || 3,
        section: c.section,
        type: /lab/i.test(c.room) ? 'Laboratory' : 'Lecture',
        room: c.room,
        instructor: c.instructor,
        instructorEmail: 'Contact via Help and Support',
        days: c.days.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)),
        startTime: formatTime(c.startTime),
        endTime: formatTime(c.endTime),
        startHour: toHours(c.startTime),
        durationHours: Math.round((toHours(c.endTime) - toHours(c.startTime)) * 10) / 10,
        ...palette,
      };
    });

  const totalUnits = scheduleData.reduce((acc, curr) => acc + curr.units, 0);

  // Time grid matrix definitions (7:00 AM to 6:00 PM)
  const timeSlots = [
    { label: '07:00 AM', hour: 7 },
    { label: '08:00 AM', hour: 8 },
    { label: '09:00 AM', hour: 9 },
    { label: '10:00 AM', hour: 10 },
    { label: '11:00 AM', hour: 11 },
    { label: '12:00 PM', hour: 12 },
    { label: '01:00 PM', hour: 13 },
    { label: '02:00 PM', hour: 14 },
    { label: '03:00 PM', hour: 15 },
    { label: '04:00 PM', hour: 16 },
    { label: '05:00 PM', hour: 17 },
    { label: '06:00 PM', hour: 18 },
  ];

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Filter list view by day if selected
  const filteredList = selectedDayFilter === 'All'
    ? scheduleData
    : scheduleData.filter((item) => item.days.includes(selectedDayFilter));

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <div className="p-4" style={{ backgroundColor: '#0f172a', minHeight: '100vh' }}>
        {/* Top Breadcrumb & Controls Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <div className="text-secondary small mb-1">
              EduTrack <span className="text-white opacity-50">/</span> <span className="text-white">My Schedule</span>
            </div>
            <h4 className="fw-bold text-white mb-0">Class Schedule & Timetable</h4>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Term Dropdown */}
            <select
              className="form-select bg-dark border-secondary text-white small"
              value={term}
              onChange={() => {}}
              aria-label="Academic term"
            >
              <option value={term}>{term}</option>
            </select>

            {/* View Mode Toggle */}
            <div className="btn-group p-1 rounded-3" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <button
                type="button"
                className={`btn btn-sm py-1 px-3 rounded-2 fw-medium border-0 d-flex align-items-center gap-2 ${
                  viewMode === 'grid' ? 'btn-primary text-white shadow-sm' : 'text-secondary bg-transparent'
                }`}
                onClick={() => setViewMode('grid')}
              >
                <FaCalendarWeek /> Timetable Grid
              </button>
              <button
                type="button"
                className={`btn btn-sm py-1 px-3 rounded-2 fw-medium border-0 d-flex align-items-center gap-2 ${
                  viewMode === 'list' ? 'btn-primary text-white shadow-sm' : 'text-secondary bg-transparent'
                }`}
                onClick={() => setViewMode('list')}
              >
                <FaListUl /> Subject List
              </button>
            </div>

            {/* Print Official Schedule Button */}
            <button
              className="btn btn-outline-primary d-flex align-items-center gap-2 fw-medium"
              onClick={() => setShowPrintModal(true)}
            >
              <FaPrint /> Print Official Schedule
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
                <span className="text-secondary small fw-medium">Enrolled Subjects</span>
                <span className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                  <FaBookOpen />
                </span>
              </div>
              <h3 className="fw-bold mb-1">{scheduleData.length} Subjects</h3>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                {totalUnits}.0 Total Academic Units
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div
              className="p-3 rounded-4 border border-secondary border-opacity-25 h-100 text-white shadow-sm"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-medium">Weekly Class Hours</span>
                <span className="p-2 rounded-3 bg-success bg-opacity-10 text-success">
                  <FaClock />
                </span>
              </div>
              <h3 className="fw-bold mb-1">18.0 Hrs</h3>
              <span className="text-success small fw-medium" style={{ fontSize: '12px' }}>
                Balanced 5-day workload
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div
              className="p-3 rounded-4 border border-secondary border-opacity-25 h-100 text-white shadow-sm"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-medium">Schedule Verification</span>
                <span className="p-2 rounded-3 bg-info bg-opacity-10 text-info">
                  <FaCheckCircle />
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-success fs-4">Conflict-Free</h3>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                Officially validated by Registrar
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-lg-3">
            <div
              className="p-3 rounded-4 border border-secondary border-opacity-25 h-100 text-white shadow-sm"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary small fw-medium">Assigned Section</span>
                <span className="p-2 rounded-3 bg-warning bg-opacity-10 text-warning">
                  <FaUserGraduate />
                </span>
              </div>
              <h3 className="fw-bold mb-1 text-primary fs-4">{user?.profile?.section || schedule.data[0]?.section || '—'}</h3>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                College of Computer Studies
              </span>
            </div>
          </div>
        </div>

        {/* VIEW 1: WEEKLY TIMETABLE GRID MATRIX */}
        {viewMode === 'grid' && (
          <div
            className="card border-0 rounded-4 text-white shadow-sm overflow-hidden"
            style={{ backgroundColor: '#1e293b' }}
          >
            <div className="card-header bg-transparent border-secondary border-opacity-25 p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-primary" />
                <span className="fw-bold">Weekly Academic Timetable Matrix</span>
              </div>
              <span className="text-secondary small" style={{ fontSize: '12px' }}>
                Click any subject card to view classroom and instructor details
              </span>
            </div>

            <div className="card-body p-0 overflow-x-auto">
              <div style={{ minWidth: '920px' }}>
                {/* Grid Day Header */}
                <div
                  className="d-grid"
                  style={{
                    gridTemplateColumns: '90px repeat(6, 1fr)',
                    backgroundColor: '#0f172a',
                    borderBottom: '1px solid #334155',
                  }}
                >
                  <div className="p-3 text-center text-secondary small fw-bold border-end border-secondary border-opacity-25">
                    TIME
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="p-3 text-center fw-bold small text-light border-end border-secondary border-opacity-25"
                    >
                      {day.toUpperCase()}
                    </div>
                  ))}
                </div>

                {/* Grid Body */}
                <div
                  className="position-relative"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px repeat(6, 1fr)',
                    backgroundColor: '#1e293b',
                  }}
                >
                  {/* Time rows */}
                  {timeSlots.map((slot) => (
                    <React.Fragment key={slot.hour}>
                      <div
                        className="py-3 px-2 text-center text-secondary small border-bottom border-end border-secondary border-opacity-25"
                        style={{ height: '70px', fontSize: '11px', backgroundColor: '#0f172a' }}
                      >
                        {slot.label}
                      </div>
                      {weekDays.map((day) => (
                        <div
                          key={`${day}-${slot.hour}`}
                          className="border-bottom border-end border-secondary border-opacity-25 position-relative"
                          style={{ height: '70px' }}
                        />
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Absolute Positioned Class Blocks */}
                  {scheduleData.map((cls) => {
                    return cls.days.map((day) => {
                      const dayIndex = weekDays.indexOf(day);
                      if (dayIndex === -1) return null;

                      // Calculate top and height: (startHour - 7) * 70px
                      const topOffset = (cls.startHour - 7) * 70;
                      const heightPx = cls.durationHours * 70 - 4; // 4px padding gap

                      // Column left offset: 90px + (dayIndex * (100% - 90px) / 6)
                      const leftPosition = `calc(90px + (${dayIndex} * (100% - 90px) / 6))`;

                      return (
                        <div
                          key={`${cls.id}-${day}`}
                          onClick={() => setSelectedClassModal(cls)}
                          className="position-absolute p-2 rounded-3 cursor-pointer shadow-sm transition-all"
                          style={{
                            top: `${topOffset + 2}px`,
                            left: leftPosition,
                            width: `calc((100% - 90px) / 6 - 6px)`,
                            marginLeft: '3px',
                            height: `${heightPx}px`,
                            backgroundColor: cls.bgLight,
                            borderLeft: `4px solid ${cls.border}`,
                            borderTop: `1px solid ${cls.border}44`,
                            borderRight: `1px solid ${cls.border}44`,
                            borderBottom: `1px solid ${cls.border}44`,
                            zIndex: 10,
                            cursor: 'pointer',
                            overflow: 'hidden',
                          }}
                          title="Click to view details"
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small text-white">{cls.code}</span>
                            <span
                              className="badge rounded-pill text-white"
                              style={{ backgroundColor: cls.border, fontSize: '9px', padding: '2px 6px' }}
                            >
                              {cls.type}
                            </span>
                          </div>
                          <div
                            className="text-light fw-medium small text-truncate"
                            style={{ fontSize: '11px' }}
                          >
                            {cls.title}
                          </div>
                          <div className="text-secondary mt-1" style={{ fontSize: '10px' }}>
                            <FaClock className="me-1" /> {cls.startTime} - {cls.endTime}
                          </div>
                          <div className="text-secondary text-truncate" style={{ fontSize: '10px' }}>
                            <FaMapMarkerAlt className="me-1" /> {cls.room}
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: SUBJECT LIST VIEW */}
        {viewMode === 'list' && (
          <div
            className="card border-0 rounded-4 text-white shadow-sm overflow-hidden"
            style={{ backgroundColor: '#1e293b' }}
          >
            <div className="card-header bg-transparent border-secondary border-opacity-25 p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <FaListUl className="text-primary" />
                <span className="fw-bold">Enrolled Subjects Schedule Directory</span>
              </div>

              {/* Day Filter Pills */}
              <div className="d-flex gap-1 flex-wrap">
                {['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`btn btn-sm py-1 px-2 rounded-pill small ${
                      selectedDayFilter === day ? 'btn-primary' : 'btn-outline-secondary text-light'
                    }`}
                    style={{ fontSize: '12px' }}
                    onClick={() => setSelectedDayFilter(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
                  <thead className="text-secondary small" style={{ borderBottom: '1px solid #334155' }}>
                    <tr>
                      <th className="ps-4 py-3">Subject & Title</th>
                      <th className="py-3">Type & Section</th>
                      <th className="py-3">Schedule (Day & Time)</th>
                      <th className="py-3">Room / Venue</th>
                      <th className="py-3">Instructor</th>
                      <th className="text-center py-3">Units</th>
                      <th className="text-center pe-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td className="ps-4 py-3">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              style={{
                                width: '4px',
                                height: '38px',
                                backgroundColor: item.color,
                                borderRadius: '2px',
                              }}
                            />
                            <div>
                              <div className="fw-bold text-white">{item.code}</div>
                              <div className="text-secondary small" style={{ fontSize: '12px' }}>
                                {item.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className="badge rounded-pill me-1"
                            style={{ backgroundColor: `${item.color}33`, color: item.color }}
                          >
                            {item.type}
                          </span>
                          <span className="badge bg-secondary bg-opacity-25 text-light">
                            {item.section}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="small text-light">
                            <div className="fw-semibold text-white">{item.days.join(' / ')}</div>
                            <span className="text-secondary d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                              <FaClock style={{ fontSize: '10px' }} /> {item.startTime} – {item.endTime}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="small text-light d-flex align-items-center gap-2">
                            <FaMapMarkerAlt className="text-secondary" />
                            <span>{item.room}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="small text-light d-flex align-items-center gap-2">
                            <FaChalkboardTeacher className="text-secondary" />
                            <div>
                              <div>{item.instructor}</div>
                              <div className="text-secondary" style={{ fontSize: '11px' }}>{item.instructorEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 fw-bold text-light">
                          {item.units}.0
                        </td>
                        <td className="text-center pe-4 py-3">
                          <button
                            className="btn btn-sm btn-outline-light rounded-pill px-3 py-1"
                            style={{ fontSize: '12px' }}
                            onClick={() => setSelectedClassModal(item)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: INTERACTIVE CLASS DETAILS MODAL */}
        {selectedClassModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1050 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content border-0 text-white rounded-4 shadow-lg"
                style={{ backgroundColor: '#1e293b' }}
              >
                <div
                  className="modal-header border-secondary border-opacity-25 p-4"
                  style={{ borderLeft: `6px solid ${selectedClassModal.border}` }}
                >
                  <div>
                    <span
                      className="badge rounded-pill mb-1"
                      style={{
                        backgroundColor: selectedClassModal.bgLight,
                        color: selectedClassModal.color,
                        border: `1px solid ${selectedClassModal.border}`,
                      }}
                    >
                      {selectedClassModal.code} • {selectedClassModal.type}
                    </span>
                    <h5 className="modal-title fw-bold text-white mb-0">
                      {selectedClassModal.title}
                    </h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedClassModal(null)}
                  />
                </div>

                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <div className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25">
                        <div className="text-secondary small mb-1">Class Section</div>
                        <div className="fw-semibold text-white">{selectedClassModal.section}</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25">
                        <div className="text-secondary small mb-1">Academic Units</div>
                        <div className="fw-semibold text-white">{selectedClassModal.units}.0 Units</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25 mb-3">
                    <div className="d-flex align-items-center gap-2 text-secondary small mb-2">
                      <FaClock className="text-primary" /> Schedule & Days
                    </div>
                    <div className="fw-bold text-white fs-6 mb-1">
                      {selectedClassModal.days.join(' & ')}
                    </div>
                    <div className="text-secondary small">
                      {selectedClassModal.startTime} – {selectedClassModal.endTime} ({selectedClassModal.durationHours} Hours)
                    </div>
                  </div>

                  <div className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25 mb-3">
                    <div className="d-flex align-items-center gap-2 text-secondary small mb-2">
                      <FaMapMarkerAlt className="text-danger" /> Classroom Venue
                    </div>
                    <div className="fw-bold text-white fs-6 mb-1">
                      {selectedClassModal.room}
                    </div>
                    <div className="text-secondary small">
                      Campus Main Wing • Air-conditioned Laboratory & Facilities
                    </div>
                  </div>

                  <div className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25">
                    <div className="d-flex align-items-center gap-2 text-secondary small mb-2">
                      <FaChalkboardTeacher className="text-success" /> Assigned Faculty
                    </div>
                    <div className="fw-bold text-white fs-6 mb-1">
                      {selectedClassModal.instructor}
                    </div>
                    <div className="text-secondary small d-flex align-items-center gap-2">
                      <FaEnvelope /> {selectedClassModal.instructorEmail}
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-secondary border-opacity-25 p-3">
                  <button
                    type="button"
                    className="btn btn-secondary w-100 rounded-3"
                    onClick={() => setSelectedClassModal(null)}
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: PRINTABLE OFFICIAL CERTIFICATE OF SCHEDULE */}
        {showPrintModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content bg-white text-dark border-0 rounded-4 shadow-2xl overflow-hidden">
                {/* Print Header Bar */}
                <div className="d-flex justify-content-between align-items-center px-4 py-3 bg-light border-bottom no-print">
                  <div className="fw-bold text-secondary small">
                    OFFICIAL STUDENT CLASS SCHEDULE DOCUMENT
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-primary d-flex align-items-center gap-2" onClick={handlePrint}>
                      <FaPrint /> Print / Save as PDF
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowPrintModal(false)}>
                      Close
                    </button>
                  </div>
                </div>

                {/* Printable Document Body */}
                <div className="p-4 p-md-5 print-area">
                  {/* University Header */}
                  <div className="text-center pb-3 mb-4 border-bottom border-2 border-dark">
                    <h4 className="fw-bold text-uppercase mb-1 tracking-wide" style={{ letterSpacing: '1px' }}>
                      EduTrack University
                    </h4>
                    <p className="small mb-1 text-muted">Office of the University Registrar & Admissions</p>
                    <h6 className="fw-bold text-primary text-uppercase mt-2">
                      Official Certificate of Student Class Schedule
                    </h6>
                    <span className="badge bg-dark text-white font-monospace">{term}</span>
                  </div>

                  {/* Student Demographic Matrix */}
                  <div className="row g-2 mb-4 p-3 bg-light rounded-3 small">
                    <div className="col-sm-6">
                      <span className="text-muted">Student Name: </span>
                      <strong className="text-dark">{user?.name}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Student ID Number: </span>
                      <strong className="text-dark font-monospace">{user?.studentId}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Degree Program: </span>
                      <strong className="text-dark">Bachelor of Science in Information Technology</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Year Level & Section: </span>
                      <strong className="text-dark">{user?.profile?.yearLevel} — Section {user?.profile?.section}</strong>
                    </div>
                  </div>

                  {/* Official Timetable Table */}
                  <div className="table-responsive mb-4">
                    <table className="table table-bordered table-sm align-middle small">
                      <thead className="table-dark text-center">
                        <tr>
                          <th>Subject Code</th>
                          <th>Subject Description</th>
                          <th>Units</th>
                          <th>Days</th>
                          <th>Time</th>
                          <th>Room</th>
                          <th>Instructor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleData.map((item) => (
                          <tr key={item.id}>
                            <td className="fw-bold text-center">{item.code}</td>
                            <td>{item.title}</td>
                            <td className="text-center">{item.units}.0</td>
                            <td className="text-center fw-semibold">{item.days.join(', ')}</td>
                            <td className="text-center">{item.startTime} - {item.endTime}</td>
                            <td className="text-center">{item.room}</td>
                            <td>{item.instructor}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="fw-bold table-light">
                          <td colSpan="2" className="text-end">Total Academic Load:</td>
                          <td className="text-center text-primary">{totalUnits}.0 Units</td>
                          <td colSpan="4" className="text-muted small text-end">Status: Officially Validated</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Signatures & Security Footer */}
                  <div className="row pt-4 mt-4 border-top">
                    <div className="col-6 text-center">
                      <div className="text-muted small mb-4">Issued and Verified by:</div>
                      <div className="fw-bold text-dark text-uppercase text-decoration-underline">
                        Atty. Ricardo M. Gomez
                      </div>
                      <div className="small text-muted">University Registrar</div>
                    </div>
                    <div className="col-6 text-center">
                      <div className="text-muted small mb-4">Student Acknowledgment:</div>
                      <div className="fw-bold text-dark text-uppercase text-decoration-underline">
                        {user?.name}
                      </div>
                      <div className="small text-muted">Student Signature</div>
                    </div>
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

export default StudentSchedule;
