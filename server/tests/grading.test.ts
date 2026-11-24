import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { gradeAttempt, percentageOf, secondsRemaining, toQuestionViews, type AttemptQuestion } from "../src/lib/attempts.js";

/** Unit tests for the grading rules the whole result page depends on. */

const question = (correctIndex: number, selectedIndex: number | null): AttemptQuestion => ({
  questionId: new Types.ObjectId(),
  text: `Question with answer ${correctIndex}`,
  options: ["A", "B", "C", "D"],
  correctIndex,
  selectedIndex,
});

test("grading counts correct, incorrect and unanswered separately", () => {
  const questions = [question(0, 0), question(1, 2), question(3, null), question(2, 2), question(0, 3)];
  const grade = gradeAttempt(questions, 40);
  assert.equal(grade.totalQuestions, 5);
  assert.equal(grade.correctCount, 2);
  assert.equal(grade.incorrectCount, 2);
  assert.equal(grade.unansweredCount, 1);
  assert.equal(grade.score, 2);
  assert.equal(grade.percentage, 40);
  assert.equal(grade.passed, true);
});

test("nothing answered scores zero and does not pass", () => {
  const grade = gradeAttempt([question(0, null), question(1, null)], 40);
  assert.equal(grade.score, 0);
  assert.equal(grade.percentage, 0);
  assert.equal(grade.unansweredCount, 2);
  assert.equal(grade.passed, false);
});

test("a perfect score is 100%", () => {
  const grade = gradeAttempt([question(0, 0), question(1, 1)], 40);
  assert.equal(grade.percentage, 100);
  assert.equal(grade.passed, true);
});

test("the pass mark is inclusive and configurable", () => {
  assert.equal(gradeAttempt([question(0, 0), question(0, null)], 50).passed, true);
  assert.equal(gradeAttempt([question(0, 0), question(0, null)], 51).passed, false);
});

test("percentages are rounded to one decimal", () => {
  assert.equal(percentageOf(7, 10), 70);
  assert.equal(percentageOf(2, 3), 66.7);
  assert.equal(percentageOf(0, 0), 0);
});

test("a graded question keeps both the selected and correct answer", () => {
  const [first] = gradeAttempt([question(2, 1)], 40).results;
  assert.equal(first.selectedText, "B");
  assert.equal(first.correctText, "C");
  assert.equal(first.isCorrect, false);
  assert.equal(first.isUnanswered, false);
});

test("a running test carries no answer key", () => {
  const views = toQuestionViews([question(2, 1)]);
  assert.deepEqual(Object.keys(views[0]!).sort(), ["number", "options", "questionId", "selectedIndex", "text"]);
});

test("seconds remaining never goes negative", () => {
  assert.equal(secondsRemaining(new Date(Date.now() + 5_000)), 5);
  assert.equal(secondsRemaining(new Date(Date.now() - 60_000)), 0);
});
