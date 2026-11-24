import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { Question } from "../src/models/question.js";
import { TestAttempt } from "../src/models/test-attempt.js";
import { User } from "../src/models/user.js";

/**
 * End-to-end API tests against a throwaway in-memory MongoDB.
 * Run with `npm test`.
 */

let server: Server;
let base = "";
const cookies = new Map<string, string>();

before(async () => {
  await connectDb();
  // The seeded bank is replaced with a known one so grading can be checked exactly.
  await Question.deleteMany({});
  await Question.insertMany(
    Array.from({ length: 12 }, (_, index) => ({
      text: `Practice question number ${index + 1}?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: 0,
      subject: "Practice",
    })),
  );
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  base = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";
});

after(async () => {
  // fetch keeps connections alive, so close them too or the server never closes.
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  });
  await disconnectDb();
});

type Result = { status: number; body: any };

/** A request helper that keeps one cookie jar per named user. */
async function request(
  who: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Result> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const cookie = cookies.get(who);
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookies.set(who, setCookie.split(";")[0]!);
  const json = (await response.json().catch(() => null)) as any;
  return { status: response.status, body: json };
}

const student = () => request("student", "GET", "/auth/me");

describe("auth", () => {
  test("a new account can register and is signed in", async () => {
    const result = await request("student", "POST", "/auth/register", {
      name: "Asha Rao",
      email: "asha@example.com",
      password: "secret123",
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.user.email, "asha@example.com");
    assert.equal(result.body.user.role, "student");
    const me = await student();
    assert.equal(me.body.user.name, "Asha Rao");
  });

  test("weak passwords and duplicate emails are rejected", async () => {
    const weak = await request("other", "POST", "/auth/register", {
      name: "Weak",
      email: "weak@example.com",
      password: "short",
    });
    assert.equal(weak.status, 400);
    const duplicate = await request("other", "POST", "/auth/register", {
      name: "Asha Again",
      email: "asha@example.com",
      password: "secret123",
    });
    assert.equal(duplicate.status, 409);
  });

  test("login rejects a wrong password and accepts the right one", async () => {
    const wrong = await request("other", "POST", "/auth/login", {
      email: "asha@example.com",
      password: "nope-not-it",
    });
    assert.equal(wrong.status, 401);
    const right = await request("other", "POST", "/auth/login", {
      email: "asha@example.com",
      password: "secret123",
    });
    assert.equal(right.status, 200);
  });

  test("logout ends the session", async () => {
    await request("temp", "POST", "/auth/login", { email: "asha@example.com", password: "secret123" });
    const out = await request("temp", "POST", "/auth/logout");
    assert.equal(out.status, 200);
    cookies.delete("temp");
    const me = await request("nobody", "GET", "/auth/me");
    assert.equal(me.body.user, null);
  });

  test("protected routes reject visitors", async () => {
    const dashboard = await request("anon", "GET", "/dashboard");
    assert.equal(dashboard.status, 401);
    const tests = await request("anon", "GET", "/tests/history");
    assert.equal(tests.status, 401);
  });

  test("a state-changing request from another site is blocked", async () => {
    const blocked = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example.com" },
      body: JSON.stringify({ email: "asha@example.com", password: "secret123" }),
    });
    assert.equal(blocked.status, 403);
    // Same-origin and proxied requests are allowed.
    for (const origin of [base, "http://localhost:3000", config.appUrl]) {
      const allowed = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ email: "asha@example.com", password: "nope" }),
      });
      assert.notEqual(allowed.status, 403, `origin ${origin} should not be blocked`);
    }
  });

  test("the password reset flow still works", async () => {
    const forgot = await request("anon", "POST", "/auth/forgot-password", { email: "asha@example.com" });
    assert.equal(forgot.status, 200);
    assert.ok(forgot.body.demoLink, "DEMO_SHOW_RESET_LINK is set for tests");
    const token = String(forgot.body.demoLink).split("token=")[1];
    const reset = await request("anon", "POST", "/auth/reset-password", { token, password: "brandnew123" });
    assert.equal(reset.status, 200);
    const login = await request("student", "POST", "/auth/login", {
      email: "asha@example.com",
      password: "brandnew123",
    });
    assert.equal(login.status, 200);
  });
});

describe("test flow", () => {
  let attemptId = "";
  let questions: { questionId: string; options: string[] }[] = [];

  test("the bank reports what is available", async () => {
    const bank = await request("student", "GET", "/tests/bank");
    assert.equal(bank.status, 200);
    assert.equal(bank.body.total, 12);
    assert.equal(bank.body.required, 10);
    assert.equal(bank.body.ready, true);
  });

  test("starting a test returns exactly 10 questions and no answer key", async () => {
    const started = await request("student", "POST", "/tests", {});
    assert.equal(started.status, 201);
    const attempt = started.body.attempt;
    assert.equal(attempt.questions.length, 10);
    assert.equal(attempt.totalQuestions, 10);
    assert.equal(attempt.remainingSeconds > 0, true);
    assert.equal(attempt.remainingSeconds <= config.testDurationSeconds, true);
    for (const question of attempt.questions) {
      assert.equal(question.options.length, 4);
      assert.equal("correctIndex" in question, false, "the answer key must never be sent");
      assert.equal("correctText" in question, false);
    }
    attemptId = attempt.id;
    questions = attempt.questions;
  });

  test("starting again resumes the same test instead of resetting the clock", async () => {
    const again = await request("student", "POST", "/tests", {});
    assert.equal(again.status, 200);
    assert.equal(again.body.resumed, true);
    assert.equal(again.body.attempt.id, attemptId);
  });

  test("answers can be saved part-way through", async () => {
    const saved = await request("student", "PATCH", `/tests/${attemptId}/answers`, {
      answers: { [questions[0]!.questionId]: 0, [questions[1]!.questionId]: 2 },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.submitted, false);
    const reloaded = await request("student", "GET", `/tests/${attemptId}`);
    assert.equal(reloaded.body.attempt.answeredCount, 2);
  });

  test("an attempt belonging to another student is invisible", async () => {
    await request("intruder", "POST", "/auth/register", {
      name: "Ravi Kumar",
      email: "ravi@example.com",
      password: "secret123",
    });
    const peek = await request("intruder", "GET", `/tests/${attemptId}`);
    assert.equal(peek.status, 404);
    const submitOther = await request("intruder", "POST", `/tests/${attemptId}/submit`, {});
    assert.equal(submitOther.status, 404);
  });

  test("submitting grades on the server", async () => {
    // Question 0 is answered correctly (A), question 1 incorrectly (C), the rest blank.
    const submitted = await request("student", "POST", `/tests/${attemptId}/submit`, {});
    assert.equal(submitted.status, 200);
    const result = submitted.body.result;
    assert.equal(result.totalQuestions, 10);
    assert.equal(result.score, 1);
    assert.equal(result.correctCount, 1);
    assert.equal(result.incorrectCount, 1);
    assert.equal(result.unansweredCount, 8);
    assert.equal(result.percentage, 10);
    assert.equal(result.passed, false);
    assert.equal(result.questions.length, 10);
    assert.equal(result.questions[0].isCorrect, true);
    assert.equal(result.questions[0].correctText, "Option A");
    assert.equal(result.questions[1].isCorrect, false);
    assert.equal(result.questions[1].selectedText, "Option C");
    assert.equal(result.questions[2].isUnanswered, true);
  });

  test("a second submit is refused", async () => {
    const again = await request("student", "POST", `/tests/${attemptId}/submit`, {});
    assert.equal(again.status, 409);
  });

  test("the result stays available and appears in history", async () => {
    const result = await request("student", "GET", `/tests/${attemptId}`);
    assert.equal(result.body.submitted, true);
    assert.equal(result.body.result.score, 1);
    const history = await request("student", "GET", "/tests/history");
    assert.equal(history.status, 200);
    assert.equal(history.body.attempts.length, 1);
    assert.equal(history.body.attempts[0].id, attemptId);
    assert.equal(history.body.attempts[0].percentage, 10);
  });

  test("history only shows the student's own attempts", async () => {
    const other = await request("intruder", "GET", "/tests/history");
    assert.equal(other.body.attempts.length, 0);
  });

  test("the dashboard totals are calculated from stored attempts", async () => {
    const dashboard = await request("student", "GET", "/dashboard");
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.totalAttempts, 1);
    assert.equal(dashboard.body.latest.score, 1);
    assert.equal(dashboard.body.averagePercentage, 10);
  });
});

describe("timer and auto-submission", () => {
  test("a test whose deadline has passed is graded automatically", async () => {
    const started = await request("student", "POST", "/tests", {});
    const attemptId = started.body.attempt.id as string;
    await request("student", "PATCH", `/tests/${attemptId}/answers`, {
      answers: { [started.body.attempt.questions[0].questionId]: 0 },
    });
    // Move the deadline into the past, as if the ten minutes had run out.
    await TestAttempt.updateOne(
      { _id: attemptId },
      { $set: { deadlineAt: new Date(Date.now() - 5_000) } },
    );
    const reloaded = await request("student", "GET", `/tests/${attemptId}`);
    assert.equal(reloaded.body.submitted, true);
    assert.equal(reloaded.body.result.autoSubmitted, true);
    assert.equal(reloaded.body.result.status, "expired");
    assert.equal(reloaded.body.result.score, 1);
    const second = await request("student", "POST", `/tests/${attemptId}/submit`, {});
    assert.equal(second.status, 409);
  });

  test("a submission after the deadline is marked automatic", async () => {
    const started = await request("student", "POST", "/tests", {});
    const attemptId = started.body.attempt.id as string;
    await TestAttempt.updateOne({ _id: attemptId }, { $set: { deadlineAt: new Date(Date.now() - 1_000) } });
    const submitted = await request("student", "POST", `/tests/${attemptId}/submit`, { auto: true });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.result.autoSubmitted, true);
  });
});

describe("admin", () => {
  test("a student cannot use the admin API", async () => {
    const denied = await request("student", "POST", "/admin/questions", {
      text: "A question written by a student?",
      options: ["1", "2", "3", "4"],
      correctIndex: 0,
      subject: "Practice",
    });
    assert.equal(denied.status, 403);
  });

  test("an admin can add, edit and delete a question", async () => {
    await request("admin", "POST", "/auth/register", {
      name: "Admin User",
      email: "admin@example.com",
      password: "secret123",
    });
    await User.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } });

    const created = await request("admin", "POST", "/admin/questions", {
      text: "Which company created the React library?",
      options: ["Google", "Meta", "Microsoft", "Amazon"],
      correctIndex: 1,
      subject: "React",
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.question.correctIndex, 1);

    const invalid = await request("admin", "POST", "/admin/questions", {
      text: "Too few options here?",
      options: ["only", "two"],
      correctIndex: 1,
      subject: "React",
    });
    assert.equal(invalid.status, 400);

    const updated = await request("admin", "PUT", `/admin/questions/${created.body.question.id}`, {
      text: "Which company created the React library today?",
      options: ["Google", "Meta", "Microsoft", "Amazon"],
      correctIndex: 1,
      subject: "React",
    });
    assert.equal(updated.status, 200);

    const removed = await request("admin", "DELETE", `/admin/questions/${created.body.question.id}`);
    assert.equal(removed.status, 200);
    const list = await request("admin", "GET", "/admin/questions");
    assert.equal(
      list.body.questions.some((question: { id: string }) => question.id === created.body.question.id),
      false,
    );
  });
});
