# Online Exam Application

A mini online test application built on the **MERN stack** (MongoDB, Express, React, Node). A student signs in, starts a 10-question test drawn at random from MongoDB, answers within a 10-minute countdown, and gets a server-graded result with a question-by-question analysis. An admin can manage the question bank.

This project grew out of **Queue Desk**, the queue-management app in the same repository: the login, sign-up, forgot-password and change-password flows, the design system, the layout primitives and the auth architecture are the original ones. Only the app behind the login was replaced.

**Documentation:** [`SETUP-WINDOWS.md`](SETUP-WINDOWS.md) (beginner setup, step by step) · [`CHANGES.md`](CHANGES.md) (every created/modified/deleted file) · [`TESTING.md`](TESTING.md) (verification report).

## Application Screenshots

### 1. Login page — unchanged from Queue Desk
![Login](screenshots/login.png)

### 2. Student dashboard
![Student dashboard](screenshots/dashboard.png)

### 3. Online test screen
![Online test](screenshots/test-question.png)

### 4. Review before submitting
![Review answers](screenshots/test-review.png)

### 5. Result with question-wise analysis
![Result](screenshots/result.png)

### 6. Test history
![Test history](screenshots/history.png)

### 7. Admin question bank
![Admin](screenshots/admin.png)

### 8. Mobile and dark mode
![Mobile dashboard](screenshots/dashboard-mobile.png)

![Dark mode](screenshots/dashboard-dark.png)

## What it does

| Module | Behaviour |
| --- | --- |
| **Authentication** | Unchanged. Email + password sign-in and sign-up, validation, bcrypt (cost 12) hashes, JWT in an HttpOnly cookie (`qd_session`, 7 days), rate limiting, forgot/reset password, change password, protected routes, logout. New accounts are `student`; anyone in `ADMIN_EMAILS` becomes `admin`. |
| **Student dashboard** | Welcome message, tests attempted, latest score, average score, best result, recent attempts, a Start-new-test card and a Test-history link. |
| **Online test** | Exactly 10 multiple-choice questions, four options each, sampled from MongoDB by the API. Next/Previous, a question palette with answered/unanswered state, answer clearing, a review screen and a Submit button. The answer key is never sent while the test runs. |
| **Countdown** | 10 minutes, stored as `startedAt` / `deadlineAt` on the attempt. The browser only renders the clock; refreshing, reopening, or switching devices resumes the same attempt with the real time left. At 00:00 the test submits itself, the server marks it `expired` + `autoSubmitted` and refuses any further submit. |
| **Result** | Student name and email, score out of 10, correct / incorrect / unanswered, marks, percentage, pass or fail against a configurable pass mark, and a question-by-question breakdown with the student's answer, the correct answer and clear indicators. All calculated on the server from the stored attempt. |
| **Test history** | Every attempt of the signed-in student (test name, subject, date and time, totals, score, percentage, time taken), each opening its detailed result. The API filters by session, so one student can never read another's history — an attempt id from another account answers 404. |
| **Admin panel** | Add, edit and delete questions (question, four options, correct option, subject) with validation, saved to MongoDB. The API enforces `requireAdmin` and answers 403 to students; the page also hides itself. |

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, TanStack Router and Query, Tailwind CSS v4, Lucide icons, Sonner |
| Backend | Node 22, Express 5, TypeScript, Zod validation |
| Database | MongoDB with Mongoose |
| Auth | bcryptjs, JWT in an HttpOnly cookie, Helmet, rate limiting, Origin CSRF check |
| Tests | Node's test runner against a real in-memory MongoDB (`mongodb-memory-server`) |

## How it works

```
client/   React single-page app (Vite)      server/   Express REST API + MongoDB models
```

In development Vite serves the app on port 3000 and proxies `/api` to Express on port 4000, so cookies stay same-origin. In production Express also serves the built React app.

### REST API

| Method | Route | Who | What |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | anyone | Create a student account (name, email, password) |
| `POST` | `/api/auth/login` | anyone | Sign in |
| `POST` | `/api/auth/logout` | anyone | Clear the session cookie |
| `GET` | `/api/auth/me` | anyone | The signed-in user, or `user: null` |
| `PATCH` | `/api/auth/me` | student | Change the display name |
| `POST` | `/api/auth/forgot-password` | anyone | Email a one-time reset link |
| `POST` | `/api/auth/reset-password` | anyone | Redeem the reset token |
| `POST` | `/api/auth/change-password` | student | Change the password (signs other devices out) |
| `GET` | `/api/dashboard` | student | Totals, latest score, average, recent attempts, bank size, any open test |
| `GET` | `/api/tests/bank` | student | Question counts by subject, required per test, duration, pass mark |
| `POST` | `/api/tests` | student | Start a test (or resume the one in progress), optional `{ subject }` |
| `GET` | `/api/tests/history` | student | This student's attempts |
| `GET` | `/api/tests/:id` | student | The running test, or the graded result |
| `PATCH` | `/api/tests/:id/answers` | student | Save answers while the test runs |
| `POST` | `/api/tests/:id/submit` | student | Submit and grade (409 if already submitted) |
| `POST` | `/api/tests/:id/abandon` | student | Discard a test started by mistake (first minute only) |
| `GET` | `/api/admin/questions` | admin | Every question, including the answer key |
| `POST` | `/api/admin/questions` | admin | Add a question |
| `PUT` | `/api/admin/questions/:id` | admin | Edit a question |
| `DELETE` | `/api/admin/questions/:id` | admin | Delete a question |
| `GET` | `/api/admin/stats` | admin | Question, subject, student and admin counts |

Every route except `/api/auth/*` requires the session cookie. `/api/admin/*` additionally requires the `admin` role.

### Data model (MongoDB)

**users** — `name`, `email` (unique), `passwordHash`, `role` (`student` | `admin`), `passwordChangedAt`, timestamps.

**questions** — `text`, `options` (exactly four), `correctIndex` (0–3), `subject`, `createdBy`, timestamps.

**testattempts** — `student`, `testName`, `subject`, `questions[]` (a snapshot of `questionId`, `text`, `options`, `correctIndex`, `selectedIndex`), `totalQuestions`, `passPercent`, `durationSeconds`, `startedAt`, `deadlineAt`, `submittedAt`, `status` (`in_progress` | `submitted` | `expired`), `autoSubmitted`, `score`, `correctCount`, `incorrectCount`, `unansweredCount`, `percentage`, `passed`, timestamps.

Relationships: `testattempts.student → users._id`, `testattempts.questions[].questionId → questions._id`. Answers are copied into the attempt when the test starts, so editing or deleting a question later never changes a result the student already has.

The 30 starter questions are inserted automatically the first time the app connects to an empty database.

## Run locally

```bash
git clone https://github.com/Deepak5354/queue-management.git
cd queue-management

npm install

cp .env.example .env        # optional: with nothing set, an in-memory MongoDB is used
npm run dev                 # API on :4000, web app on :3000
```

Open <http://localhost:3000>, create an account, and start a test.

### Use a real MongoDB locally

```bash
# MongoDB Atlas: create a free cluster and copy its connection string
# mongodb://127.0.0.1:27017/test-desk        (local mongod)
# mongodb+srv://USER:PASSWORD@cluster.mongodb.net/test-desk   (Atlas)
```

Put one of them in `.env` as `MONGODB_URI`, then `npm run dev` again. The starter questions are seeded on first connect; `npm run seed` does it by hand.

### Make yourself an admin

Either add your email to `ADMIN_EMAILS` **before** registering, or promote an existing account:

```bash
npm run make-admin -- you@example.com
```

Then open `/admin` in the app.

### Tests, type checking and linting

```bash
npm test         # API + grading tests against an in-memory MongoDB
npm run typecheck
npm run lint
npm run build && npm start   # production build served by Express
```

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | in-memory DB in dev | MongoDB connection string (required in production) |
| `JWT_SECRET` | dev-only secret | Signs the session cookie (required in production) |
| `APP_URL` | `http://localhost:3000` | Public URL, used in password reset links and the CSRF origin check |
| `PORT` | `4000` | API port |
| `QUESTIONS_PER_TEST` | `10` | Questions in each test |
| `TEST_DURATION_SECONDS` | `600` | Countdown length |
| `TEST_PASS_PERCENT` | `40` | Pass mark |
| `ADMIN_EMAILS` | empty | Comma-separated emails that sign up as admins |
| `RESEND_API_KEY`, `RESET_EMAIL_FROM` | empty | Send real password reset emails instead of logging the link |
| `DEMO_SHOW_RESET_LINK` | off | Show the reset link on screen (demo sites only) |

## Deploy for free (Render + MongoDB Atlas)

1. Create a free MongoDB Atlas cluster and a database user; copy the connection string.
2. On Render, create a **Blueprint** from this repository (`render.yaml`), or a Web Service with build `npm ci --include=dev && npm run build` and start `npm start`.
3. Set `MONGODB_URI`, `JWT_SECRET` and `APP_URL` in the service environment.
4. Health check: `/api/health`.
