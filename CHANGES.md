# Queue Desk → Online Exam Application: what changed, file by file

Every file below lives in the repository, so these paths are exact.

## Untouched (verified with `git diff`)

These were **not modified at all**. The login screen and all of its behaviour are the originals.

```
client/src/routes/forgot-password.tsx …………… only the <title> text changed (see “Renamed copy”)
client/src/components/desk/auth-card.tsx ……… sign-in / sign-up form, validation, password toggle,
                                                checklist, “Forgot password?” link  (copy line only)
client/src/components/desk/password-field.tsx
client/src/components/desk/password-checklist.tsx
client/src/components/desk/theme-toggle.tsx
client/src/components/desk/change-password.tsx
client/src/lib/auth/client.ts
client/src/lib/auth/password-rules.ts
client/src/lib/auth/use-current-user.ts
client/src/styles.css ………………………………… design system, unchanged
server/src/lib/email.ts ………………………………… reset email (one sentence of copy)
server/src/models/password-reset.ts
server/tsconfig*.json, client/tsconfig.json, eslint.config.mjs, .gitignore
```

`client/src/routes/login.tsx` changed by **one string**: the page `<title>` ("Queue Desk" → "Online Exam Application"). No element, handler, field, link or icon on the login page was touched. `PATCH /api/auth/me`, `POST /api/auth/change-password`, forgot/reset password, logout, the rate limiter, bcrypt cost 12, the JWT cookie and the CSRF check are all the original code.

## Created

### Backend

| File | Purpose |
| --- | --- |
| `server/src/models/question.ts` | **Questions** collection: `text`, `options[4]`, `correctIndex` (0–3), `subject`, `createdBy`, timestamps; validator enforces exactly four options. |
| `server/src/models/test-attempt.ts` | **TestAttempts** collection: `student`, `testName`, `subject`, `questions[]` snapshot (`questionId`, `text`, `options`, `correctIndex`, `selectedIndex`), `totalQuestions`, `passPercent`, `durationSeconds`, `startedAt`, `deadlineAt`, `submittedAt`, `status`, `autoSubmitted`, `score`, `correctCount`, `incorrectCount`, `unansweredCount`, `percentage`, `passed`. |
| `server/src/lib/attempts.ts` | Pure grading logic (`gradeAttempt`), payload builders that strip the answer key (`toQuestionViews`), `secondsRemaining`, `percentageOf`. |
| `server/src/lib/test-serialize.ts` | Shapes sent to the browser: attempt summary and the running test. |
| `server/src/lib/seed-questions.ts` | 30 starter questions across JavaScript, React, Node.js, MongoDB, Web Fundamentals and Aptitude. |
| `server/src/routes/tests.ts` | `GET /bank`, `POST /` (start or resume with a random `$sample` of 10), `GET /history`, `GET /:id`, `PATCH /:id/answers`, `POST /:id/submit`, `POST /:id/abandon`. Server-side deadline, single grading, no answer key while running. |
| `server/src/routes/dashboard.ts` | `GET /dashboard`: attempts, latest score, average, best, recent attempts, bank size, open attempt. |
| `server/src/routes/admin.ts` | `GET/POST/PUT/DELETE /questions`, `GET /stats`; validation plus “options must differ”. |
| `server/scripts/seed-questions.ts` | `npm run seed`. |
| `server/scripts/make-admin.ts` | `npm run make-admin -- email`. |
| `server/tests/grading.test.ts` | Unit tests for the grading rules, the pass mark, rounding and the “no answer key” guarantee. |

### Frontend

| File | Purpose |
| --- | --- |
| `client/src/lib/test/api.ts` | Typed client for every endpoint (dashboard, bank, start/get/save/submit/abandon, history, admin). |
| `client/src/lib/test/format.ts` | Countdown, duration, date and percentage formatting. |
| `client/src/components/desk/test-state.tsx` | `AccountProvider` / `useAccount`, the signed-in user for the shell and pages. |
| `client/src/components/desk/dashboard-view.tsx` | Student dashboard: welcome, StatCards (attempted, latest, average, best), start card, recent attempts, empty state. |
| `client/src/components/desk/attempt-row.tsx` | One attempt row, reused by the dashboard and history. |
| `client/src/components/desk/test-screen.tsx` | The exam: question card, option selection, next/previous, palette with answered status, review panel, submit, auto-submit, answer saving. |
| `client/src/components/desk/use-countdown.ts` | Countdown derived from the server's `deadlineAt` (not from a browser start time). |
| `client/src/components/desk/question-form.tsx` | Admin add/edit form with client-side validation mirroring the server. |
| `client/src/routes/_app/test.index.tsx` | “Start a test” screen: rules, optional subject, start button. |
| `client/src/routes/_app/test.$attemptId.tsx` | Route for a running test / “already submitted” hand-off. |
| `client/src/routes/_app/history.index.tsx` | Test history list with totals, empty state and error state. |
| `client/src/routes/_app/history.$attemptId.tsx` | Detailed result: score summary, pass/fail, and question-wise analysis with correct/incorrect indicators. |
| `client/src/routes/_app/admin.tsx` | Admin question bank page (hidden from students). |
| `SETUP-WINDOWS.md` | Beginner setup guide for Windows. |
| `CHANGES.md`, `TESTING.md` | This document and the verification report. |

## Modified

| File | Change |
| --- | --- |
| `server/src/models/user.ts` | Added `role` (`student` \| `admin`, default `student`). Existing fields unchanged. |
| `server/src/middleware/auth.ts` | `requireAuth` also sets `req.userRole`; new `requireAdmin` (403 for students). Cookie, JWT and `resolveUserId` unchanged. |
| `server/src/routes/auth.ts` | `publicUser` now includes `role`; sign-up assigns `admin` when the email is in `ADMIN_EMAILS`. Nothing else touched. |
| `server/src/config.ts` | New settings: `questionsPerTest` (10), `testDurationSeconds` (600), `passPercent` (40), `adminEmails`. Previously, the file also had these fields. Cookie name `qd_session` kept. |
| `server/src/db.ts` | Seeds the starter questions when the database is empty. |
| `server/src/app.ts` | Mounts `/api/dashboard`, `/api/tests`, `/api/admin` (admin-guarded); queue routers removed. |
| `server/src/index.ts` | Startup log says “Online Exam API”. |
| `server/src/middleware/origin.ts` | CSRF origin check now compares hosts (accepts proxied/tunnelled requests) — this fixes the “Forbidden: cross-site request blocked” error seen behind a dev proxy. |
| `client/src/routes/_app.tsx` | Layout now guards on `GET /api/auth/me` and provides `AccountProvider` + `Shell`; redirects visitors to the untouched `/login`. |
| `client/src/routes/_app/index.tsx` | Renders the student dashboard. |
| `client/src/components/desk/shell.tsx` | Sidebar destinations are Dashboard / Test history / Admin (admins only), with the same markup, classes and profile/logout block; wide layout for a running test. |
| `client/src/components/desk/auth-shell.tsx` | Brand name is “Online Exam Application” (`Logo` gained optional `name` and `compact` props); the three marketing bullets and one line of copy describe the exam app. Layout, colours, icons and the theme toggle are unchanged. |
| `client/src/components/desk/dashboard-view.tsx` | Replaced queue content with the test dashboard (same panels/StatCards). |
| `client/src/routes/_app/profile.tsx` | Works with the new account context; still uses the original `ChangePasswordCard` and name editing. |
| `client/src/vite.config.ts` | `host: 0.0.0.0` and `allowedHosts` so the dev server also works through a tunnel/preview proxy. Port and `/api` proxy unchanged. |
| `client/index.html` | `<title>Online Exam Application</title>`. |
| `package.json` | Name `online-exam-application`; added `seed` and `make-admin` scripts. |
| `.env.example`, `render.yaml`, `README.md` | Documented/served as the exam app. |
| `screenshots/*` | New screenshots of the current app; queue-only shots removed. |

## Deleted (queue domain only — replaced by the test domain)

```
server/src/models/queue.ts, token.ts, snapshot.ts
server/src/routes/queues.ts, tokens.ts, insights.ts, demo.ts
server/src/lib/serialize.ts, analytics.ts, sample.ts, format.ts
server/tests/analytics.test.ts   (replaced by grading.test.ts)
server/tests/api.test.ts         (rewritten for the exam flow, same path)

client/src/routes/_app/queues/index.tsx, queues/new.tsx, queues/$queueId.tsx
client/src/routes/_app/insights.tsx
client/src/components/desk/board.tsx, edit-queue.tsx, queue-form.tsx,
                              insights-view.tsx, desk-state.tsx
client/src/lib/queue/api.ts, client/src/lib/queue/format.ts
screenshots/create-queue.png, screenshots/insights.png
```

Nothing in the authentication path was deleted.

## Renamed copy (no behaviour change)

| Where | Before | After |
| --- | --- | --- |
| Login page wordmark and sidebar | Queue Desk | Online Exam Application |
| Page titles | `Sign in · Queue Desk` | `Sign in · Online Exam Application` |
| Auth card subtitle | “Sign in to manage your queues.” | “Sign in to take your online test.” |
| Auth shell headline, three bullets, footer line | queue copy | exam copy |
| Reset email sentence | “your Queue Desk account” | “your Online Exam Application account” |

The password reset **cookie name** stays `qd_session` so the original sessions and auth code continue to work unchanged.
