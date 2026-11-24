import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/errors.js";
import { Question } from "../models/question.js";
import { User } from "../models/user.js";

/**
 * Admin-only question management. `requireAdmin` is applied in app.ts, so an
 * ordinary student never reaches these handlers.
 */
export const adminRouter = Router();

function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request.");
  return result.data;
}

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "That question is no longer here.");

const questionSchema = z.object({
  text: z.string().trim().min(10, "Write at least 10 characters for the question.").max(500, "Keep the question under 500 characters."),
  options: z
    .array(z.string().trim().min(1, "Every option needs some text.").max(200, "Keep each option under 200 characters."))
    .length(4, "A question needs exactly four options."),
  correctIndex: z.number().int().min(0).max(3),
  subject: z.string().trim().min(2, "Give the question a subject.").max(60, "Keep the subject under 60 characters."),
});

const questionPayload = (question: {
  _id: unknown;
  text: string;
  options: string[];
  correctIndex: number;
  subject: string;
  createdAt?: Date;
}) => ({
  id: String(question._id),
  text: question.text,
  options: question.options,
  correctIndex: question.correctIndex,
  subject: question.subject,
  createdAt: question.createdAt ? question.createdAt.toISOString() : new Date().toISOString(),
});

/** GET /api/admin/questions — every question, including the answer key. */
adminRouter.get("/questions", async (_req, res) => {
  const questions = await Question.find().sort({ subject: 1, createdAt: -1 }).lean();
  res.json({ ok: true, questions: questions.map(questionPayload) });
});

/** GET /api/admin/stats — a small overview for the admin page. */
adminRouter.get("/stats", async (_req, res) => {
  const [questions, students, admins] = await Promise.all([
    Question.countDocuments(),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "admin" }),
  ]);
  const bySubject = await Question.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$subject", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({
    ok: true,
    questions,
    students,
    admins,
    subjects: bySubject.map((row) => ({ subject: row._id, count: row.count })),
  });
});

/** POST /api/admin/questions — add one question to the bank. */
adminRouter.post("/questions", async (req, res) => {
  const input = parse(questionSchema, req.body);
  // Two options with the same text would make the right answer ambiguous.
  const unique = new Set(input.options.map((option) => option.toLowerCase()));
  if (unique.size !== 4) throw new HttpError(400, "The four options must all be different.");
  const question = await Question.create({ ...input, createdBy: req.userId });
  res.status(201).json({ ok: true, question: questionPayload(question) });
});

/** PUT /api/admin/questions/:id — edit a question. */
adminRouter.put("/questions/:questionId", async (req, res) => {
  const { questionId } = req.params;
  if (!objectId.safeParse(questionId).success) throw new HttpError(404, "That question is no longer here.");
  const input = parse(questionSchema, req.body);
  const unique = new Set(input.options.map((option) => option.toLowerCase()));
  if (unique.size !== 4) throw new HttpError(400, "The four options must all be different.");
  const question = await Question.findByIdAndUpdate(questionId, input, { returnDocument: "after" }).lean();
  if (!question) throw new HttpError(404, "That question is no longer here.");
  res.json({ ok: true, question: questionPayload(question) });
});

/** DELETE /api/admin/questions/:id — remove a question from the bank. */
adminRouter.delete("/questions/:questionId", async (req, res) => {
  const { questionId } = req.params;
  if (!objectId.safeParse(questionId).success) throw new HttpError(404, "That question is no longer here.");
  const removed = await Question.findByIdAndDelete(questionId).lean();
  if (!removed) throw new HttpError(404, "That question is no longer here.");
  res.json({ ok: true });
});
