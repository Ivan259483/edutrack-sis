# Admin Portal stabilization report

Date: 2026-10-03. Scope: existing Admin Portal only. No Student Portal, production backend, credentials, deployment, or git commit was created.

## Outcome and acceptance boundary

The Admin workflows now use one validated, persisted data layer instead of disconnected page-local mock state. Existing design and reusable UI primitives were retained. Frontend checks and focused workflows are covered below.

This remains a **local demo frontend**, not a production-authorized student information system. Production auth/database enforcement is explicitly deferred. A complete CSV disk-save check is also still pending in a normal browser: the in-app browser starts then cancels downloads. Do not interpret this report as unconditional production acceptance.

## What was fixed

| Area | Implementation |
| --- | --- |
| Shared state | Students, enrollments, grades, schedules, announcements, tickets, notifications, settings/current period and activity share a Context provider and repository. Writes survive navigation and refresh. |
| Dashboard | KPI counts, all three chart datasets, recent records, academic period and activity derive from shared state. Original grade/program count mismatches are gone. Empty datasets have explanatory text. |
| Students | Real required-field Add/Edit forms; preload editing; combined filters/search; keyboard-accessible rows; clamped pagination; confirmation before deletion; CSV generation across filtered pages; linked record names/identifiers sync. History-linked student deletion is blocked deliberately to avoid orphaned records. |
| Enrollment | Only pending records can be approved/rejected. Unmet prerequisites require explicit recorded override. Rejection remarks are required and displayed. Only approved records enable COR. Units derive from subjects when updated. |
| Grades | Strict numerical parsing, inline validation, canonical remarks, disabled incomplete publication, global encoding lock. Editing published grades returns them to Draft for explicit re-publication. |
| Transcript | Valid published final grades only, per-record academic period, weighted GPA including failed numerical grades, completed/passed units, safe empty denominator, shared printable wrapper. |
| Schedules | Required fields, strict times, 07:00–18:00 range, start before end; normalized room/instructor/section overlap detection. Adjacent classes are permitted. |
| Announcements | Create/edit/delete/draft/publish all persist. Concrete program/year/section targets are mandatory. Changing audience resets the target. |
| Helpdesk | Mark In Progress, Reply, Reply & Resolve persist. Hidden selections clear safely. Mobile card/status clipping is fixed; selecting a ticket scrolls to details on narrow screens with a return control. Replies are described as saved, not delivered through a nonexistent external service. |
| Settings | Persisted global academic period, enrollment availability, grade encoding availability and notification preferences. Historical grades keep their original period. |
| Header | Global record search/deep links, genuine unread count/read actions, relevant notification destinations, Admin profile, isolated and clearly labeled demo logout/resume. |
| Navigation | All eight pages lazy-loaded; quick actions open their named workflows; functional Admin breadcrumbs; nonblank 404 with Back/Dashboard controls; guarded demo-session routes. |
| Reliability | Loading skeleton, error boundary, persistence-failure banner/toast, corrupt-data preservation, stale-tab overwrite check, success feedback only after successful writes. |

## Architecture and validation

Flow: page action → `applyChange`/schema/domain rules → repository save → shared state commit → derived views. Failed writes do not update shared state or falsely close successful workflows.

- Repository envelope version 1, key `university-admin:v1`. No scattered record-storage calls in pages. Session storage is intentionally isolated in `src/auth/`.
- Zod validates persisted entities/settings. Student IDs/emails are unique case-insensitively. Section must match program/year. The form offers configured academic combinations.
- Grade input accepts blank drafts or decimal values 1.00–5.00 with at most two decimals. Rejects NaN, infinity, malformed text, exponent notation and out-of-range values. ≤3.00 Passed; >3.00 Failed; missing final Incomplete.
- Official transcript GPA = sum(final × units) / sum(units) over valid published records; no division by zero. Drafts do not appear in the printable transcript.
- Schedule overlap: existing start < new end AND new start < existing end, on the same day. Names/rooms are trimmed, whitespace-collapsed and compared case-insensitively. Section overlap is additionally prevented.
- Rejection requires nonblank remarks. Prerequisite approval override is explicit and logged. Closed enrollment blocks new submissions but permits review of existing requests.
- Audience target must exist in the matching configured catalog. `All Students` is accepted only for that audience.
- Academic year requires consecutive `YYYY-YYYY`; semesters are 1st, 2nd or Summer.
- Manila calendar utilities avoid UTC date slicing. CSV quotes fields, escapes embedded quotes, includes UTF-8 BOM, and neutralizes leading formula characters.
- New enrollment/ticket notification preferences govern incoming records; system-activity preference governs locally generated action alerts. There is no delivery service or Student Portal yet.

Shared extraction includes initials, date/period formatting, grade/transcript calculations, schedule conflict logic, enrollment transitions, student filtering/pagination, CSV, search, printable layout, student form, loading and error components. Existing shared status badges and confirmation/dialog primitives are reused. No state-management dependency was added.

## Responsive and accessibility work

All eight routes were checked at **1440×900, 768×1024 and 390×844** (24 route/viewport combinations). Document and main scroll widths match their client widths; large tables/tabs/schedules scroll within their own containers.

- Min-width constraints and stacking prevent page overflow. Helpdesk badges do not shrink/crop.
- Dialogs use viewport-relative width/height and internal scrolling. Subject tables retain readable minimum widths instead of splitting subject codes into single letters.
- Icon-only actions have accessible names; form labels are associated; filters/search are labeled; clickable rows/cards support Enter/Space; focus outlines are visible.
- Mobile navigation has a titled/described sheet with one close control. Quick-action/card controls wrap appropriately.
- COR/transcript print CSS removes the portal/dialog chrome and resets positioning, transform, animation and sizing. The visual print check found and corrected an off-page animation transform.

This is targeted accessibility verification, not a complete screen-reader or WCAG certification.

## Automated tests

71 focused tests in two suites, with deterministic test storage and browser API shims:

- Grade boundaries, invalid/malformed inputs, incomplete publication, encoding disabled, weighted GPA including failures, draft exclusion and empty GPA.
- Normalized room/instructor/section conflicts, adjacent classes, unsupported hours and required schedule fields.
- Enrollment approval, rejection remarks, prerequisite override and COR availability.
- Combined directory filtering, pagination clamping, deletion confirmation, unlinked deletion, linked-history protection, unique IDs/emails, edit synchronization, add-form persistence.
- CSV escaping/formula protection, filtered export download attributes/Blob/lifecycle.
- Announcement concrete targets plus create/edit/publish/delete workflow.
- Ticket reply/resolution and filtered selection, dashboard count changes.
- All eight routes, 404, quick action, global-search deep link, demo guard/resume, settings propagation, transcript print invocation.
- Persistence round-trip, corruption preservation, failed writes, stale-tab protection, notification preferences and Manila date boundaries.

## Verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | 0 errors, 0 application warnings; 5 retained generated UI Fast Refresh warnings (see below). |
| `npm test` | 71 passed, 2 test files. |
| `npm run build` | Passed; all eight pages emitted as separate route chunks. |
| `git diff --check` | Passed. |
| Browser routes/responsiveness | All eight pages at all three requested sizes; direct navigation and refresh checked. |
| Production-preview console | Fresh build on `127.0.0.1:5185`: all 24 route/viewport combinations, 404, announcement quick action and demo logout/refresh/resume passed with 0 console warnings/errors. |
| Shared data | Saved settings propagated after refresh; student edits reached enrollment; approval lowered Dashboard pending count 4→3; resolution lowered open-ticket count 3→2; grade publication appeared in transcript. |
| Forms/dialogs | Student Add/Edit, enrollment override/COR, invalid grade 9 rejected then 2.50 saved/published, schedule Add/save/refresh, helpdesk reply/resolve, profile, search, notifications. |
| Print | COR and transcript print-media layouts inspected; `window.print()` invocation tested. Physical printer/OS print spooler not tested. |
| CSV | Real Blob/download action implemented and tested. Browser emitted `Page.downloadWillBegin`, filename `students-2026-10-03.csv`, 1,267-byte sample payload; in-app download then reported canceled/0 bytes. A completed disk save is not claimed. |

Browser test mutations used the isolated `127.0.0.1:5184` origin with sample records, not a production service. Sample seed files were not overwritten with browser test records. A temporary HMR context error occurred while source modules were being reformatted; final verification uses a fresh production-preview session rather than treating editing-time HMR logs as release behavior.

## Dependencies and bundle

- Initial audit: **36 findings**. Final full audit: **5 high**, all in the development/build dependency chain. Net reduction: 31 reported package findings; not a claim of 31 distinct CVEs.
- `npm audit --omit=dev`: **0 vulnerabilities** after correctly classifying the config-only `tailwindcss-animate` plugin as a dev dependency.
- Compatible dependency updates were applied; Vite moved to 6.4.3, React Router DOM to 7.18.4, Recharts to 2.15.4. Vitest 4.1.11 and Testing Library provide tests. Router usage remains declarative, with no routing redesign. Router/Recharts warnings were checked in-browser.
- Remaining findings: `braces` 3.0.3 (deep nested-pattern stack-exhaustion advisory), propagated through `micromatch`, `fast-glob`, `chokidar`, and direct dev dependency `tailwindcss` 3.4.19. These packages are build-time, not frontend request handlers.
- npm's proposed complete remediation is Tailwind 4, a breaking styling/configuration migration. No patched braces release was available in the registry checked. This was deliberately not forced into the stabilization. Do not pass untrusted glob patterns to the build tooling; plan and visually validate a separate Tailwind migration or adopt an upstream compatible patch when available.
- No `npm audit fix --force` was run. The remaining full-audit nonzero exit is intentional and documented, not hidden.
- Original single JS bundle: approximately 881 KB / 247 KB gzip. The new entry shell is approximately 484 KB / 148 KB gzip, with Dashboard/Recharts approximately 427 KB / 115 KB gzip loaded separately and the other page chunks approximately 9–15 KB each. This reduces unrelated-route loading; it does **not** mean total first Dashboard bytes fell to 148 KB. Dashboard still loads its chart chunk.

Five non-actionable-for-release Fast Refresh warnings remain in generated `badge.tsx`, `button.tsx`, `form.tsx`, `navigation-menu.tsx`, and `toggle.tsx` because they export variants/hooks alongside components. Their public APIs were preserved; lint rules were not silenced. Application errors, unused imports/dead placeholders and application hook/refresh warnings were fixed.

## Files created

- `src/auth/context.ts`, `src/auth/session.tsx`
- `src/data/context.ts`, `src/data/schema.ts`, `src/data/repository.ts`, `src/data/store.tsx`, `src/data/transitions.ts`
- `src/lib/domain.ts`, `src/lib/search.ts`, `src/hooks/use-page-intent.ts`
- `src/components/shared/StudentForm.tsx`, `PrintableDocument.tsx`, `PageLoading.tsx`, `ErrorBoundary.tsx`
- `src/pages/NotFoundPage.tsx`
- `src/test/setup.ts`, `src/test/domain.test.ts`, `src/test/workflows.test.tsx`, `vitest.config.ts`
- `ADMIN_STABILIZATION_REPORT.md`

## Files modified

- Root: `.gitignore`, `README.md`, `index.html`, `package.json`, `package-lock.json`
- Routing/layout: `src/App.tsx`, `src/components/layout/AdminLayout.tsx`, `Header.tsx`, `Sidebar.tsx`
- All eight existing files under `src/pages/`
- Shared: `src/components/shared/PageHeader.tsx`, `StatusBadge.tsx`
- Narrow UI fixes: `src/components/ui/dialog.tsx`, `alert-dialog.tsx`, `command.tsx`, `input.tsx`, `textarea.tsx`
- Data/types/styles: `src/data/mock-data.ts`, `src/types/index.ts`, `src/hooks/use-toast.ts`, `src/index.css`
- Generated build caches refreshed by TypeScript: `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo` (already tracked in the baseline).

Unused UI primitives were not arbitrarily deleted. Build outputs/dependency directories are ignored. Existing tracked TypeScript build-cache files are generated artifacts, not application changes.

## Remaining work / intentionally deferred

1. Verify a completed CSV disk save in a standard browser; the in-app harness cancels it. No external browser/security setting was bypassed.
2. Resolve the five build-time audit findings through a separately validated Tailwind migration or compatible upstream fix.
3. Replace the demo session/local repository with actual authentication, Admin authorization, database RLS, durable audit history, concurrency/transactions and backup/recovery before handling real records.
4. Add production-host SPA rewrites and deployment-specific acceptance, and perform physical print/cross-browser/device QA.
5. Shared production academic-period modeling, server-side enforcement, event delivery and Student Portal remain explicitly out of scope. No keys or secrets were invented or committed.
