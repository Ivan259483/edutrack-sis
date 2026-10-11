# EduTrack Student Portal

The student-facing React app of **EduTrack SIS** (React 19, React Router, Bootstrap 5 /
react-bootstrap, Axios). Students register, sign in, view their dashboard, edit their contact
details, enroll in subjects, see published grades, their class schedule and announcements, and
open support tickets. Administrators who sign in here are handed over to the separate Admin Portal (`../admin`).

All data comes from the EduTrack REST API in `../backend` (Express + MongoDB). See the
[project README](../README.md) for the full system (backend, both portals, MongoDB).

## Requirements

- Node.js 20 or newer
- The backend running on http://localhost:5001 with a seeded MongoDB database (below)

## Setup

```bash
npm install
```

```bash
cp .env.example .env
```

### Environment variables (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5001/api` | Base URL of the EduTrack API (used by the Axios instance in `src/services/api.js`) |
| `VITE_ADMIN_PORTAL_URL` | `http://localhost:5174` | Where administrators are sent after signing in |

Both have defaults, so the app also runs without a `.env`. Values are baked in at build time;
restart `npm run dev` after changing them. Never put secrets in `VITE_*` variables — they are
visible in the browser.

### Seed data

Demo accounts and records are created by the backend seeder (this **erases** the backend database):

```bash
cd ../backend && npm run seed
```

| Role | Sign in with | Password |
| --- | --- | --- |
| Student | `juan.delacruz@edutrack.edu` or student ID `2024-00115` | `Student123!` |
| Administrator | `admin@edutrack.edu` (Administrator tab → Admin Portal) | `Admin123!` |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on http://localhost:5173 (fixed port; stop any other app using 5173) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build on port 5173 |
| `npm run lint` | ESLint |

Production hosting must rewrite unknown paths to `index.html` so deep links (e.g. `/student/grades`) work after a refresh.

## Structure

```text
src/
  App.jsx                 Routes (public, protected student pages, /admin/* handoff, 404)
  context/                AuthProvider (JWT session) and the AuthContext object
  services/api.js         Axios instance: base URL, Bearer token interceptor, 401 → sign out
  services/useApi.js      Data-loading hook (loading / error / reload)
  services/academic.js    GPA, program names, date/time helpers
  components/             ProtectedRoute, layout (sidebar, navbar, mobile offcanvas), forms
  pages/                  Login, Register (email OTP), Dashboard, Profile, Enrollment, Grades,
                          Schedule, Notifications, Help & Support, 404
```

## Sign-in

This login page (Student / Administrator tabs) is the only sign-in screen for both portals.
Administrators are handed over to the Admin Portal after signing in; the Admin Portal sends
signed-out visitors and **Sign out** back to `/login?role=admin`, which opens the Administrator
tab. The **Quick Demo Fill** buttons appear only in development (`npm run dev`); production
builds don't include them or the demo passwords.

## Notes

- "Forgot password" is a placeholder page; no reset email is sent.
- Notification read/dismissed flags are stored per browser (`localStorage`); the notifications
  themselves come from the API.
