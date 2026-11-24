import type { Types } from "mongoose";
import type { QuestionView } from "./attempts.js";

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

/** The raw fields of an attempt this module needs. Keeps Mongoose types out of the shapes. */
export type AttemptLike = {
  _id: Types.ObjectId;
  testName: string;
  subject: string;
  totalQuestions: number;
  correctCount?: number | null;
  incorrectCount?: number | null;
  unansweredCount?: number | null;
  score?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  passPercent: number;
  status: "in_progress" | "submitted" | "expired";
  autoSubmitted?: boolean | null;
  startedAt: Date;
  deadlineAt: Date;
  submittedAt?: Date | null;
  durationSeconds: number;
};

export function toAttemptSummary(attempt: AttemptLike): AttemptSummary {
  const submitted = attempt.submittedAt ?? null;
  return {
    id: String(attempt._id),
    testName: attempt.testName,
    subject: attempt.subject,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount ?? null,
    incorrectCount: attempt.incorrectCount ?? null,
    unansweredCount: attempt.unansweredCount ?? null,
    score: attempt.score ?? null,
    percentage: attempt.percentage ?? null,
    passed: attempt.passed ?? null,
    passPercent: attempt.passPercent,
    status: attempt.status,
    autoSubmitted: Boolean(attempt.autoSubmitted),
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt.toISOString(),
    submittedAt: submitted ? submitted.toISOString() : null,
    durationSeconds: attempt.durationSeconds,
    timeTakenSeconds: submitted ? Math.max(0, Math.round((submitted.getTime() - attempt.startedAt.getTime()) / 1000)) : null,
  };
}

/** A running test: questions without the answer key, plus the server's idea of the clock. */
export type RunningTest = AttemptSummary & {
  questions: QuestionView[];
  remainingSeconds: number;
  answeredCount: number;
};
