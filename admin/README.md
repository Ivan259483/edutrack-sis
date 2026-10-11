# student-information-admin-portal

Admin portal of **EduTrack SIS**, a MERN student information system (React + TypeScript + Axios).
Students use the EduTrack student portal, and both portals share the EduTrack Express/MongoDB REST API.
The API and the student portal live in the [edutrack-sis](https://github.com/Ivan259483/edutrack-sis) repository.

## Run and verify

Use Node.js 24 LTS or a newer supported Node release (verified here on Node 26.5).

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm audit
npm audit --omit=dev
```

`npm run build` creates `dist/`. Production hosting must serve `index.html` for non-asset Admin routes so direct navigation and refresh work. Test the deployment's rewrite configuration separately; Vite's local fallback is not proof of a host's configuration.

## Backend connection (EduTrack SIS)

This portal is the administrator side of **EduTrack SIS**
([edutrack-sis](https://github.com/Ivan259483/edutrack-sis), cloned next to this folder). It signs in and
stores every record through the EduTrack Express/MongoDB REST API. See the
[edutrack-sis README](https://github.com/Ivan259483/edutrack-sis#readme) for the
full setup (MongoDB, seeding, running all three apps).

- Runs on http://localhost:5174 (`strictPort`). Configure it with a `.env` file (see `.env.example`):

  | Variable | Default | Purpose |
  | --- | --- | --- |
  | `VITE_API_URL` | `http://localhost:5001/api` | EduTrack API base URL |
  | `VITE_STUDENT_PORTAL_URL` | `http://localhost:5173` | EduTrack student portal; its login page is the only sign-in screen |

  Set `VITE_STUDENT_PORTAL_URL` to wherever the student portal actually runs (for example
  `http://localhost:5175` if another app holds 5173) and restart `npm run dev`.
- **Sign-in**: there is no admin login form. Administrators sign in on the EduTrack login page
  (Administrator tab); it hands the JWT over as `#token=…`, which is validated with
  `/api/auth/me`, stored in `localStorage` (`edutrack_admin_token`) and removed from the address bar.
- **Signed out**: any admin page, including `/login`, redirects to
  `VITE_STUDENT_PORTAL_URL/login?role=admin` with `location.replace`, so it isn't kept in history.
  **Sign out** clears the admin token and goes to that same page; Back cannot reopen the
  dashboard (pages restored from the browser's back/forward cache are re-checked). A 401 from the
  API ends the session the same way.
- **Data**: after login, `GET /api/admin/bootstrap` loads all records. Pages keep using the same store
  (`useAdminCollection`), so validation in `src/data/transitions.ts` still runs first; each committed
  change is then translated into REST calls (`src/data/sync.ts`: POST new, PUT changed, DELETE removed)
  and sent in order. If the server rejects a change, a toast explains why and the data reloads from the
  server. Records refresh every 20 s and on window focus so new student enrollments/tickets appear.
- The server enforces the same business rules, so the database stays consistent with either portal.
- `src/data/repository.ts` (localStorage) is still used by the tests as an offline repository.

## Architecture

```text
src/auth/                JWT session (EduTrack API handoff) and route guard
src/lib/navigation.ts    Redirect to the EduTrack login page (Administrator tab)
src/lib/api.ts           Axios instance, token storage, API error messages
src/data/remote.tsx      Loads records from the API and syncs committed changes
src/data/sync.ts         State diff -> REST requests
src/data/schema.ts       Persisted record validation
src/data/transitions.ts  Seed data and shared mutation rules
src/data/repository.ts   Replaceable local persistence boundary
src/data/context.ts      Shared data hooks/interface
src/data/store.tsx       Persist-first updates, activity, notifications
src/lib/domain.ts        Grades, GPA, enrollment, schedules, CSV, dates
src/lib/search.ts        Cross-record search/deep links
src/pages/               Eight lazy-loaded Admin routes plus 404
src/components/shared/   Reused forms, print layout, state components
src/test/                Domain, persistence, routing and workflow tests
```

Students with enrollment/grade/support history cannot be hard-deleted: update their status to preserve referential integrity. Unlinked students can be deleted after confirmation. CSV includes all rows matching the current filters, across pagination, not only the visible page.

Settings describe the current working academic period. Existing grade records retain their own historical period, which is shown on transcripts. Enrollment and schedule samples represent the current working dataset; multi-year enrollment/schedule history is deferred to the database schema phase.

See [ADMIN_STABILIZATION_REPORT.md](ADMIN_STABILIZATION_REPORT.md) for changes, checks, dependency findings, and verification limits.
