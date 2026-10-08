// Shared loading / error / empty states for pages that load from the API.
export const Loading = ({ label = 'Loading…' }) => (
  <div className="d-flex justify-content-center align-items-center gap-2 py-5 text-muted" role="status">
    <div className="spinner-border spinner-border-sm text-primary" />
    <span>{label}</span>
  </div>
);

export const LoadError = ({ message, onRetry }) => (
  <div className="alert alert-danger d-flex justify-content-between align-items-center rounded-4" role="alert">
    <span>{message}</span>
    {onRetry && (
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

export const Empty = ({ children }) => (
  <div className="text-center text-muted py-5 small">{children}</div>
);
