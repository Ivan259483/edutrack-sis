import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { LoadError, Loading } from '../components/PageState';
import useApi from '../services/useApi';
import { formatGrade, formatTime, gradeSummary, programName, todayName } from '../services/academic';
import {
  FaChartLine,
  FaBook,
  FaGraduationCap,
  FaAward,
  FaClock,
  FaArrowRight,
} from 'react-icons/fa';

const TOTAL_UNITS = 144; // units required to graduate

const StatCard = ({ icon, color, background, label, value }) => (
  <div className="col-sm-6 col-lg-3">
    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 d-flex flex-row align-items-center gap-3">
      <div
        className="rounded-3 d-flex align-items-center justify-content-center"
        style={{ width: '48px', height: '48px', backgroundColor: background, color, fontSize: '20px' }}
      >
        {icon}
      </div>
      <div>
        <span className="text-muted small d-block" style={{ fontSize: '12px' }}>
          {label}
        </span>
        <h4 className="fw-bold text-dark mb-0">{value}</h4>
      </div>
    </div>
  </div>
);

const InfoRow = ({ label, value, last }) => (
  <div className={`d-flex justify-content-between py-1 ${last ? '' : 'border-bottom border-light'}`}>
    <span className="text-muted">{label}</span>
    <strong className="text-dark text-end">{value}</strong>
  </div>
);

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const profile = useApi('/portal/profile');
  const grades = useApi('/portal/grades', []);
  const schedule = useApi('/portal/schedule', []);
  const enrollment = useApi('/portal/enrollment');

  const loading = profile.loading || grades.loading || schedule.loading || enrollment.loading;
  const error = profile.error || grades.error || schedule.error || enrollment.error;
  const reload = () => [profile, grades, schedule, enrollment].forEach((r) => r.reload());

  if (loading) return <AppLayout title="Dashboard"><Loading /></AppLayout>;
  if (error) return <AppLayout title="Dashboard"><LoadError message={error} onRetry={reload} /></AppLayout>;

  const student = profile.data;
  const summary = gradeSummary(grades.data);
  const period = enrollment.data?.period;
  const current = enrollment.data?.enrollment;
  const today = todayName();
  const todaysClasses = schedule.data.filter((c) => c.day === today);
  const recentGrades = grades.data.slice(0, 4);
  const progress = Math.min(100, Math.round((summary.earned / TOTAL_UNITS) * 100));
  const standing =
    summary.gpa === null ? 'No grades yet' : summary.gpa <= 1.75 ? "Dean's List" : summary.gpa <= 3 ? 'Good Standing' : 'Probation';

  return (
    <AppLayout title="Dashboard">
      {/* 1. Welcome banner */}
      <div
        className="card border-0 text-white rounded-4 shadow-sm mb-4"
        style={{
          backgroundColor: '#2563eb',
          backgroundImage: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
        }}
      >
        <div className="card-body p-4 p-md-5">
          <span className="text-white text-opacity-75 small d-block mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <h2 className="fw-bold text-white mb-2">Welcome back, {(student.fullName || user?.name || '').split(' ')[0]}!</h2>
          <p className="text-white text-opacity-75 small mb-0">
            Here's an overview of your academic progress for {period?.academicYear}, {period?.semester}.
          </p>
        </div>
      </div>

      {/* 2. KPI cards */}
      <div className="row g-3 mb-4">
        <StatCard icon={<FaChartLine />} color="#2563eb" background="#eff6ff" label="GPA" value={formatGrade(summary.gpa)} />
        <StatCard icon={<FaBook />} color="#16a34a" background="#f0fdf4" label="Completed Units" value={`${summary.earned}/${TOTAL_UNITS}`} />
        <StatCard
          icon={<FaGraduationCap />}
          color="#8b5cf6"
          background="#f5f3ff"
          label="Enrolled Subjects"
          value={current?.status === 'Approved' ? current.subjects.length : 0}
        />
        <StatCard icon={<FaAward />} color="#d97706" background="#fffbeb" label="Standing" value={<span className="fs-6">{standing}</span>} />
      </div>

      {/* 3. Academic progress & student information */}
      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="mb-3">
              <h6 className="fw-bold text-dark mb-1">Academic Progress</h6>
              <span className="text-muted small">Your journey toward graduation</span>
            </div>
            <div className="mb-4">
              <div className="d-flex justify-content-between text-muted small mb-1" style={{ fontSize: '11px' }}>
                <span>Units Completed</span>
                <span className="fw-semibold">
                  {summary.earned} / {TOTAL_UNITS}
                </span>
              </div>
              <div className="progress" style={{ height: '7px' }}>
                <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${progress}%` }} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
              </div>
            </div>
            <div className="row text-center py-2 mb-3">
              <div className="col-4 border-end">
                <h3 className="fw-bold text-dark mb-0">{formatGrade(summary.gpa)}</h3>
                <span className="text-muted small" style={{ fontSize: '11px' }}>Current GPA</span>
              </div>
              <div className="col-4 border-end">
                <h3 className="fw-bold text-dark mb-0">{summary.earned}</h3>
                <span className="text-muted small" style={{ fontSize: '11px' }}>Units Earned</span>
              </div>
              <div className="col-4">
                <h3 className="fw-bold text-dark mb-0">{Math.max(0, TOTAL_UNITS - summary.earned)}</h3>
                <span className="text-muted small" style={{ fontSize: '11px' }}>Units Remaining</span>
              </div>
            </div>
            <div className="pt-3 border-top d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small d-block" style={{ fontSize: '11px' }}>Program</span>
                <strong className="text-dark small">{programName(student.program)}</strong>
              </div>
              <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-pill small">{student.yearLevel}</span>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h6 className="fw-bold text-dark mb-3">Student Information</h6>
            <div className="d-flex flex-column gap-2 small">
              <InfoRow label="Student ID" value={student.studentId} />
              <InfoRow label="Program" value={programName(student.program)} />
              <InfoRow label="Year & Section" value={`${student.yearLevel} · ${student.section}`} />
              <InfoRow label="Semester" value={period?.semester} />
              <InfoRow label="Academic Year" value={period?.academicYear} />
              <InfoRow label="Status" value={student.academicStatus} />
              <InfoRow label="Enrollment" value={current ? current.status : 'Not submitted'} last />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Today's classes & recent grades */}
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-dark mb-0">Today's Classes</h6>
                <span className="text-muted small">
                  {today}: {todaysClasses.length} class(es) scheduled
                </span>
              </div>
              <Link to="/student/schedule" className="text-muted text-decoration-none" aria-label="Open schedule">
                <FaArrowRight />
              </Link>
            </div>
            <div className="d-flex flex-column gap-3">
              {todaysClasses.length === 0 && <p className="text-muted small mb-0">No classes today. 🎉</p>}
              {todaysClasses.map((item) => (
                <div key={item.id} className="p-3 rounded-3 border d-flex justify-content-between align-items-center bg-white">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-primary"
                      style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', fontSize: '18px' }}
                    >
                      <FaClock />
                    </div>
                    <div>
                      <strong className="text-dark d-block small mb-1">{item.subjectTitle}</strong>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        {item.subjectCode} | {formatTime(item.startTime)} to {formatTime(item.endTime)} | {item.instructor}
                      </span>
                    </div>
                  </div>
                  <span className="badge bg-light text-secondary border px-2 py-1 small">📍 {item.room}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-dark mb-0">Recent Grades</h6>
                <span className="text-muted small">Latest posted grades</span>
              </div>
              <Link to="/student/grades" className="text-muted text-decoration-none" aria-label="Open grades">
                <FaArrowRight />
              </Link>
            </div>
            <div className="d-flex flex-column gap-3">
              {recentGrades.length === 0 && <p className="text-muted small mb-0">No grades have been published yet.</p>}
              {recentGrades.map((grade) => (
                <div key={grade.id} className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                  <div>
                    <strong className="text-dark small d-block">{grade.subjectCode}</strong>
                    <span className="text-muted" style={{ fontSize: '11px' }}>{grade.subjectTitle}</span>
                  </div>
                  <div className={`text-end ${grade.remark === 'Passed' ? 'text-success' : 'text-danger'}`}>
                    <strong className="d-block small">{formatGrade(grade.finalGrade)}</strong>
                    <span style={{ fontSize: '10px' }}>{grade.remark}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
