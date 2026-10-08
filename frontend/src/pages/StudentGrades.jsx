import { useState, useContext } from 'react';
import { AuthContext } from '../context/auth-context';
import AppLayout from '../components/layout/AppLayout';
import { LoadError, Loading } from '../components/PageState';
import useApi from '../services/useApi';
import { formatGrade, gradeSummary, programName } from '../services/academic';
import {
  FaAward,
  FaBook,
  FaChartLine,
  FaFileAlt,
  FaPrint,
  FaCheckCircle,
} from 'react-icons/fa';

const StudentGrades = () => {
  const { user } = useContext(AuthContext);

  // Published grades and class schedule from the backend
  const grades = useApi('/portal/grades', []);
  const schedule = useApi('/portal/schedule', []);

  // Term selection state ('' = most recent term)
  const [term, setTerm] = useState('');

  // Modals state
  const [selectedGradeDetail, setSelectedGradeDetail] = useState(null); // Breakdown modal
  const [showTranscriptModal, setShowTranscriptModal] = useState(false); // Transcript modal

  if (grades.loading || schedule.loading) return <AppLayout title="My Grades"><Loading /></AppLayout>;
  if (grades.error) return <AppLayout title="My Grades"><LoadError message={grades.error} onRetry={grades.reload} /></AppLayout>;

  const termOf = (g) => `${g.semester} ${g.academicYear}`;
  const terms = [...new Set(grades.data.map(termOf))].sort((a, b) =>
    b.slice(-9).localeCompare(a.slice(-9)) || b.localeCompare(a)
  );
  const selectedTerm = term || terms[0] || 'No published grades';
  const instructors = Object.fromEntries(schedule.data.map((c) => [c.subjectCode, c.instructor]));

  const gradesData = grades.data
    .filter((g) => termOf(g) === selectedTerm)
    .map((g) => ({
      code: g.subjectCode,
      title: g.subjectTitle,
      units: g.units,
      midterm: formatGrade(g.midtermGrade),
      final: formatGrade(g.finalGrade),
      grade: formatGrade(g.finalGrade),
      remark: g.remark,
      instructor: instructors[g.subjectCode] || 'Faculty',
    }));

  const summary = gradeSummary(grades.data.filter((g) => termOf(g) === selectedTerm));
  const totalUnits = summary.units;
  const calculatedGPA = formatGrade(summary.gpa);
  const notPassed = gradesData.filter((g) => g.remark !== 'Passed').length;
  const passSummary = !gradesData.length
    ? { text: '', className: '' }
    : notPassed
      ? { text: `● ${notPassed} subject(s) not passed`, className: 'text-danger' }
      : { text: '● All Subjects Passed', className: 'text-success' };
  const profile = user?.profile;
  const remarkBadge = (remark) =>
    remark === 'Passed' ? 'bg-success text-success border-success' : 'bg-danger text-danger border-danger';

  return (
    <AppLayout title="My Grades">
      {/* 1. Header Toolbar: Term Selector & View Transcript Button */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small fw-medium">Academic Term:</span>
            <select
              className="form-select form-select-sm bg-light fw-semibold text-dark border-0"
              style={{ width: '240px' }}
              value={selectedTerm}
              onChange={(e) => setTerm(e.target.value)}
              aria-label="Academic term"
            >
              {terms.length === 0 && <option>{selectedTerm}</option>}
              {terms.map((t, i) => (
                <option key={t} value={t}>
                  {t}
                  {i === 0 ? ' (Latest)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-outline-primary btn-sm rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-2"
            onClick={() => setShowTranscriptModal(true)}
          >
            <FaFileAlt /> Official Transcript of Records
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Term GPA */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-row align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-primary"
              style={{ width: '54px', height: '54px', backgroundColor: '#eff6ff', fontSize: '22px' }}
            >
              <FaChartLine />
            </div>
            <div>
              <span className="text-muted small d-block" style={{ fontSize: '12px' }}>
                Term GPA
              </span>
              <h3 className="fw-bold text-dark mb-0">{calculatedGPA}</h3>
              <span className="text-muted small" style={{ fontSize: '11px' }}>
                Weighted by units
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Units */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-row align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-success"
              style={{ width: '54px', height: '54px', backgroundColor: '#f0fdf4', fontSize: '22px' }}
            >
              <FaBook />
            </div>
            <div>
              <span className="text-muted small d-block" style={{ fontSize: '12px' }}>
                Total Enrolled Units
              </span>
              <h3 className="fw-bold text-dark mb-0">{totalUnits} Units</h3>
              <span className="text-muted small" style={{ fontSize: '11px' }}>
                {gradesData.length} Subjects Evaluated
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: General Standing */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-row align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-warning"
              style={{ width: '54px', height: '54px', backgroundColor: '#fffbeb', fontSize: '22px' }}
            >
              <FaAward />
            </div>
            <div>
              <span className="text-muted small d-block" style={{ fontSize: '12px' }}>
                Academic Status
              </span>
              <h4 className="fw-bold text-dark mb-0">{profile?.academicStatus || '—'}</h4>
              <span className="text-muted small" style={{ fontSize: '11px' }}>
                {profile ? `${profile.yearLevel} • ${profile.section}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Master Subject Grades Table */}
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h6 className="fw-bold text-dark mb-0">Subject Grade Evaluation</h6>
            <span className="text-muted small">Grading Scale: 1.00 (Highest) to 3.00 (Passing) • 5.00 (Failed)</span>
          </div>
          <span className="badge bg-light text-secondary border px-3 py-1 rounded-pill small">
            {selectedTerm}
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light text-muted">
              <tr>
                <th>Subject Code</th>
                <th>Subject Description</th>
                <th className="text-center">Units</th>
                <th className="text-center">Midterm</th>
                <th className="text-center">Final</th>
                <th className="text-center">Final Grade</th>
                <th className="text-center">Remarks</th>
                <th>Instructor</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {gradesData.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No grades have been published for you yet.
                  </td>
                </tr>
              )}
              {gradesData.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <strong className="text-dark font-monospace">{item.code}</strong>
                  </td>
                  <td>
                    <span className="text-dark fw-medium">{item.title}</span>
                  </td>
                  <td className="text-center fw-semibold">{item.units}</td>
                  <td className="text-center text-secondary">{item.midterm}</td>
                  <td className="text-center text-secondary">{item.final}</td>
                  <td className="text-center">
                    <strong className="text-primary fs-6">{item.grade}</strong>
                  </td>
                  <td className="text-center">
                    <span className={`badge bg-opacity-10 border border-opacity-25 px-3 py-1 rounded-pill ${remarkBadge(item.remark)}`}>
                      {item.remark === 'Passed' && <FaCheckCircle style={{ fontSize: '10px' }} />} {item.remark}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '12px' }}>
                    {item.instructor}
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary px-3 py-1 rounded-pill"
                      onClick={() => setSelectedGradeDetail(item)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-light">
                <td colSpan="2" className="text-end fw-bold">
                  Weighted Semester Average (GPA):
                </td>
                <td className="text-center fw-bold">{totalUnits} Units</td>
                <td colSpan="2" />
                <td className="text-center fw-bold text-primary fs-6">{calculatedGPA}</td>
                <td colSpan="3" className={`fw-medium small ${passSummary.className}`}>
                  {passSummary.text}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Subject Grade Details Modal */}
      {selectedGradeDetail && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg text-center p-4">
              <div className="d-flex justify-content-end mb-2">
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedGradeDetail(null)}
                />
              </div>

              <span className="badge bg-dark font-monospace px-3 py-1 rounded-pill mx-auto mb-2">
                {selectedGradeDetail.code}
              </span>
              <h5 className="fw-bold text-dark mb-1">{selectedGradeDetail.title}</h5>
              <p className="text-muted small mb-3">{selectedGradeDetail.instructor}</p>

              <div
                className="py-4 my-2 rounded-4 mx-auto w-100"
                style={{ backgroundColor: '#eff6ff' }}
              >
                <span className="text-muted small text-uppercase tracking-wider d-block mb-1">
                  Final Numerical Grade
                </span>
                <h1 className="fw-bold text-primary display-4 mb-1">
                  {selectedGradeDetail.grade}
                </h1>
                <span className="badge bg-success px-3 py-1 rounded-pill">
                  {selectedGradeDetail.remark}
                </span>
              </div>

              <div className="d-flex justify-content-around py-3 border-top border-bottom my-3 small">
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                    Midterm Exam
                  </span>
                  <strong className="text-dark fs-6">{selectedGradeDetail.midterm}</strong>
                </div>
                <div className="border-start" />
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                    Final Exam
                  </span>
                  <strong className="text-dark fs-6">{selectedGradeDetail.final}</strong>
                </div>
                <div className="border-start" />
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                    Credits
                  </span>
                  <strong className="text-dark fs-6">{selectedGradeDetail.units} Units</strong>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary w-100 rounded-3 py-2 small"
                onClick={() => setSelectedGradeDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Official Transcript of Records Modal */}
      {showTranscriptModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h6 className="modal-title fw-bold text-dark">
                  Official Transcript of Records / Certificate of Grades
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowTranscriptModal(false)}
                />
              </div>

              <div className="modal-body p-4 p-md-5 bg-white">
                <div className="text-center pb-3 border-bottom mb-4">
                  <div className="fs-2 mb-1">🎓</div>
                  <h4 className="fw-bold text-dark mb-0 tracking-wide">EDUTRACK UNIVERSITY</h4>
                  <p className="text-muted small mb-1">
                    Office of the University Registrar • Academic Records Division
                  </p>
                  <span className="badge bg-dark text-white px-3 py-1 text-uppercase tracking-wider">
                    Official Transcript of Records
                  </span>
                </div>

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
                    <strong className="text-dark">
                      {profile ? `${programName(profile.program)} (${profile.program})` : '—'}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Year & Section:</span>{' '}
                    <strong className="text-dark">{profile ? `${profile.yearLevel} • ${profile.section}` : '—'}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Academic Term:</span>{' '}
                    <strong className="text-dark">{selectedTerm}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Academic Status:</span>{' '}
                    <span className="badge bg-secondary">{profile?.academicStatus || '—'}</span>
                  </div>
                </div>

                <div className="table-responsive mb-4">
                  <table className="table table-bordered align-middle small mb-0">
                    <thead className="table-light text-center">
                      <tr>
                        <th>Subject Code</th>
                        <th>Subject Title</th>
                        <th>Units</th>
                        <th>Final Grade</th>
                        <th>Remarks</th>
                        <th>Professor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradesData.map((item, i) => (
                        <tr key={i}>
                          <td className="fw-bold font-monospace text-center">{item.code}</td>
                          <td>{item.title}</td>
                          <td className="text-center">{item.units}</td>
                          <td className="text-center fw-bold">{item.grade}</td>
                          <td className="text-center">
                            <span className={`fw-semibold ${item.remark === 'Passed' ? 'text-success' : 'text-danger'}`}>{item.remark}</span>
                          </td>
                          <td>{item.instructor}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light">
                        <td colSpan="2" className="text-end fw-bold">
                          Cumulative Term GPA:
                        </td>
                        <td className="text-center fw-bold text-dark">{totalUnits}</td>
                        <td className="text-center fw-bold text-primary fs-6">{calculatedGPA}</td>
                        <td colSpan="2" className={`small fw-medium ${passSummary.className}`}>
                          {passSummary.text}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="d-flex justify-content-between pt-4 mt-2 border-top text-center small text-muted">
                  <div>
                    <div className="fw-bold text-dark border-bottom pb-1" style={{ width: '180px' }}>
                      {user?.name}
                    </div>
                    <span>Student's Signature</span>
                  </div>
                  <div>
                    <div className="border-bottom pb-1" style={{ width: '180px', height: '1.6em' }} />
                    <span>University Registrar</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top px-4 py-3 bg-light rounded-bottom-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setShowTranscriptModal(false)}
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

export default StudentGrades;