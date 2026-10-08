# EduTrack SIS — Full-Stack MERN Student Information System

EduTrack is a Student Information System built with **MongoDB, Express.js, React and Node.js**.
It is made of three apps that share one backend and one database:

| App | Folder | URL | Who uses it |
| --- | --- | --- | --- |
| REST API (Express + Mongoose) | `edutrack-sis/backend` | http://localhost:5001/api | both portals |
| Student portal (React + Bootstrap + Axios) | `edutrack-sis/frontend` | http://localhost:5173 | students, shared login page |
| Admin portal (React + TypeScript + Axios) | `student-information-admin-portal` | http://localhost:5174 | registrar / administrators |

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
- MongoDB Community Server running locally:

```bash
brew trust mongodb/brew
```

```bash
brew install mongodb-community
```

```bash
brew services start mongodb-community
```

## First-time setup

1. **Backend** — create `backend/.env` from `backend/.env.example` (set a long random `JWT_SECRET`), then:

   ```bash
   cd backend && npm install && npm run seed
   ```

   `npm run seed` **erases** the database and loads the demo data.

2. **Student portal**: `cd frontend && npm install`
3. **Admin portal**: `cd student-information-admin-portal && npm install`

## Running (three terminals)

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

```bash
cd ../student-information-admin-portal && npm run dev
```

Open http://localhost:5173. Ports are fixed (`strictPort`); if a port is busy, stop the other app using it.

### Demo accounts (created by `npm run seed`)

| Role | Sign in with | Password |
| --- | --- | --- |
| Administrator | `admin@edutrack.edu` | `Admin123!` |
| Student | `juan.delacruz@edutrack.edu` or student ID `2024-00115` | `Student123!` |
| Other sample students | their email, e.g. `pedro.santos@university.edu` | `Student123!` |

Signing in on the **Administrator** tab of the EduTrack login sends you straight to the admin portal
(the token is handed over in the URL fragment and removed immediately). Admins can also sign in at
http://localhost:5174/login.

## Features (course requirements)

- **User management** — registration with emailed 5-digit verification code, login with email or
  student ID, logout, change password, bcrypt-hashed passwords, JWT (24 h) authentication.
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
  portals, rate limiting on login/registration/OTP, hashed and attempt-limited OTP codes, generic
  login errors (no account enumeration), errors never leak stack traces.
- **UI** — responsive layouts, navigation menus, search (students, subjects, global admin search),
  filters and pagination (admin directory; `?page=&limit=&search=` on every list endpoint).

## REST API

All routes are under `/api`. 🔒 = requires `Authorization: Bearer <token>`.

| Method & path | Access | Purpose |
| --- | --- | --- |
| `POST /auth/send-otp`, `POST /auth/verify-otp` | public | email verification code |
| `POST /auth/register` | public (verified email) | create a student account |
| `POST /auth/login` | public | get a JWT |
| `GET /auth/me`, `PUT /auth/password` | 🔒 any | current user, change password |
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

## Tests

```bash
cd backend && npm test
```

```bash
cd ../student-information-admin-portal && npm test
```

The backend tests need MongoDB running and use a separate `edutrack_test` database.

## Notes & limitations

- Verification emails use Gmail SMTP (`EMAIL_USER`/`EMAIL_PASS` App Password). If they are empty or
  sending fails in development, the code is printed in the backend console.
- "Forgot password" is a UI placeholder (no reset email is sent yet).
- Seeded passwords are for local demos only; change them before any real use.
