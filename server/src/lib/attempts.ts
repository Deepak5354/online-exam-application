import type { Types } from "mongoose";

/** One question as stored inside an attempt. */
export type AttemptQuestion = {
  questionId: Types.ObjectId;
  text: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
};

/** A question as a student may see it while the test is running: no answer key. */
export type QuestionView = {
  number: number;
  questionId: string;
  text: string;
  options: string[];
  selectedIndex: number | null;
};

/** A graded question, shown only after the attempt is submitted. */
export type GradedQuestion = QuestionView & {
  correctIndex: number;
  correctText: string;
  selectedText: string | null;
  isCorrect: boolean;
  isUnanswered: boolean;
};

export type Grade = {
  results: GradedQuestion[];
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentage: number;
  passed: boolean;
};

const LETTERS = ["A", "B", "C", "D"];

export const optionLetter = (index: number | null) => (index == null ? null : (LETTERS[index] ?? null));

/** Percentage rounded to one decimal, so 7/10 is 70 and 2/3 is 66.7. */
export function percentageOf(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((score / total) * 1000) / 10;
}

/**
 * Grade an attempt. Pure, so it can be unit tested and reused.
 * Unanswered questions count as incorrect for the score but are reported
 * separately from wrong answers.
 */
export function gradeAttempt(questions: readonly AttemptQuestion[], passPercent: number): Grade {
  const results: GradedQuestion[] = questions.map((question, position) => {
    const selected = question.selectedIndex;
    const isUnanswered = selected == null || selected < 0 || selected >= question.options.length;
    const isCorrect = !isUnanswered && selected === question.correctIndex;
    return {
      number: position + 1,
      questionId: String(question.questionId),
      text: question.text,
      options: question.options,
      selectedIndex: isUnanswered ? null : selected,
      selectedText: isUnanswered ? null : (question.options[selected] ?? null),
      correctIndex: question.correctIndex,
      correctText: question.options[question.correctIndex] ?? "",
      isCorrect,
      isUnanswered,
    };
  });

  const totalQuestions = results.length;
  const correctCount = results.filter((result) => result.isCorrect).length;
  const unansweredCount = results.filter((result) => result.isUnanswered).length;
  const incorrectCount = totalQuestions - correctCount - unansweredCount;
  const percentage = percentageOf(correctCount, totalQuestions);
  return {
    results,
    score: correctCount,
    totalQuestions,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentage,
    passed: totalQuestions > 0 && percentage >= passPercent,
  };
}

/** Strip the answer key before sending a running test to the browser. */
export function toQuestionViews(questions: readonly AttemptQuestion[]): QuestionView[] {
  return questions.map((question, position) => ({
    number: position + 1,
    questionId: String(question.questionId),
    text: question.text,
    options: question.options,
    selectedIndex: question.selectedIndex ?? null,
  }));
}

/** Seconds left before the deadline (never negative). */
export function secondsRemaining(deadlineAt: Date | string, now = Date.now()): number {
  const deadline = deadlineAt instanceof Date ? deadlineAt.getTime() : new Date(deadlineAt).getTime();
  if (Number.isNaN(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** A human name for a test: the subject plus "test". */
export function testNameFor(subject: string): string {
  const label = subject.trim() || "Mixed";
  return `${label} test`;
}

export const fmtScore = (score: number | null, total: number | null) =>
  score == null || total == null ? "—" : `${score}/${total}`;
