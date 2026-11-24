/**
 * Client for the Online Test API (`/api/*`).
 *
 * Mirrors the express routes: the session is the existing HttpOnly cookie, so
 * every call is same-origin. Failures the user can fix come back as
 * `{ ok: false, error }`; a signed-out caller throws `UnauthorizedError`.
 */

export type Role = "student" | "admin";

export type SessionUser = { id: string; name: string; email: string; role: Role };

/** One question while the test is running. There is no answer key in this shape. */
export type QuestionView = {
  number: number;
  questionId: string;
  text: string;
  options: string[];
  selectedIndex: number | null;
};

export type AttemptSummary = {
  id: string;
  testName: string;
  subject: string;
  totalQuestions: number;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  passPercent: number;
  status: "in_progress" | "submitted" | "expired";
  autoSubmitted: boolean;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  durationSeconds: number;
  timeTakenSeconds: number | null;
};

export type RunningTest = AttemptSummary & {
  questions: QuestionView[];
  remainingSeconds: number;
  answeredCount: number;
};

/** One graded question, shown only after submission. */
export type GradedQuestion = QuestionView & {
  correctIndex: number;
  correctText: string;
  selectedText: string | null;
  isCorrect: boolean;
  isUnanswered: boolean;
};

export type TestResult = {
  id: string;
  testName: string;
  subject: string;
  passPercent: number;
  durationSeconds: number;
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentage: number;
  passed: boolean;
  status: "in_progress" | "submitted" | "expired";
  autoSubmitted: boolean;
  startedAt: string;
  submittedAt: string;
  timeTakenSeconds: number;
  questions: GradedQuestion[];
};

export type DashboardStats = {
  ok: true;
  totalAttempts: number;
  averagePercentage: number | null;
  bestPercentage: number | null;
  totalCorrect: number;
  passedCount: number;
  latest: {
    id: string;
    score: number | null;
    totalQuestions: number;
    percentage: number | null;
    passed: boolean | null;
    submittedAt: string;
  } | null;
  recent: AttemptSummary[];
  bank: { total: number; required: number; ready: boolean };
  openAttemptId: string | null;
};

export type BankInfo = {
  ok: true;
  required: number;
  durationSeconds: number;
  passPercent: number;
  total: number;
  subjects: { subject: string; count: number }[];
  ready: boolean;
};

export type AdminQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  subject: string;
  createdAt: string;
};

export type AdminStats = {
  ok: true;
  questions: number;
  students: number;
  admins: number;
  subjects: { subject: string; count: number }[];
};

type Fail = { ok: false; error: string; status?: number };
export type Ok<T extends object = object> = { ok: true } & T;

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export function isUnauthorizedError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { message?: unknown; status?: unknown; name?: unknown };
  return value.status === 401 || value.name === "UnauthorizedError" || value.message === "Unauthorized";
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: method === "GET" ? undefined : { "content-type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  if (response.status === 401) throw new UnauthorizedError();
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (json as { error?: unknown } | null)?.error;
    return {
      ok: false,
      status: response.status,
      error: typeof error === "string" ? error : "Something went wrong. Please try again.",
    } as T;
  }
  return json as T;
}

const id = (value: string) => encodeURIComponent(value);

// ── Session ───────────────────────────────────────────────────────

/** The signed-in user, or `null` for a visitor. Never throws for a visitor. */
export async function loadSession(): Promise<{ user: SessionUser | null }> {
  const result = await call<{ ok: true; user: SessionUser | null }>("GET", "/auth/me");
  return { user: result.user ?? null };
}

// ── Student data ──────────────────────────────────────────────────

export const loadDashboard = () => call<DashboardStats>("GET", "/dashboard");

export const loadBank = () => call<BankInfo>("GET", "/tests/bank");

export type HistoryResponse = Ok<{ attempts: AttemptSummary[] }> | Fail;

export const loadHistory = () => call<HistoryResponse>("GET", "/tests/history");

export type StartTestResponse =
  | Ok<{ running: true; resumed: boolean; attempt: RunningTest }>
  | Ok<{ running: false; result: TestResult }>
  | Fail;

export const startTest = (subject?: string) => call<StartTestResponse>("POST", "/tests", subject ? { subject } : {});

export type AttemptResponse =
  | Ok<{ running: true; submitted?: false; attempt: RunningTest }>
  | Ok<{ running: false; submitted?: true; result: TestResult }>
  | Fail;

export const getAttempt = (attemptId: string) => call<AttemptResponse>("GET", `/tests/${id(attemptId)}`);

export type SaveAnswersResponse =
  | Ok<{ running: true; submitted: false; remainingSeconds: number }>
  | Ok<{ running: false; submitted: true; result: TestResult }>
  | Fail;

export const saveAnswers = (attemptId: string, answers: Record<string, number | null>) =>
  call<SaveAnswersResponse>("PATCH", `/tests/${id(attemptId)}/answers`, { answers });

export type SubmitResponse = Ok<{ result: TestResult }> | Fail;

export const submitTest = (attemptId: string, input: { auto?: boolean; answers?: Record<string, number | null> } = {}) =>
  call<SubmitResponse>("POST", `/tests/${id(attemptId)}/submit`, input);

export const abandonTest = (attemptId: string) => call<Ok | Fail>("POST", `/tests/${id(attemptId)}/abandon`);

// ── Admin ─────────────────────────────────────────────────────────

export const adminStats = () => call<AdminStats>("GET", "/admin/stats");

export const adminListQuestions = () => call<Ok<{ questions: AdminQuestion[] }>>("GET", "/admin/questions");

export const adminCreateQuestion = (input: {
  text: string;
  options: string[];
  correctIndex: number;
  subject: string;
}) => call<Ok<{ question: AdminQuestion }> | Fail>("POST", "/admin/questions", input);

export const adminUpdateQuestion = (
  questionId: string,
  input: { text: string; options: string[]; correctIndex: number; subject: string },
) => call<Ok<{ question: AdminQuestion }> | Fail>("PUT", `/admin/questions/${id(questionId)}`, input);

export const adminDeleteQuestion = (questionId: string) =>
  call<Ok | Fail>("DELETE", `/admin/questions/${id(questionId)}`);
