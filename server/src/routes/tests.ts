import type { Types } from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import {
  gradeAttempt,
  secondsRemaining,
  testNameFor,
  toQuestionViews,
  type AttemptQuestion,
} from "../lib/attempts.js";
import { HttpError } from "../lib/errors.js";
import { toAttemptSummary, type AttemptLike, type RunningTest } from "../lib/test-serialize.js";
import { TestAttempt } from "../models/test-attempt.js";
import { Question } from "../models/question.js";

export const testsRouter = Router();

/**
 * Every route here is scoped to the signed-in student (`req.userId`). An
 * attempt that belongs to someone else answers 404, exactly like one that does
 * not exist, so other students' attempt ids cannot be probed.
 */

/** The fields of an attempt the handlers work with. */
type AttemptDoc = AttemptLike & {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  questions: AttemptQuestion[];
};

const asDoc = (value: unknown) => value as unknown as AttemptDoc;

function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request.");
  return result.data;
}

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const answersSchema = z.record(z.string(), z.number().int().min(0).max(3).nullable());
type AnswerMap = z.infer<typeof answersSchema>;

/** Find an attempt owned by the signed-in student, or throw 404. */
async function findOwnAttempt(userId: string, attemptId: string): Promise<AttemptDoc> {
  if (!objectId.safeParse(attemptId).success) throw new HttpError(404, "That test is no longer here.");
  const attempt = await TestAttempt.findOne({ _id: attemptId, student: userId }).lean();
  if (!attempt) throw new HttpError(404, "That test is no longer here.");
  return asDoc(attempt);
}

/** A running test as the browser may see it: questions and clock, never the answer key. */
function runningTest(attempt: AttemptDoc, now = Date.now()): RunningTest {
  return {
    ...toAttemptSummary(attempt),
    questions: toQuestionViews(attempt.questions),
    remainingSeconds: secondsRemaining(attempt.deadlineAt, now),
    answeredCount: attempt.questions.filter((question) => question.selectedIndex != null).length,
  };
}

/**
 * Copy the client's answers onto an attempt. Unknown question ids are ignored,
 * and an option index that does not exist for that question is dropped, so a
 * crafted request cannot mark a question answered with an invalid value.
 */
function applyAnswers(questions: AttemptQuestion[], answers: AnswerMap): void {
  const byId = new Map(questions.map((question) => [String(question.questionId), question]));
  for (const [questionId, value] of Object.entries(answers)) {
    const question = byId.get(questionId);
    if (!question) continue;
    if (value == null) {
      question.selectedIndex = null;
      continue;
    }
    if (value < 0 || value >= question.options.length) continue;
    question.selectedIndex = value;
  }
}

/**
 * Grade an attempt and store the result. Used by manual submit and auto-submit.
 * A submission that arrives after the deadline is treated as an automatic one and
 * timestamped at the deadline. The update is conditional on the attempt still
 * being `in_progress`, so a double submit cannot grade twice.
 */
async function finalize(attempt: AttemptDoc, opts: { auto: boolean; answers?: AnswerMap }) {
  if (opts.answers) applyAnswers(attempt.questions, opts.answers);

  const now = Date.now();
  const deadline = new Date(attempt.deadlineAt).getTime();
  // A couple of seconds of slack for network latency.
  const late = now > deadline + 2_000;
  const auto = opts.auto || late;
  const grade = gradeAttempt(attempt.questions, attempt.passPercent);

  const updated = await TestAttempt.findOneAndUpdate(
    { _id: attempt._id, student: attempt.student, status: "in_progress" },
    {
      $set: {
        questions: attempt.questions,
        submittedAt: late ? new Date(deadline) : new Date(now),
        status: auto ? "expired" : "submitted",
        autoSubmitted: auto,
        score: grade.score,
        correctCount: grade.correctCount,
        incorrectCount: grade.incorrectCount,
        unansweredCount: grade.unansweredCount,
        percentage: grade.percentage,
        passed: grade.passed,
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!updated) throw new HttpError(409, "This test has already been submitted.");
  return asDoc(updated);
}

/** Full graded result, calculated from the stored answers. */
function resultPayload(attempt: AttemptDoc) {
  const grade = gradeAttempt(attempt.questions, attempt.passPercent);
  const submitted = attempt.submittedAt ?? new Date();
  return {
    id: String(attempt._id),
    testName: attempt.testName,
    subject: attempt.subject,
    passPercent: attempt.passPercent,
    durationSeconds: attempt.durationSeconds,
    score: grade.score,
    totalQuestions: grade.totalQuestions,
    correctCount: grade.correctCount,
    incorrectCount: grade.incorrectCount,
    unansweredCount: grade.unansweredCount,
    percentage: grade.percentage,
    passed: grade.passed,
    status: attempt.status,
    autoSubmitted: Boolean(attempt.autoSubmitted),
    startedAt: new Date(attempt.startedAt).toISOString(),
    submittedAt: submitted.toISOString(),
    timeTakenSeconds: Math.max(0, Math.round((submitted.getTime() - new Date(attempt.startedAt).getTime()) / 1000)),
    questions: grade.results,
  };
}

/** GET /api/tests/bank — what the question bank offers, for the dashboard. */
testsRouter.get("/bank", async (_req, res) => {
  const grouped = await Question.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$subject", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const total = grouped.reduce((sum, row) => sum + row.count, 0);
  res.json({
    ok: true,
    required: config.questionsPerTest,
    durationSeconds: config.testDurationSeconds,
    passPercent: config.passPercent,
    total,
    subjects: grouped.map((row) => ({ subject: row._id, count: row.count })),
    ready: total >= config.questionsPerTest,
  });
});

/**
 * POST /api/tests — start a test (or pick up the one already running).
 *
 * If the student already has a test in progress, that same test is returned
 * with its original deadline, so refreshing the page cannot reset the timer.
 * Body: { subject?: string } to draw the questions from a single subject.
 */
testsRouter.post("/", async (req, res) => {
  const { subject } = parse(z.object({ subject: z.string().trim().max(60).optional() }), req.body ?? {});

  const open = await TestAttempt.findOne({ student: req.userId, status: "in_progress" })
    .sort({ createdAt: -1 })
    .lean();
  if (open) {
    const openDoc = asDoc(open);
    if (secondsRemaining(openDoc.deadlineAt) === 0) {
      // The clock ran out while the student was away: grade what was saved.
      const graded = await finalize(openDoc, { auto: true });
      res.status(200).json({ ok: true, running: false, result: resultPayload(graded) });
      return;
    }
    res.json({ ok: true, running: true, resumed: true, attempt: runningTest(openDoc) });
    return;
  }

  const total = config.questionsPerTest;
  const pool = await Question.aggregate<{
    _id: Types.ObjectId;
    text: string;
    options: string[];
    correctIndex: number;
    subject: string;
  }>([...(subject ? [{ $match: { subject } }] : []), { $sample: { size: total } }]);

  if (pool.length < total) {
    throw new HttpError(
      503,
      subject
        ? `Not enough ${subject} questions yet (${pool.length} of ${total} needed). Ask an admin to add more.`
        : `The question bank needs at least ${total} questions. Ask an admin to add more.`,
    );
  }

  const now = new Date();
  const subjects = [...new Set(pool.map((question) => question.subject))];
  const testSubject = subject ?? (subjects.length === 1 ? subjects[0] : "Mixed");

  const created = await TestAttempt.create({
    student: req.userId,
    testName: testNameFor(testSubject),
    subject: testSubject,
    passPercent: config.passPercent,
    durationSeconds: config.testDurationSeconds,
    startedAt: now,
    deadlineAt: new Date(now.getTime() + config.testDurationSeconds * 1000),
    status: "in_progress",
    totalQuestions: pool.length,
    questions: pool.map((question) => ({
      questionId: question._id,
      text: question.text,
      options: question.options,
      correctIndex: question.correctIndex,
      selectedIndex: null,
    })),
  });

  res.status(201).json({ ok: true, running: true, resumed: false, attempt: runningTest(asDoc(created.toObject())) });
});

/** GET /api/tests/history — this student's attempts, newest first. */
testsRouter.get("/history", async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const attempts = await TestAttempt.find({ student: req.userId }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({
    ok: true,
    attempts: attempts.map((attempt) => toAttemptSummary(asDoc(attempt))),
  });
});

/** GET /api/tests/:attemptId — a running test, or the graded result of a finished one. */
testsRouter.get("/:attemptId", async (req, res) => {
  const attempt = await findOwnAttempt(req.userId, req.params.attemptId);
  if (attempt.status === "in_progress") {
    // The countdown belongs to the server. If it is over, grade now.
    if (secondsRemaining(attempt.deadlineAt) === 0) {
      const graded = await finalize(attempt, { auto: true });
      res.json({ ok: true, running: false, submitted: true, result: resultPayload(graded) });
      return;
    }
    res.json({ ok: true, running: true, submitted: false, attempt: runningTest(attempt) });
    return;
  }
  res.json({ ok: true, running: false, submitted: true, result: resultPayload(attempt) });
});

/**
 * PATCH /api/tests/:attemptId/answers — save progress while the test runs.
 * Body: { answers: { [questionId]: optionIndex | null } }
 */
testsRouter.patch("/:attemptId/answers", async (req, res) => {
  const { answers } = parse(z.object({ answers: answersSchema }), req.body ?? {});
  const attempt = await findOwnAttempt(req.userId, req.params.attemptId);
  if (attempt.status !== "in_progress") throw new HttpError(409, "This test has already been submitted.");

  applyAnswers(attempt.questions, answers);
  if (secondsRemaining(attempt.deadlineAt) === 0) {
    const graded = await finalize(attempt, { auto: true });
    res.json({ ok: true, running: false, submitted: true, result: resultPayload(graded) });
    return;
  }
  await TestAttempt.updateOne(
    { _id: attempt._id, student: req.userId, status: "in_progress" },
    { $set: { questions: attempt.questions } },
  );
  res.json({ ok: true, running: true, submitted: false, remainingSeconds: secondsRemaining(attempt.deadlineAt) });
});

/**
 * POST /api/tests/:attemptId/submit — submit and grade.
 * Body: { answers?: {...}, auto?: boolean }
 * Answers are optional because the client keeps saving them as the student works.
 */
testsRouter.post("/:attemptId/submit", async (req, res) => {
  const input = parse(
    z.object({ answers: answersSchema.optional(), auto: z.boolean().optional() }),
    req.body ?? {},
  );
  const attempt = await findOwnAttempt(req.userId, req.params.attemptId);
  if (attempt.status !== "in_progress") throw new HttpError(409, "This test has already been submitted.");
  const graded = await finalize(attempt, { auto: Boolean(input.auto), answers: input.answers });
  res.json({ ok: true, result: resultPayload(graded) });
});

/**
 * POST /api/tests/:attemptId/abandon — throw away a test started by mistake.
 * Only allowed in the first minute, so it cannot be used to restart a test
 * after the questions have been on screen for a while.
 */
testsRouter.post("/:attemptId/abandon", async (req, res) => {
  const attempt = await findOwnAttempt(req.userId, req.params.attemptId);
  if (attempt.status !== "in_progress") throw new HttpError(409, "This test is already finished.");
  if (Date.now() - new Date(attempt.startedAt).getTime() > 60_000) {
    throw new HttpError(409, "Too much time has passed to cancel this test. Submit it instead.");
  }
  await TestAttempt.deleteOne({ _id: attempt._id, student: req.userId, status: "in_progress" });
  res.json({ ok: true });
});
