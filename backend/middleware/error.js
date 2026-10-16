// Error thrown by controllers for expected failures (bad state, conflicts...).
// `errors` optionally ties the failure to form fields: { email: 'Email is already registered.' }.
export class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// Every error response has the same shape:
//   { message: 'Readable summary', errors?: [{ field: 'email', message: 'Email is already registered.' }] }
// The portals show `errors` under the matching fields and `message` otherwise.
export const fieldErrors = (errors) =>
  Array.isArray(errors) ? errors : Object.entries(errors).map(([field, message]) => ({ field, message }));

// Wraps async route handlers so rejected promises reach the error handler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Friendly messages for unique-index conflicts, keyed by field.
const DUPLICATE_MESSAGES = {
  email: 'Email is already registered.',
  studentId: 'Student ID is already in use.',
  code: 'A subject with this code already exists.',
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
      ...(err.errors ? { errors: fieldErrors(err.errors) } : {}),
      // Seconds until a rate-limited request may be retried.
      ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}),
    });
  }
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ message: errors.map((e) => e.message).join('; '), errors });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'value';
    const message = DUPLICATE_MESSAGES[field] || `A record with this ${field} already exists.`;
    return res.status(409).json({ message, errors: [{ field, message }] });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body.' });
  }
  console.error(err);
  // Never leak internals/stack traces to clients.
  res.status(500).json({ message: 'Something went wrong on the server.' });
};
