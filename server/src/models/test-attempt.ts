import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * One question as it was presented in a test. The text and options are copied
 * when the test starts, so editing or deleting a question later never changes
 * an attempt a student already took.
 */
const attemptQuestionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    /** Where the right answer sits in `options`. Stripped before the test is sent. */
    correctIndex: { type: Number, required: true },
    selectedIndex: { type: Number, default: null },
  },
  { _id: false },
);

/**
 * A single test attempt. The timer lives here: `startedAt` is written by the
 * server when the test begins, so refreshing the page cannot restart it, and
 * `submittedAt` is checked against `deadlineAt` on the server.
 */
const testAttemptSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    testName: { type: String, required: true, trim: true, maxlength: 80 },
    subject: { type: String, required: true, trim: true, maxlength: 60 },
    questions: { type: [attemptQuestionSchema], required: true },
    totalQuestions: { type: Number, required: true },
    /** Percentage needed to pass, fixed when the test starts. */
    passPercent: { type: Number, required: true, default: 40 },
    durationSeconds: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    status: { type: String, enum: ["in_progress", "submitted", "expired"], default: "in_progress", index: true },
    /** True when the submission happened after the deadline (clock ran out). */
    autoSubmitted: { type: Boolean, default: false },
    // ── Results, filled in by the server on submission ──
    score: { type: Number, default: null },
    correctCount: { type: Number, default: null },
    incorrectCount: { type: Number, default: null },
    unansweredCount: { type: Number, default: null },
    percentage: { type: Number, default: null },
    passed: { type: Boolean, default: null },
  },
  { timestamps: true },
);

testAttemptSchema.index({ student: 1, createdAt: -1 });

export type TestAttemptDoc = InferSchemaType<typeof testAttemptSchema>;
export const TestAttempt = model("TestAttempt", testAttemptSchema);
