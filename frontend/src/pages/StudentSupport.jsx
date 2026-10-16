import { useRef, useState } from 'react';
import { FaHeadset, FaPaperPlane, FaPlus, FaTicketAlt } from 'react-icons/fa';
import AppLayout from '../components/layout/AppLayout';
import { Empty, LoadError, Loading } from '../components/PageState';
import API, { errorMessage } from '../services/api';
import useApi from '../services/useApi';
import { formatDate } from '../services/academic';
import { apiFieldErrors, lengthBetween, onlyErrors } from '../services/validation';

const CATEGORIES = ['Enrollment', 'Grades', 'Technical', 'General'];
const STATUS_BADGE = { Open: 'bg-danger', 'In Progress': 'bg-warning text-dark', Resolved: 'bg-success' };
const emptyForm = { category: 'General', subject: '', message: '' };

// Students open support tickets here; the registrar answers them in the admin portal helpdesk.
const StudentSupport = () => {
  const tickets = useApi('/portal/tickets', []);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  // Fields the student has left (blur) or tried to submit.
  const [touched, setTouched] = useState({});
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [serverErrors, setServerErrors] = useState({});
  const submitting = useRef(false);

  // Same limits as the API (portalTicketRules).
  const errors = {
    ...onlyErrors({
      subject: lengthBetween(form.subject, 'Subject', 5, 200),
      message: lengthBetween(form.message, 'Message', 10, 5000),
    }),
    ...onlyErrors(serverErrors),
  };
  const shown = (name) => (touched[name] ? errors[name] : '');
  const edit = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: '' }));
  };
  const selected = tickets.data.find((t) => t.id === selectedId) || null;

  const replaceTicket = (ticket) =>
    tickets.setData((list) => [ticket, ...list.filter((t) => t.id !== ticket.id)]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    setTouched({ subject: true, message: true });
    if (errors.subject || errors.message) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const { data } = await API.post('/portal/tickets', {
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      replaceTicket(data);
      setSelectedId(data.id);
      setForm(emptyForm);
      setTouched({});
      setShowForm(false);
    } catch (err) {
      const fieldErrors = apiFieldErrors(err);
      setServerErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setError(errorMessage(err));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const { data } = await API.post(`/portal/tickets/${encodeURIComponent(selected.id)}/replies`, {
        message: reply.trim(),
      });
      replaceTicket(data);
      setReply('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Help and Support">
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center text-primary"
            style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', fontSize: '22px' }}
          >
            <FaHeadset />
          </div>
          <div>
            <h5 className="fw-bold text-dark mb-1">Help and Support</h5>
            <p className="text-muted small mb-0">Send a concern to the Registrar and follow the replies here.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowForm((v) => !v)}>
          <FaPlus /> New Ticket
        </button>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 small" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <form className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white" onSubmit={handleCreate} noValidate>
          <h6 className="fw-bold text-dark mb-3">Open a support ticket</h6>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small text-muted" htmlFor="ticket-category">Category</label>
              <select
                id="ticket-category"
                className="form-select"
                value={form.category}
                onChange={(e) => edit('category', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label small text-muted" htmlFor="ticket-subject">Subject</label>
              <input
                id="ticket-subject"
                className={`form-control ${shown('subject') ? 'is-invalid' : ''}`}
                value={form.subject}
                maxLength={200}
                onChange={(e) => edit('subject', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, subject: true }))}
                aria-invalid={Boolean(shown('subject'))}
                aria-describedby={shown('subject') ? 'ticket-subject-error' : undefined}
              />
              <div id="ticket-subject-error" className="invalid-feedback">{shown('subject')}</div>
            </div>
            <div className="col-12">
              <label className="form-label small text-muted" htmlFor="ticket-message">Message</label>
              <textarea
                id="ticket-message"
                rows={4}
                className={`form-control ${shown('message') ? 'is-invalid' : ''}`}
                value={form.message}
                maxLength={5000}
                onChange={(e) => edit('message', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
                aria-invalid={Boolean(shown('message'))}
                aria-describedby={shown('message') ? 'ticket-message-error' : undefined}
              />
              <div id="ticket-message-error" className="invalid-feedback">{shown('message')}</div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Sending…' : 'Submit Ticket'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {tickets.loading ? (
        <Loading />
      ) : tickets.error ? (
        <LoadError message={tickets.error} onRetry={tickets.reload} />
      ) : (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 bg-white">
              <div className="p-3 border-bottom fw-bold text-dark small">My Tickets ({tickets.data.length})</div>
              {tickets.data.length === 0 && <Empty>You have not opened any tickets yet.</Empty>}
              <div className="list-group list-group-flush rounded-bottom-4">
                {tickets.data.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`list-group-item list-group-item-action py-3 ${t.id === selectedId ? 'active' : ''}`}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small font-monospace">{t.ticketNumber}</span>
                      <span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span>
                    </div>
                    <div className="fw-semibold small text-truncate">{t.subject}</div>
                    <div className="small opacity-75">
                      {t.category} • Updated {formatDate(t.dateUpdated)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              {!selected ? (
                <Empty>
                  <FaTicketAlt className="fs-3 mb-2 d-block mx-auto" />
                  Select a ticket to view the conversation.
                </Empty>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <span className="badge bg-dark font-monospace mb-1">{selected.ticketNumber}</span>
                      <h6 className="fw-bold text-dark mb-0">{selected.subject}</h6>
                      <span className="text-muted small">
                        {selected.category} • Opened {formatDate(selected.dateCreated)}
                      </span>
                    </div>
                    <span className={`badge ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
                  </div>
                  <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: 360, overflowY: 'auto' }}>
                    <div className="p-3 rounded-3 bg-light small">
                      <strong className="d-block mb-1">You</strong>
                      {selected.message}
                    </div>
                    {selected.replies.map((r) => (
                      <div
                        key={r.id}
                        className={`p-3 rounded-3 small ${r.isAdmin ? 'bg-primary bg-opacity-10 ms-4' : 'bg-light me-4'}`}
                      >
                        <strong className="d-block mb-1">
                          {r.isAdmin ? `${r.author} (Registrar)` : 'You'}{' '}
                          <span className="text-muted fw-normal">• {formatDate(r.timestamp)}</span>
                        </strong>
                        {r.message}
                      </div>
                    ))}
                  </div>
                  {selected.status === 'Resolved' ? (
                    <p className="text-muted small mb-0">This ticket is resolved. Open a new ticket if you need more help.</p>
                  ) : (
                    <form className="d-flex gap-2" onSubmit={handleReply}>
                      <input
                        className="form-control"
                        placeholder="Write a reply…"
                        aria-label="Reply message"
                        value={reply}
                        maxLength={5000}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={saving || !reply.trim()}>
                        <FaPaperPlane /> Send
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default StudentSupport;
