import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ChangePassword from '../components/ChangePassword';
import EditContactForm from '../components/EditContactForm';
import { LoadError, Loading } from '../components/PageState';
import useApi from '../services/useApi';
import { DEPARTMENTS, formatDate, programName } from '../services/academic';
import {
  FaUser,
  FaEnvelope,
  FaGraduationCap,
  FaHeartbeat,
  FaFilePdf,
  FaPen,
} from 'react-icons/fa';

const StudentProfile = () => {
  const { data: student, setData: setStudent, loading, error, reload } = useApi('/portal/profile');
  const { data: enrollment } = useApi('/portal/enrollment');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const { hash } = useLocation();

  // The account menu's "Settings" opens this page at the Account Security card.
  useEffect(() => {
    if (!loading && hash === '#security') {
      document.getElementById('security')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, hash]);

  if (loading) return <AppLayout title="My Profile"><Loading /></AppLayout>;
  if (error) return <AppLayout title="My Profile"><LoadError message={error} onRetry={reload} /></AppLayout>;

  // Student record from MongoDB, shaped for display.
  const notProvided = (value) => (value && value !== 'Not provided' ? value : '—');
  const profile = {
    fullName: student.fullName,
    initials: student.avatarInitials,
    studentId: student.studentId,
    dateOfBirth: student.dateOfBirth ? formatDate(student.dateOfBirth) : '—',
    gender: notProvided(student.gender),
    civilStatus: notProvided(student.civilStatus),
    nationality: notProvided(student.nationality),
    email: student.email,
    personalEmail: notProvided(student.personalEmail),
    contactNumber: notProvided(student.contactNumber),
    residentialAddress: notProvided(student.address),
    guardianName: notProvided(student.emergencyContact),
    guardianRelationship: notProvided(student.guardianRelationship),
    emergencyContactNumber: notProvided(student.emergencyContactNumber),
    department: DEPARTMENTS[student.program] || '—',
    program: programName(student.program),
    yearLevel: student.yearLevel,
    section: student.section,
    academicStatus: student.academicStatus,
    enrollmentStatus:
      enrollment?.enrollment?.status === 'Approved' ? 'Enrolled' : enrollment?.enrollment ? `Enrollment ${enrollment.enrollment.status}` : 'Not Enrolled',
  };

  return (
    <AppLayout title="My Profile">
      {/* 1. Profile Header Card */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            {/* Avatar Pill */}
            <div
              className="rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
              style={{ width: '72px', height: '72px', fontSize: '24px' }}
            >
              {profile.initials}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h4 className="fw-bold text-dark mb-0">
                  {profile.fullName}
                </h4>
                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill small">
                  ● {profile.enrollmentStatus}
                </span>
                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill small">
                  {profile.academicStatus}
                </span>
              </div>
              <p className="text-muted small mb-0">
                Student ID: <strong className="text-dark">{profile.studentId}</strong> • {profile.program} ({profile.section})
              </p>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            {!editing && (
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2 rounded-3 px-3 py-2 small fw-semibold"
                onClick={() => {
                  setSaved(false);
                  setEditing(true);
                }}
              >
                <FaPen /> Edit Contact Details
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-3 px-3 py-2 small fw-semibold"
              onClick={() => window.print()}
            >
              <FaFilePdf /> Print Profile
            </button>
          </div>
        </div>
      </div>

      {saved && (
        <div className="alert alert-success rounded-4 small" role="status">
          Your contact details have been updated.
        </div>
      )}
      {editing && (
        <EditContactForm
          student={student}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setStudent(updated);
            setEditing(false);
            setSaved(true);
          }}
        />
      )}

      {/* 2. Grid Cards (2x2 Responsive Layout matching prototype) */}
      <div className="row g-4">
        {/* Card 1: General Information */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <span className="text-primary fs-5"><FaUser /></span>
              <h6 className="fw-bold text-dark mb-0">General Information</h6>
            </div>

            <div className="d-flex flex-column gap-3 small">
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Full Legal Name</span>
                <span className="fw-semibold text-dark">
                  {profile.fullName}
                </span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Date of Birth</span>
                <span className="fw-semibold text-dark">{profile.dateOfBirth}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Gender</span>
                <span className="fw-semibold text-dark">{profile.gender}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Civil Status</span>
                <span className="fw-semibold text-dark">{profile.civilStatus}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">Nationality</span>
                <span className="fw-semibold text-dark">{profile.nationality}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Contact Information */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <span className="text-primary fs-5"><FaEnvelope /></span>
              <h6 className="fw-bold text-dark mb-0">Contact Information</h6>
            </div>

            <div className="d-flex flex-column gap-3 small">
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Institutional Email</span>
                <span className="fw-semibold text-dark">{profile.email}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Personal Email</span>
                <span className="fw-semibold text-dark">{profile.personalEmail}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Mobile Number</span>
                <span className="fw-semibold text-dark">{profile.contactNumber}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">Residential Address</span>
                <span className="fw-semibold text-dark text-end" style={{ maxWidth: '240px' }}>
                  {profile.residentialAddress}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Emergency Contact */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <span className="text-danger fs-5"><FaHeartbeat /></span>
              <h6 className="fw-bold text-dark mb-0">Emergency Contact</h6>
            </div>

            <div className="d-flex flex-column gap-3 small">
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Guardian / Contact Person</span>
                <span className="fw-semibold text-dark">{profile.guardianName}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Relationship</span>
                <span className="fw-semibold text-dark">{profile.guardianRelationship}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">Emergency Hotline / Phone</span>
                <span className="fw-semibold text-dark">{profile.emergencyContactNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Academic Information */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <span className="text-success fs-5"><FaGraduationCap /></span>
              <h6 className="fw-bold text-dark mb-0">Academic Information</h6>
            </div>

            <div className="d-flex flex-column gap-3 small">
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">College Department</span>
                <span className="fw-semibold text-dark">{profile.department}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Degree Program</span>
                <span className="fw-semibold text-dark">{profile.program}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-light">
                <span className="text-muted">Year & Section</span>
                <span className="fw-semibold text-dark">{profile.yearLevel} - {profile.section}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">Academic Status</span>
                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill">
                  {profile.academicStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-muted small mt-4 mb-0">
        You can update your contact details above. To correct your name, student ID or academic information, open a ticket in Help and Support.
      </p>
      <ChangePassword />
    </AppLayout>
  );
};

export default StudentProfile;