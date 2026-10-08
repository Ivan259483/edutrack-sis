import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/error.js';
import { sanitize } from './middleware/sanitize.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import portalRoutes from './routes/portalRoutes.js';

// Frontends allowed to call this API (student portal + admin portal).
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) =>
      // Requests without an Origin (curl, server-to-server) carry no browser credentials.
      callback(null, !origin || allowedOrigins.includes(origin)),
  })
);
app.use(express.json({ limit: '200kb' }));
app.use(sanitize);

app.get('/', (_req, res) => {
  res.json({
    message: '🎓 EduTrack: Student Information System API is running...',
    status: 'success',
  });
});
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
