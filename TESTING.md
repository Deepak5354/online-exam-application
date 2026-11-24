# Testing and verification report

Everything below was executed against the finished project, not assumed. Commands are exactly what was run.

## 1. Automated tests — `npm test`

Node's test runner against a real in-memory MongoDB (`mongodb-memory-server`). Result:

```
# tests 29   # pass 29   # fail 0   # cancelled 0
```

| Suite | Checks |
| --- | --- |
| `auth` (7) | register signs the student in; weak password rejected (400); duplicate email rejected (409); wrong password rejected (401), right password accepted; logout clears the session; protected routes answer 401 for visitors; **a POST from another Origin is blocked with 403 while same-origin / localhost:3000 are allowed**; password reset end-to-end (forgot → token → reset → login with the new password). |
| `test flow` (10) | `/tests/bank` reports the bank; **start returns exactly 10 questions, 4 options each, and the payload contains no `correctIndex`/`correctText`**; starting again **resumes the same attempt** (same id, clock not reset); answers save partially; another student gets **404** for the attempt and cannot submit it; submit grades on the server (1 correct / 1 incorrect / 8 unanswered → 10%, fail); **second submit is 409**; result stays readable; history lists only the student's own attempt; dashboard totals match. |
| `timer and auto-submission` (2) | an attempt whose `deadlineAt` passed is graded automatically on read, marked `expired` + `autoSubmitted`, and can no longer be submitted; a submit sent after the deadline is marked automatic. |
| `admin` (2) | a student gets **403** from `POST /admin/questions`; an admin can create, edit, delete a question, and a two-option question is rejected (400). |
| `grading` (8, unit) | correct/incorrect/unanswered counted separately; all-blank scores 0 and fails; 100% case; pass mark inclusive and configurable; one-decimal rounding (2/3 = 66.7); graded question keeps both answers; **a running question carries no answer key**; seconds remaining never negative. |

## 2. Static checks

| Command | Result |
| --- | --- |
| `npm run typecheck` (client + server, strict) | **0 errors** |
| `npm run lint` | **0 errors** (3 `react-refresh` hints in `test-state.tsx`, which exports a provider alongside hooks — cosmetic, same warning style the project already had) |
| `npm run build` | client bundle + `tsc` server build succeed |
| Production server (`node server/dist/index.js`) | `/api/health` 200, `/login` 200, `/history` 200 (SPA fallback works) |
| Browser console during a full UI walk-through | **no errors, no failed requests** |

## 3. Browser walk-through (headless Chromium, real clicks)

| # | Check | Result |
| --- | --- | --- |
| 1 | Login page loads, unchanged layout, “Welcome back”, email, password, eye toggle, “Forgot password?”, “Sign in”, “New here? Create an account” | Pass |
| 2 | Sign-up tab: name, email, password + live checklist (≥8 chars, one letter, one number), confirm password, “Passwords match.” | Pass |
| 3 | Sign-up → lands on the student dashboard | Pass |
| 4 | Dashboard: greeting, tests attempted, latest score, average score, best result, recent attempts, Start new test, Test history | Pass |
| 5 | Start a test: exactly 10 questions, 4 options, timer at **10:00** | Pass |
| 6 | Answer selection, Next, Previous, palette jump, “Clear answer”, answered/unanswered indicators, `n/10` counter | Pass |
| 7 | Review screen lists all 10 with the chosen answers and warns about unanswered ones | Pass |
| 8 | Manual submit → result page | Pass |
| 9 | **Auto-submit**: with the API configured to a 20-second test, the page submitted itself and landed on the result marked “submitted automatically when time ran out” | Pass |
| 10 | **Refresh cannot reset the timer**: 00:18 → reload → 00:16 (continued from the server deadline) | Pass |
| 11 | Reopening `/test` while a test is running resumes it instead of starting a new one | Pass |
| 12 | Result page: name, email, score 2/10, correct 2, incorrect 2, unanswered 6, percentage, pass/fail badge, per-question analysis with your answer, correct answer and green/red/unanswered indicators | Pass |
| 13 | Test history: date/time, totals, score, percentage, per-attempt correct/incorrect/unanswered, opens the detail page | Pass |
| 14 | A second account sees an empty history and gets **404** for the first account's attempt id | Pass |
| 15 | Forgot password: link opens `/forgot-password`, email submits, the reset link is shown in demo mode (and printed in the API console); the reset page works, then login with the new password succeeds | Pass |
| 16 | Profile page: name edit, email (read-only), original Change password card | Pass |
| 17 | Admin: as `admin@example.com` the sidebar shows **Admin**; the page lists the bank, adds a question through the form (appears immediately), and blocks empty submissions with “Write at least 10 characters.” / “Fill in this option.” | Pass |
| 18 | Admin page for a student account shows “Admins only” and the API answers **403** | Pass |
| 19 | Logout returns to the login page and protected routes redirect to login | Pass |
| 20 | Responsive: dashboard, test start, admin at 390 × 844 (mobile) and 1440 px (desktop); dark mode toggle | Pass |

## 4. Bug found during testing and fixed

**“Forbidden: cross-site request blocked” when signing up through a proxied URL.**

* *Cause:* the CSRF origin check compared the full origin including the scheme (`http` vs `https`). Behind a TLS-terminating proxy or dev tunnel, Express sees `http` while the browser sends `https`, so legitimate requests were rejected — exactly the screenshot you sent.
* *Fix:* `server/src/middleware/origin.ts` now compares the **host** of the request/Origin against the request host, `APP_URL` and (in development) `localhost:3000`, which is proxy-safe.
* *Regression check:* a new automated test asserts another origin is still rejected (403) while same-origin, `http://localhost:3000` and `APP_URL` are accepted; the whole suite and the browser walk-through were re-run afterwards.

Two smaller issues found and fixed in the same pass: the result page could briefly show “still running” because it shared a cache key with the test screen (now always refetches, and the graded result is seeded after submit), and the admin question list stretched the page on long banks (now scrolls inside its panel).

## 5. Environment note (not a code issue)

The in-memory MongoDB used by `npm test` refuses to start when the temp volume has less than ~500 MB free (`Mongod internal error (fassert() … "available disk space … is less than required")`). While testing here this produced a burst of failures that disappeared after clearing leftover `/tmp/mongo-mem-*` folders; the suite then passed 29/29 again. On Windows, the equivalent is a nearly full `C:` drive — free some space if `npm test` fails to start MongoDB.

## 6. What is verified vs. what needs your machine

* Verified here: server + client build, all 29 tests, the full student and admin flows in a real browser, the timer/auto-submit/refresh behaviour, and the production server serving the SPA.
* Verified against **MongoDB** using an in-memory MongoDB server (same driver, same Mongoose models). A connection to **your** Atlas cluster or local `mongod` cannot be made from this environment — the first `npm run dev` on your machine with `MONGODB_URI` set is the one step I could not run for you. If it fails it will be a credentials/network-access issue on the Atlas side, and `SETUP-WINDOWS.md` lists the exact fixes.
* Real password-reset **emails** need `RESEND_API_KEY` + `RESET_EMAIL_FROM`; without them (and with `DEMO_SHOW_RESET_LINK=true`) the link is shown on screen and printed in the API console — that path is tested.
