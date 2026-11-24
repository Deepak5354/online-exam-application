# Running the Online Exam Application on Windows — step by step

This guide assumes **no prior setup**. Follow it top to bottom; every command is included.

The project is one folder with two parts that run together:

```
online-exam-application/
├── client/     React frontend (Vite, port 3000)
├── server/     Express + MongoDB backend (port 4000)
├── README.md
├── SETUP-WINDOWS.md   ← this file
└── .env.example
```

You do **not** need two terminals: one command (`npm run dev`) starts both the frontend and the backend. The separate-terminal method is at the end if you prefer it.

---

## Step 1 — Install the required software

| Software | Version | Why |
| --- | --- | --- |
| Node.js | **20 LTS or newer** (22 LTS recommended) | Runs both the frontend and the backend |
| npm | comes with Node | Installs the dependencies |
| MongoDB | Community Server 7 **or** a free MongoDB Atlas account | The database |
| Git (optional) | any | Only if you clone instead of downloading the ZIP |
| A browser | Chrome / Edge / Firefox | To use the app |

### 1a. Node.js

1. Go to <https://nodejs.org> and download the **LTS** installer for Windows (`.msi`).
2. Run it and keep clicking *Next* (the default options are fine, leave "Add to PATH" checked).
3. Open **PowerShell** (press `Win`, type `powershell`, press Enter) and check:

```powershell
node --version
npm --version
```

You should see something like `v22.14.0` and `10.9.2`. If you see "not recognized", close and reopen PowerShell, or reinstall Node with the PATH option enabled.

> **PowerShell script policy error?** If `npm` says *"running scripts is disabled on this system"*, run this once and try again:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### 1b. MongoDB — choose ONE of the two options

**Option A — MongoDB Atlas (free cloud database, easiest, recommended)**

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> (free, no card).
2. Create a **free M0 cluster** (any provider/region near you).
3. When asked, create a database user: choose a username (e.g. `examuser`) and a password — **write both down**.
4. Under *Network Access*, add an IP address and choose **Allow access from anywhere** (`0.0.0.0/0`) for local development.
5. Click **Connect → Drivers** and copy the connection string. It looks like:

```
mongodb+srv://examuser:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. Replace `<db_password>` with your real password, and insert the database name `online-exam` before the `?`:

```
mongodb+srv://examuser:YourPassword@cluster0.xxxxx.mongodb.net/online-exam?retryWrites=true&w=majority
```

That full string is your `MONGODB_URI`. Keep it for Step 4.

> If your password contains `@`, `:`, `/` or `?`, URL-encode it (`@` → `%40`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`).

**Option B — MongoDB installed locally**

1. Download **MongoDB Community Server** for Windows: <https://www.mongodb.com/try/download/community>.
2. Run the installer → choose **Complete** → keep "Install MongoDB as a Service" checked (it then starts automatically).
3. Optionally install **MongoDB Compass** (a GUI to look at your data) when the installer offers it.
4. Your connection string is:

```
mongodb://127.0.0.1:27017/online-exam
```

To check it is running, open PowerShell:

```powershell
Get-Service MongoDB
```

`Status` should say `Running`. If not: `Start-Service MongoDB` (in an **Administrator** PowerShell).

---

## Step 2 — Get the project onto your computer

1. Download `online-exam-application.zip`.
2. Right-click the ZIP → **Extract All…** → choose a folder **without spaces or special characters**, e.g. `C:\dev\online-exam-application`.
3. Open that folder in PowerShell:

```powershell
cd C:\dev\online-exam-application
```

> Avoid extracting into `C:\Program Files` (permissions) or keeping the files inside the ZIP preview window.

---

## Step 3 — Install the dependencies

With PowerShell inside the project folder:

```powershell
npm install
```

This installs everything for both the frontend and the backend (one `package.json` covers both). It takes 1–3 minutes and creates a `node_modules` folder. Warnings about *engine* or *deprecated* packages are normal and harmless.

---

## Step 4 — Create the environment file

1. In the project folder, copy the example file:

```powershell
Copy-Item .env.example .env
```

2. Open `.env` in Notepad (or VS Code):

```powershell
notepad .env
```

3. Uncomment (remove the leading `#`) and fill in these two lines — leave everything else commented:

```ini
MONGODB_URI=mongodb+srv://examuser:YourPassword@cluster0.xxxxx.mongodb.net/online-exam?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-long-random-string
```

* Use the string from Step 1b for `MONGODB_URI`.
* `JWT_SECRET` can be any long random text. To generate one:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Optional — make yourself an admin so you can see the Admin panel:

```ini
ADMIN_EMAILS=you@example.com
```

   You must use **this email** when you sign up, or promote an account later with `npm run make-admin -- you@example.com`.
5. Save the file (`Ctrl+S`) and close Notepad.

> **Skipping Step 4?** The app still runs: with no `MONGODB_URI` it starts a temporary in-memory MongoDB (data disappears when you stop the server) and uses a development secret. Good for a quick look, not for real work.

---

## Step 5 — Start the application

```powershell
npm run dev
```

You will see two coloured logs: the API (`api`) and the web app (`web`). After a few seconds:

```
[db] Seeded 30 starter questions.
[server] Online Exam API listening on http://localhost:4000
  ➜  Local:   http://localhost:3000/
```

Open your browser at **<http://localhost:3000>**.

Leave this PowerShell window open — closing it stops the app.

---

## Step 6 — Use it

1. **Sign up:** on <http://localhost:3000/login> click **Create an account**, enter a name, email and a password (at least 8 characters with a letter and a number), then **Create account**.
2. **Dashboard:** after signing up you land on the student dashboard — tests attempted, latest score, average score, recent attempts.
3. **Start a test:** click **Start new test** → **Start test** (or **Mixed test**). Ten questions appear with the timer at **10:00**.
4. **Answer:** click an option, use **Next** / **Previous**, or jump with the numbered palette. Answers are saved as you go.
5. **Review & submit:** **Submit test** opens the review list; use **Submit now** to finish. At 00:00 the test submits itself.
6. **Result:** score out of 10, correct / incorrect / unanswered, percentage, pass or fail, and every question with your answer and the right answer.
7. **History:** **Test history** in the sidebar lists every attempt; click one to reopen its result.
8. **Admin (optional):** sign in with the email in `ADMIN_EMAILS`, open **Admin**, and add/edit/delete questions.
9. **Log out:** the button at the bottom of the sidebar.

---

## Local URLs

| What | URL |
| --- | --- |
| Web app (frontend) | <http://localhost:3000> |
| Login page | <http://localhost:3000/login> |
| API (backend) | <http://localhost:4000/api> |
| Health check | <http://localhost:4000/api/health> |

If port 3000 or 4000 is already in use, stop the other program (or change `PORT` in `.env` for the API and the `server.port` value in `client/vite.config.ts` for the frontend).

---

## Running the frontend and backend in two separate terminals (optional)

```powershell
# Terminal 1 — backend API on http://localhost:4000
cd C:\dev\online-exam-application
npm run dev:server
```

```powershell
# Terminal 2 — frontend on http://localhost:3000
cd C:\dev\online-exam-application
npm run dev:client
```

The frontend proxies `/api` calls to port 4000 automatically, so open only <http://localhost:3000>.

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start frontend + backend (development) |
| `npm run dev:server` / `npm run dev:client` | Start one side only |
| `npm test` | Run the API and grading tests (uses a temporary in-memory MongoDB) |
| `npm run typecheck` | TypeScript check for frontend and backend |
| `npm run lint` | ESLint |
| `npm run seed` | Insert the 30 starter questions if the bank is empty |
| `npm run make-admin -- you@example.com` | Promote an existing account to admin |
| `npm run build` | Production build (frontend into `client/dist`, backend into `server/dist`) |
| `npm start` | Run the production build on <http://localhost:4000> (serves the web app too) |

---

## Troubleshooting

| Message / symptom | Cause and fix |
| --- | --- |
| `node` or `npm` is not recognized | Node is not installed or not on PATH. Reinstall Node (LTS) and reopen PowerShell. |
| `running scripts is disabled on this system` | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once, then retry. |
| `ECONNREFUSED 127.0.0.1:27017` | Local MongoDB is not running. `Start-Service MongoDB` in an Administrator PowerShell, or switch to Atlas. |
| `Could not connect to any servers in your MongoDB Atlas cluster` | Atlas: your IP is not allowed. Add your IP (or `0.0.0.0/0`) under *Network Access*, and check the password inside `MONGODB_URI`. |
| `MONGODB_URI is required in production` | You ran `npm start` (production) without `MONGODB_URI` in `.env`. Use `npm run dev`, or set the variable. |
| Page loads but every action says "Could not reach the server" | The backend is not running. Restart `npm run dev` and check the `api` log for errors. |
| Port 3000 / 4000 already in use | Another program (or a previous run) owns the port. Close it, or change the ports as described above. |
| "The question bank needs at least 10 questions" | The database has fewer than 10 questions. Run `npm run seed`, or add questions in **Admin**. |
| Data disappears after restarting | You are on the in-memory database (no `MONGODB_URI`). Set `MONGODB_URI` in `.env` for a persistent database. |
| Forgot-password shows no email | Email is optional in development: the reset link is printed in the **backend** terminal (`[password-reset] … Reset link for …`). Copy it into the browser. |
| Sign-up says "Forbidden: cross-site request blocked" | Open the app through the URL shown by the frontend (<http://localhost:3000>), not by opening `client/index.html` directly from disk. |

---

## Resetting the database

* **Atlas / local MongoDB:** open a shell (Compass → *Mongosh*, or `mongosh`) and drop the collections:

```js
use online-exam
db.users.drop(); db.questions.drop(); db.testattempts.drop(); db.passwordresets.drop()
```

Restart the server — the 30 starter questions are seeded again automatically. You can also just delete all accounts through the app's admin panel and create a new one.

* **In-memory database:** stop the server (in-memory data is gone) and start it again.
