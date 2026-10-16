# EduTrack SIS — Full-Stack MERN Student Information System

EduTrack is a Student Information System built with **MongoDB, Express.js, React and Node.js**.
It is made of three apps in this one repository that share one backend and one database:

| App | Folder | URL | Who uses it |
| --- | --- | --- | --- |
| REST API (Express + Mongoose) | `backend/` | http://localhost:5001/api | both portals |
| Student portal (React + Bootstrap + Axios) | `frontend/` | http://localhost:5173 | students, shared login page |
| Admin portal (React + TypeScript + Axios) | `admin/` | http://localhost:5174 | registrar / administrators |

```text
edutrack-sis/
├── backend/    Express + MongoDB REST API     (Vercel project: edutrack-sis-api)
├── frontend/   Student portal + login page    (Vercel project: edutrack-sis)
├── admin/      Admin portal                   (Vercel project: student-information-admin-portal)
└── README.md
```

The admin portal used to live in its own `student-information-admin-portal` repository; it was
merged into `admin/` with its full commit history (`git subtree`).

```text
 Student portal (5173) ──┐                         ┌── MongoDB (edutrack database)
                         ├── Axios + JWT ──► API ──┤
 Admin portal  (5174) ───┘   (5001/api)            └── users, students, subjects, enrollments,
                                                       grades, schedules, announcements, tickets...
```

What a student does in the student portal (register, enroll, open a support ticket) appears in the
admin portal, and what the registrar does there (approve enrollment, publish grades, post announcements,
reply to tickets, edit a student record) appears in the student portal.

## Requirements

- Node.js 20+ (tested with Node 26)
- MongoDB Community Server **8.0** running locally (persistent data in `/opt/homebrew/var/mongodb`
  on Apple Silicon). Use 8.0: the backend's MongoDB driver (6.20, via Mongoose 8) supports servers
  up to 8.2, so the 9.0 release is not supported yet. Steps from MongoDB's official macOS guide
  (one-time; needs the Xcode command-line tools and Homebrew):

```bash
brew tap mongodb/brew
```

```bash
brew trust mongodb/brew
```

```bash
brew update
```

```bash
brew install mongodb-community@8.0
```

```bash
brew services start mongodb-community@8.0
```

```bash
brew services list
```

`mongodb-community@8.0` should show `started`; `mongosh` should connect. If macOS blocks `mongod`
("developer cannot be verified"), allow it in System Settings → Privacy & Security → Open Anyway.
Stop it later with `brew services stop mongodb-community@8.0`.

## First-time setup

1. **Backend**: create `backend/.env` from `backend/.env.example` (set a long random `JWT_SECRET`;
   `MONGO_URI=mongodb://127.0.0.1:27017/edutrack`), then:

   ```bash
   cd backend && npm install && npm run seed
   ```

   `npm run seed` **erases** the `edutrack` database and loads the demo data.

2. **Student portal**: `cd frontend && npm install`
3. **Admin portal**: `cd admin && npm install` (optional `admin/.env` from `admin/.env.example`;
   its defaults already match the local ports)

## Running (three terminals, each started from the `edutrack-sis` folder)

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

```bash
cd admin && npm run dev
```

Open http://localhost:5173. Ports are fixed (`strictPort`): student portal 5173, admin portal 5174,
API 5001. If 5173 is taken by another app, either stop that app, or run the student portal on
another port **and** tell the other two apps about it:

- student portal: `npm run dev -- --port 5175`
- admin portal `.env`: `VITE_STUDENT_PORTAL_URL=http://localhost:5175`
- backend `.env`: add it to `CLIENT_ORIGINS` (e.g. `http://localhost:5173,http://localhost:5174,http://localhost:5175`)

### Demo accounts (created by `npm run seed`)

| Role | Sign in with | Password |
| --- | --- | --- |
| Administrator | `admin@edutrack.edu` | `Admin123!` |
| Student | `juan.delacruz@edutrack.edu` or student ID `2024-00115` | `Student123!` |
| Other sample students | their email, e.g. `pedro.santos@university.edu` | `Student123!` |

The EduTrack login page (Student / Administrator tabs) is the only sign-in screen. Signing in on
the **Administrator** tab sends you straight to the admin portal (the token is handed over in the
URL fragment and removed immediately). Opening the admin portal while signed out, and **Sign out**,
return to this page with the Administrator tab selected. The **Quick Demo Fill** buttons only
appear in development (`npm run dev`).

## Features (course requirements)

- **User management** — registration with emailed 5-digit verification code, login with email or
  student ID, logout, change password, **Forgot password** (6-digit code by email, both login tabs),
  bcrypt-hashed passwords, JWT (24 h) authentication; resetting or changing a password signs out
  older sessions.
- **Validation** — every form checks its fields on blur and on submit (red message under the field,
  trimmed input, no double submits) and the API enforces the same rules, returning
  `{ message, errors: [{ field, message }] }` (e.g. "Email is already registered."). Names: 2–50
  letters incl. ñ/accents, spaces, `-`, `'`, `.`; passwords (register/reset/change): 8+ characters with
  upper and lower case, a number and a symbol; student IDs `YYYY-NNNNN`; phones, dates, grades
  (1.00–5.00), units, rooms and times have their own rules. Login only requires both fields.
- **Dashboards & profile** — student dashboard (GPA, units, today's classes, recent grades), student
  profile page, admin dashboard and admin profile.
- **CRUD** — students, enrollments, grades, class schedules, announcements, support tickets, subjects
  and settings through REST endpoints; students create/withdraw enrollments and create/reply to tickets.
- **React** — components, props, `useState`/`useEffect`/custom hooks (`useApi`), React Router with
  protected routes, controlled forms with validation.
- **API integration** — Express REST API consumed with Axios (JWT attached by an interceptor;
  expired sessions sign out automatically).
- **Security** — `protect`/`authorize` JWT middleware, role-based access (admin vs student), students
  can only access their own records, express-validator input validation and whitelisting (no mass
  assignment), NoSQL-injection sanitizing, helmet security headers, CORS restricted to the two
  portals, limits counted mainly per account/email (kept in MongoDB, safe on serverless): 5 wrong
  passwords lock that account for 5 minutes; emailed codes at most once a minute and 5 an hour per
  email; plus a looser per-IP net (30 per 15 minutes; sign-in/code checks count only failures, so a
  class on one Wi-Fi isn't blocked; `AUTH_RATE_LIMIT` raises it). Limit messages say how long to wait.
  Hashed and attempt-limited OTP and reset codes,
  generic login and reset answers (no account enumeration), errors never leak stack traces.
- **UI** — responsive layouts, navigation menus, search (students, subjects, global admin search),
  filters and pagination (admin directory; `?page=&limit=&search=` on every list endpoint).

## REST API

All routes are under `/api`. 🔒 = requires `Authorization: Bearer <token>`.

| Method & path | Access | Purpose |
| --- | --- | --- |
| `POST /auth/send-otp`, `POST /auth/verify-otp` | public | email verification code |
| `POST /auth/register` | public (verified email) | create a student account |
| `POST /auth/login` | public | get a JWT |
| `POST /auth/forgot-password` | public | email a 6-digit reset code (`{ identifier, role }`; same answer for unknown accounts, one per minute) |
| `POST /auth/reset-password` | public | `{ identifier, code, password, confirmPassword }`; code valid 15 min, 5 tries |
| `GET /auth/me`, `PUT /auth/password` | 🔒 any | current user, change password (returns a fresh token) |
| `GET /settings`, `GET /subjects` | 🔒 any | academic period & switches, subject catalog |
| `PUT /settings` | 🔒 admin | update settings |
| `GET /admin/bootstrap` | 🔒 admin | all admin portal data in one request |
| `GET/POST /students`, `GET/PUT/DELETE /students/:id` | 🔒 admin | student records (`?search=&program=&yearLevel=&section=&academicStatus=&page=&limit=`) |
| same pattern for `/enrollments`, `/grades`, `/schedules`, `/announcements`, `/tickets`, `/subjects`, `/notifications`, `/activity-logs` | 🔒 admin | CRUD |
| `GET /portal/profile`, `/portal/grades`, `/portal/schedule`, `/portal/announcements`, `/portal/subjects` | 🔒 student | own records only |
| `GET/POST/DELETE /portal/enrollment` | 🔒 student | view, submit/revise, withdraw enrollment |
| `GET/POST /portal/tickets`, `POST /portal/tickets/:id/replies` | 🔒 student | support tickets |

Business rules are enforced on the server too: unique student ID/email, section must match program and
year, students with history cannot be deleted, only pending enrollments can be reviewed (rejection needs
remarks, prerequisite concerns need an override), grade encoding can be closed in Settings, only complete
grades can be published, and room/instructor/section schedule conflicts are rejected.

## Tests and builds

Run each line from the `edutrack-sis` folder:

```bash
cd backend && npm test
```

```bash
cd frontend && npm run lint && npm run build
```

```bash
cd admin && npm run typecheck && npm run lint && npm test && npm run build
```

The backend tests need MongoDB running and use a separate `edutrack_test` database.

## Deployment (Vercel)

All three Vercel projects are connected to this repository, one per folder (Root Directory):

| Vercel project | Root Directory | Production URL |
| --- | --- | --- |
| `edutrack-sis-api` | `backend` | https://edutrack-sis-api.vercel.app |
| `edutrack-sis` | `frontend` | https://edutrack-sis-xi.vercel.app |
| `student-information-admin-portal` | `admin` | https://student-information-admin-portal.vercel.app |

Pushing to `main` deploys to production; other branches get preview deployments. Each folder's
`vercel.json` has an `ignoreCommand` that skips the build when nothing in that folder changed since
the project's last successful deployment (it builds whenever that can't be determined).

## Notes & limitations

- Verification and password reset emails use Gmail SMTP (`EMAIL_USER`/`EMAIL_PASS` App Password).
  If they are empty or sending fails in development, the code is printed in the backend console.
  For local testing with real credentials, `EMAIL_ALLOWLIST` (comma-separated) limits real email to
  those addresses; leave it empty on Vercel.
- Emails are never sent to the seeded demo domains (`@edutrack.edu`, `@university.edu`): the
  attempt is logged instead (locally with the code, on Vercel without it). Real users register and
  reset with their own addresses.
- Registration codes stay 5 digits because the Flutter app (same live API) expects 5; reset codes
  are 6 digits.
- Seeded passwords are for local demos only; change them before any real use.
