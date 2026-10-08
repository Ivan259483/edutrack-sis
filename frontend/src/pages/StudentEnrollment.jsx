import React, { useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { LoadError, Loading } from '../components/PageState';
import API, { errorMessage } from '../services/api';
import useApi from '../services/useApi';
import { formatTime, programName } from '../services/academic';

const MAX_UNITS = 24;
import {
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaSearch,
  FaFilter,
  FaPlus,
  FaTrash,
  FaInfoCircle,
  FaFileAlt,
  FaPrint,
  FaTimes,
  FaExclamationTriangle,
  FaTimesCircle,
} from 'react-icons/fa';

const StudentEnrollment = () => {
  const { user } = useContext(AuthContext);

  const [searchParams] = useSearchParams();

  // Catalog (with this section's class times) and current enrollment from the backend
  const catalog = useApi('/portal/subjects', []);
  const current = useApi('/portal/enrollment');

  // Local draft while selecting or revising subjects
  const [draftCodes, setDraftCodes] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Search & Filter State (navbar search lands here with ?search=)
  const urlSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [shownUrlSearch, setShownUrlSearch] = useState(urlSearch);
  if (urlSearch !== shownUrlSearch) {
    // A new navbar search replaces the current filter.
    setShownUrlSearch(urlSearch);
    setSearchTerm(urlSearch);
  }
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals State
  const [detailSubject, setDetailSubject] = useState(null); // Row 3 Modal
  const [showCorModal, setShowCorModal] = useState(false); // Row 4 & 5 Modal

  if (catalog.loading || current.loading) return <AppLayout title="My Enrollment"><Loading /></AppLayout>;
  const loadError = catalog.error || current.error;
  if (loadError) {
    return (
      <AppLayout title="My Enrollment">
        <LoadError message={loadError} onRetry={() => { catalog.reload(); current.reload(); }} />
      </AppLayout>
    );
  }

  const enrollment = current.data.enrollment;
  const period = current.data.period;
  const enrollmentOpen = current.data.enrollmentOpen;
  const periodLabel = `AY ${period.academicYear} • ${period.semester}`;
  // Server status, or 'Draft' while (re)selecting subjects
  const enrollmentStatus = draftCodes || !enrollment ? 'Draft' : enrollment.status;
  const selectedCodes = draftCodes ?? enrollment?.subjects.map((s) => s.code) ?? [];
  const rejectionReason = enrollment?.remarks || '';

  const categoryOf = (code) => (code.startsWith('GE') ? 'General' : code.startsWith('PE') ? 'PE' : 'Major');
  const describeClasses = (classes) =>
    classes.length
      ? classes.map((c) => `${c.day.slice(0, 3)} ${formatTime(c.startTime)} - ${formatTime(c.endTime)}`).join(' / ')
      : 'Schedule to be announced';
  const allAvailableSubjects = catalog.data.map((sub) => ({
    code: sub.code,
    title: sub.title,
    category: categoryOf(sub.code),
    units: sub.units,
    schedule: describeClasses(sub.classes),
    room: [...new Set(sub.classes.map((c) => c.room))].join(', ') || 'TBA',
    professor: [...new Set(sub.classes.map((c) => c.instructor))].join(', ') || 'TBA',
    capacity: sub.classes.length ? 'Offered for your section' : 'Not offered for your section',
    prerequisite: sub.prerequisite
      ? `${sub.prerequisite}${sub.prerequisiteMet ? ' (completed)' : ' (not yet passed)'}`
      : 'None',
    description: sub.description || `${sub.title} (${sub.units} units).`,
    passed: sub.passed,
  }));

  // Filtered Subject List
  const filteredSubjects = allAvailableSubjects.filter((sub) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      sub.code.toLowerCase().includes(term) ||
      sub.title.toLowerCase().includes(term) ||
      sub.professor.toLowerCase().includes(term);
    const matchesCategory =
      selectedCategory === 'All' || sub.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Selected subjects objects
  const selectedSubjectsList = allAvailableSubjects.filter((sub) =>
    selectedCodes.includes(sub.code)
  );
  const totalUnits = selectedSubjectsList.reduce((acc, sub) => acc + sub.units, 0);

  // Subject Selection Toggles
  const handleToggleSubject = (code) => {
    if (enrollmentStatus !== 'Draft') return;
    setActionError('');
    if (selectedCodes.includes(code)) {
      setDraftCodes(selectedCodes.filter((c) => c !== code));
    } else if (allAvailableSubjects.find((s) => s.code === code)?.passed) {
      setActionError(`You have already passed ${code}.`);
    } else if (totalUnits + (allAvailableSubjects.find((s) => s.code === code)?.units || 0) > MAX_UNITS) {
      setActionError(`You can enroll in at most ${MAX_UNITS} units.`);
    } else {
      setDraftCodes([...selectedCodes, code]);
    }
  };

  // Submit Enrollment (POST /api/portal/enrollment)
  const handleSubmitEnrollment = async () => {
    if (selectedCodes.length === 0) {
      setActionError('Please select at least one subject before submitting.');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      const { data } = await API.post('/portal/enrollment', { subjectCodes: selectedCodes });
      current.setData({ ...current.data, enrollment: data });
      setDraftCodes(null);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Withdraw a pending request (DELETE /api/portal/enrollment)
  const handleWithdrawEnrollment = async () => {
    if (!window.confirm('Withdraw your pending enrollment request?')) return;
    setSubmitting(true);
    setActionError('');
    try {
      await API.delete('/portal/enrollment');
      setDraftCodes(selectedCodes);
      current.reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Resubmit if Rejected
  const handleReviseEnrollment = () => {
    setDraftCodes(selectedCodes);
  };

  return (
    <AppLayout title="My Enrollment">
      {!enrollmentOpen && enrollmentStatus === 'Draft' && (
        <div className="alert alert-secondary rounded-4 small" role="status">
          Enrollment for {periodLabel} is currently closed by the Registrar.
        </div>
      )}
      {actionError && (
        <div className="alert alert-danger rounded-4 small" role="alert">
          {actionError}
        </div>
      )}

      {/* 1. Dynamic Status Banner (Approved, Pending, or Rejected) */}
      {enrollmentStatus === 'Approved' && (
        <div
          className="card border-0 rounded-4 shadow-sm mb-4 text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
          }}
        >
          <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-white bg-opacity-20 d-flex align-items-center justify-content-center text-white flex-shrink-0"
                style={{ width: '48px', height: '48px', fontSize: '24px' }}
              >
                <FaCheckCircle />
              </div>
              <div>
                <h5 className="fw-bold mb-1">Your enrollment has been approved!</h5>
                <p className="text-white text-opacity-75 mb-0 small">
                  Total Units: <strong>{totalUnits} Units</strong> • {selectedSubjectsList.length} Subjects • {periodLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-light text-success fw-semibold px-4 py-2 rounded-3 shadow-sm d-flex align-items-center gap-2"
              onClick={() => setShowCorModal(true)}
            >
              <FaFileAlt /> View Official COR
            </button>
          </div>
        </div>
      )}

      {enrollmentStatus === 'Pending' && (
        <div className="card border-0 rounded-4 shadow-sm mb-4 bg-warning bg-opacity-10 border-warning border-opacity-50">
          <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px', fontSize: '22px' }}
              >
                <FaClock />
              </div>
              <div>
                <h5 className="fw-bold text-dark mb-1">Your enrollment application is pending review</h5>
                <p className="text-muted mb-0 small">
                  The Office of the Registrar is evaluating your subjects and prerequisites. You will be notified once approved.
                </p>
              </div>
            </div>
            <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-semibold">
              ● Pending Approval
            </span>
          </div>
        </div>
      )}

      {enrollmentStatus === 'Rejected' && (
        <div className="card border-0 rounded-4 shadow-sm mb-4 bg-danger bg-opacity-10 border-danger border-opacity-50">
          <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '48px', height: '48px', fontSize: '22px' }}
              >
                <FaTimesCircle />
              </div>
              <div>
                <h5 className="fw-bold text-danger mb-1">Enrollment Application Returned / Rejected</h5>
                <p className="text-dark mb-0 small">
                  <strong>Registrar Remarks:</strong> {rejectionReason || 'Please review your subjects.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-sm px-4 py-2 rounded-3 fw-semibold"
              onClick={handleReviseEnrollment}
            >
              Revise & Resubmit
            </button>
          </div>
        </div>
      )}

      {/* 2. Main 2-Column Interface (Matching Row 1 & 2 of prototype) */}
      <div className="row g-4">
        {/* Left Column: Subject Catalog */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            {/* Search & Category Filter Toolbar */}
            <div className="row g-3 mb-4 align-items-center">
              <div className="col-md-7">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search by code, title, or professor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Dropdown (Row 2 of screenshot) */}
              <div className="col-md-5">
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">
                    <FaFilter />
                  </span>
                  <select
                    className="form-select bg-light"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="All">All Categories ({allAvailableSubjects.length})</option>
                    <option value="Major">Major Subjects</option>
                    <option value="General">General Education</option>
                    <option value="PE">Physical Education</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Subject Cards List */}
            <div className="d-flex flex-column gap-3">
              {filteredSubjects.map((sub) => {
                const isSelected = selectedCodes.includes(sub.code);

                return (
                  <div
                    key={sub.code}
                    className="p-3 rounded-3 border d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 transition-all"
                    style={{
                      backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                      borderLeft: `4px solid ${
                        sub.category === 'Major' ? '#3b82f6' : sub.category === 'PE' ? '#f59e0b' : '#10b981'
                      } !important`,
                    }}
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className="badge bg-dark text-white font-monospace">{sub.code}</span>
                        <span
                          className={`badge ${
                            sub.category === 'Major'
                              ? 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'
                              : sub.category === 'PE'
                              ? 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25'
                              : 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'
                          }`}
                        >
                          {sub.category}
                        </span>
                        <strong className="text-dark">{sub.title}</strong>
                      </div>

                      <div className="d-flex flex-wrap gap-3 text-secondary small mt-2" style={{ fontSize: '12px' }}>
                        <span>
                          <FaChalkboardTeacher className="text-muted me-1" />
                          {sub.professor}
                        </span>
                        <span>
                          <FaClock className="text-muted me-1" />
                          {sub.schedule}
                        </span>
                        <span>
                          <FaMapMarkerAlt className="text-muted me-1" />
                          {sub.room}
                        </span>
                        <span>• {sub.units} Units</span>
                      </div>
                    </div>

                    {/* Actions: Details Modal Button + Add/Remove */}
                    <div className="d-flex align-items-center gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary px-3 py-1 rounded-pill small"
                        onClick={() => setDetailSubject(sub)}
                      >
                        Details
                      </button>

                      {isSelected && enrollmentStatus === 'Approved' ? (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill small">
                          ✓ Enrolled
                        </span>
                      ) : isSelected && enrollmentStatus === 'Pending' ? (
                        <span className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-25 px-3 py-2 rounded-pill small">
                          Selected
                        </span>
                      ) : isSelected ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger px-3 py-1 rounded-pill small d-flex align-items-center gap-1"
                          onClick={() => handleToggleSubject(sub.code)}
                        >
                          <FaTrash style={{ fontSize: '10px' }} /> Remove
                        </button>
                      ) : sub.passed ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success px-3 py-1 rounded-pill small"
                          disabled
                          title="You already passed this subject"
                        >
                          ✓ Passed
                        </button>
                      ) : enrollmentStatus === 'Draft' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary px-3 py-1 rounded-pill small d-flex align-items-center gap-1"
                          onClick={() => handleToggleSubject(sub.code)}
                        >
                          <FaPlus style={{ fontSize: '10px' }} /> Add
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Subjects Sidebar (Matching Screenshot) */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white sticky-top" style={{ top: '88px' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold text-dark mb-0">Selected Subjects</h6>
              <span className="badge bg-primary text-white rounded-pill px-2 py-1">
                {selectedSubjectsList.length} subjects • {totalUnits} units
              </span>
            </div>

            {/* Progress bar of Max Load */}
            <div className="mb-3">
              <div className="d-flex justify-content-between text-muted small mb-1" style={{ fontSize: '11px' }}>
                <span>Unit Capacity Load</span>
                <span>{totalUnits} / {MAX_UNITS} Max Units</span>
              </div>
              <div className="progress" style={{ height: '6px' }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{ width: `${Math.min(100, (totalUnits / MAX_UNITS) * 100)}%` }}
                />
              </div>
            </div>

            {/* Selected List */}
            <div className="d-flex flex-column gap-2 mb-4 overflow-y-auto" style={{ maxHeight: '280px' }}>
              {selectedSubjectsList.map((sub) => (
                <div
                  key={sub.code}
                  className="p-2 px-3 rounded-2 bg-light border d-flex justify-content-between align-items-center small"
                >
                  <div>
                    <strong className="text-dark font-monospace d-block">{sub.code}</strong>
                    <span className="text-muted text-truncate d-block" style={{ maxWidth: '160px', fontSize: '11px' }}>
                      {sub.title}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-secondary text-white">{sub.units} u</span>
                    {enrollmentStatus === 'Draft' && (
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0 ms-2"
                        onClick={() => handleToggleSubject(sub.code)}
                        title="Remove"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Submit Button */}
            {enrollmentStatus === 'Draft' && (
              <button
                type="button"
                className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm"
                onClick={handleSubmitEnrollment}
                disabled={submitting || !enrollmentOpen}
              >
                {submitting ? 'Submitting…' : enrollment?.status === 'Pending' ? 'Save Revised Application' : 'Submit Enrollment Application'}
              </button>
            )}

            {enrollmentStatus === 'Pending' && (
              <div className="d-flex flex-column gap-2">
                <button type="button" className="btn btn-warning w-100 py-2 rounded-3 fw-semibold" disabled>
                  Pending Registrar Approval
                </button>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" onClick={handleReviseEnrollment} disabled={submitting || !enrollmentOpen}>
                    Edit Subjects
                  </button>
                  <button type="button" className="btn btn-outline-danger btn-sm flex-fill" onClick={handleWithdrawEnrollment} disabled={submitting}>
                    Withdraw Request
                  </button>
                </div>
              </div>
            )}

            {enrollmentStatus === 'Approved' && (
              <button
                type="button"
                className="btn btn-success w-100 py-2 rounded-3 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                onClick={() => setShowCorModal(true)}
              >
                <FaFileAlt /> View / Download Official COR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Subject Detail Modal (Row 3 in Prototype Screenshot!) */}
      {detailSubject && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h6 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <span className="badge bg-dark font-monospace">{detailSubject.code}</span>
                  {detailSubject.title}
                </h6>
                <button type="button" className="btn-close" onClick={() => setDetailSubject(null)} />
              </div>

              <div className="modal-body p-4 small">
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Subject Code
                    </span>
                    <strong className="text-dark">{detailSubject.code}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Credit Units
                    </span>
                    <strong className="text-primary">{detailSubject.units} Academic Units</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Category
                    </span>
                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
                      {detailSubject.category}
                    </span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Instructor
                    </span>
                    <strong className="text-dark">{detailSubject.professor}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Class Schedule
                    </span>
                    <span className="text-dark fw-medium">{detailSubject.schedule}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Room Assignment
                    </span>
                    <span className="text-dark fw-medium">{detailSubject.room}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Class Capacity
                    </span>
                    <span className="badge bg-secondary text-white">{detailSubject.capacity}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                      Prerequisite
                    </span>
                    <strong className="text-danger">{detailSubject.prerequisite}</strong>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted d-block fw-semibold mb-1" style={{ fontSize: '11px' }}>
                    Course Description
                  </span>
                  <p className="text-secondary mb-0" style={{ lineHeight: '1.5' }}>
                    {detailSubject.description}
                  </p>
                </div>
              </div>

              <div className="modal-footer border-top px-4 py-2 bg-light rounded-bottom-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-4"
                  onClick={() => setDetailSubject(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Official Certificate of Registration Modal (Rows 4 & 5 in Prototype Screenshot!) */}
      {showCorModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h6 className="modal-title fw-bold text-dark">
                  Official Certificate of Registration (COR)
                </h6>
                <button type="button" className="btn-close" onClick={() => setShowCorModal(false)} />
              </div>

              <div className="modal-body p-4 p-md-5 bg-white">
                {/* University Brand Header */}
                <div className="text-center pb-3 border-bottom mb-4">
                  <div className="fs-2 mb-1">🎓</div>
                  <h4 className="fw-bold text-dark mb-0 tracking-wide">EDUTRACK UNIVERSITY</h4>
                  <p className="text-muted small mb-1">
                    Office of the University Registrar • Student Records Division
                  </p>
                  <span className="badge bg-dark text-white px-3 py-1 text-uppercase tracking-wider">
                    Official Certificate of Registration
                  </span>
                </div>

                {/* Student Info Box */}
                <div className="row g-2 mb-4 small bg-light p-3 rounded-3 border">
                  <div className="col-sm-6">
                    <span className="text-muted">Student Name:</span>{' '}
                    <strong className="text-dark">{user?.name}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Student ID:</span>{' '}
                    <strong className="text-dark">{user?.studentId}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Degree Program:</span>{' '}
                    <strong className="text-dark">{programName(enrollment?.program)} ({enrollment?.program})</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Year & Section:</span>{' '}
                    <strong className="text-dark">{enrollment?.yearLevel} • {enrollment?.section}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Academic Term:</span>{' '}
                    <strong className="text-dark">{periodLabel}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Status:</span>{' '}
                    <span className="badge bg-success">OFFICIALLY ENROLLED</span>
                  </div>
                </div>

                {/* Official Subject Schedule Table */}
                <div className="table-responsive mb-4">
                  <table className="table table-bordered align-middle small mb-0">
                    <thead className="table-light text-center">
                      <tr>
                        <th>Subject Code</th>
                        <th>Subject Title</th>
                        <th>Units</th>
                        <th>Schedule</th>
                        <th>Room</th>
                        <th>Professor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubjectsList.map((sub, i) => (
                        <tr key={i}>
                          <td className="fw-bold font-monospace text-center">{sub.code}</td>
                          <td>{sub.title}</td>
                          <td className="text-center fw-bold">{sub.units}</td>
                          <td>{sub.schedule}</td>
                          <td className="text-center">{sub.room}</td>
                          <td>{sub.professor}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light">
                        <td colSpan="2" className="text-end fw-bold">
                          Total Academic Units:
                        </td>
                        <td className="text-center fw-bold text-primary">{totalUnits}</td>
                        <td colSpan="3" className="text-muted small">
                          Tuition Assessment: Free Higher Education (RA 10931) • Fully Subsidized
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures & Seal */}
                <div className="d-flex justify-content-between pt-4 mt-2 border-top text-center small text-muted">
                  <div>
                    <div className="fw-bold text-dark border-bottom pb-1" style={{ width: '180px' }}>
                      {user?.name}
                    </div>
                    <span>Student's Signature</span>
                  </div>
                  <div>
                    <div className="fw-bold text-dark border-bottom pb-1" style={{ width: '180px' }}>
                      Dr. Maria Santos
                    </div>
                    <span>University Registrar</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top px-4 py-3 bg-light rounded-bottom-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setShowCorModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4 fw-semibold d-flex align-items-center gap-2"
                  onClick={() => window.print()}
                >
                  <FaPrint /> Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default StudentEnrollment;