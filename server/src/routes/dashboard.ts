import { Router } from "express";
import { config } from "../config.js";
import { toAttemptSummary, type AttemptLike } from "../lib/test-serialize.js";
import { TestAttempt } from "../models/test-attempt.js";
import { Question } from "../models/question.js";

export const dashboardRouter = Router();

/** GET /api/dashboard — the numbers the student dashboard shows. */
dashboardRouter.get("/", async (req, res) => {
  const [finished, recent, bankTotal] = await Promise.all([
    TestAttempt.find({ student: req.userId, status: { $ne: "in_progress" } })
      .select("score totalQuestions percentage passed submittedAt")
      .sort({ submittedAt: -1 })
      .lean(),
    TestAttempt.find({ student: req.userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Question.estimatedDocumentCount(),
  ]);

  const attempts = finished.length;
  const latest = finished[0] ?? null;
  const averagePercentage =
    attempts === 0
      ? null
      : Math.round((finished.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) / attempts) * 10) / 10;
  const totalCorrect = finished.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);
  const passedCount = finished.filter((attempt) => attempt.passed).length;
  const openAttempt = await TestAttempt.findOne({ student: req.userId, status: "in_progress" }).lean();

  res.json({
    ok: true,
    totalAttempts: attempts,
    averagePercentage,
    bestPercentage: attempts === 0 ? null : Math.max(...finished.map((attempt) => attempt.percentage ?? 0)),
    totalCorrect,
    passedCount,
    latest:
      latest && latest.submittedAt
        ? {
            id: String(latest._id),
            score: latest.score,
            totalQuestions: latest.totalQuestions,
            percentage: latest.percentage,
            passed: latest.passed,
            submittedAt: latest.submittedAt.toISOString(),
          }
        : null,
    recent: recent.map((attempt) => toAttemptSummary(attempt as unknown as AttemptLike)),
    bank: { total: bankTotal, required: config.questionsPerTest, ready: bankTotal >= config.questionsPerTest },
    openAttemptId: openAttempt ? String(openAttempt._id) : null,
  });
});
