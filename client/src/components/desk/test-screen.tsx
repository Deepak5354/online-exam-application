import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  Loader2,
  Send,
  Timer,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { saveAnswers, submitTest, type RunningTest } from "@/lib/test/api";
import { formatCountdown, OPTION_LETTERS } from "@/lib/test/format";
import { useCountdown } from "@/components/desk/use-countdown";

type Answers = Record<string, number | null>;

/**
 * The online test screen.
 *
 * The questions arrive from the server with the attempt (they are sampled from
 * MongoDB when the test starts) and the countdown is derived from the server's
 * `deadlineAt`, never from a browser-side start time.
 */
export function TestScreen({ attempt, onFinished }: { attempt: RunningTest; onFinished: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(attempt.questions.map((question) => [question.questionId, question.selectedIndex])),
  );
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submitted = useRef(false);

  const questions = attempt.questions;
  const current = questions[index];
  const answeredCount = questions.filter((question) => answers[question.questionId] != null).length;
  const unanswered = questions.length - answeredCount;

  // Warn before a reload or a closed tab takes the test off screen.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const save = useMutation({
    mutationFn: (next: Answers) => saveAnswers(attempt.id, next),
    onSuccess: (result) => {
      // The server can decide the test is over (deadline passed) while saving.
      if (result && "ok" in result && result.ok && "result" in result && result.result) {
        submitted.current = true;
        toast.message("Time is up — your test was submitted.");
        onFinished();
        void navigate({ to: "/history/$attemptId", params: { attemptId: attempt.id }, replace: true });
      }
    },
  });

  const saveTimer = useRef<number | null>(null);
  const queueSave = useCallback(
    (next: Answers) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        if (!submitted.current) save.mutate(next);
      }, 800);
    },
    [save],
  );

  function select(questionId: string, optionIndex: number | null) {
    if (submitting || submitted.current) return;
    setAnswers((existing) => {
      const next = { ...existing, [questionId]: existing[questionId] === optionIndex ? null : optionIndex };
      queueSave(next);
      return next;
    });
  }

  async function doSubmit(auto: boolean) {
    if (submitted.current || submitting) return;
    submitted.current = true;
    setSubmitting(true);
    setSubmitError("");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    try {
      const result = await submitTest(attempt.id, { answers, auto });
      if (!result.ok) {
        submitted.current = false;
        setSubmitError(result.error);
        setSubmitting(false);
        return;
      }
      toast.success(auto ? "Time is up. Your test was submitted." : "Test submitted.");
      // Hand the graded result to the result page so it renders immediately.
      queryClient.setQueryData(["attempt", attempt.id], { ok: true, running: false, submitted: true, result: result.result });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["history"] });
      onFinished();
      await navigate({ to: "/history/$attemptId", params: { attemptId: attempt.id }, replace: true });
    } catch (error) {
      submitted.current = false;
      setSubmitError(error instanceof Error ? error.message : "Could not submit the test. Try again.");
      setSubmitting(false);
    }
  }

  const secondsLeft = useCountdown(attempt.deadlineAt, () => {
    void doSubmit(true);
  });
  const urgent = secondsLeft <= 60;

  const go = (next: number) => {
    setReviewing(false);
    setIndex(Math.max(0, Math.min(questions.length - 1, next)));
  };

  return (
    <div className="rise">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Test in progress</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            {attempt.testName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {attempt.subject} · {questions.length} questions · pass mark {attempt.passPercent}%
          </p>
        </div>
        <div
          className={clsx(
            "flex items-center gap-2.5 rounded-2xl border px-4 py-2.5",
            urgent ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-sheet text-ink",
          )}
          role="timer"
          aria-live="off"
          aria-label={`Time remaining ${formatCountdown(secondsLeft)}`}
        >
          <Timer className={clsx("size-5", urgent ? "text-accent" : "text-primary")} aria-hidden="true" />
          <span className="font-display text-2xl font-extrabold tabular-nums leading-none">
            {formatCountdown(secondsLeft)}
          </span>
          <span className="text-xs font-medium text-muted">left</span>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-4">
          {reviewing ? (
            <ReviewPanel
              attempt={attempt}
              answers={answers}
              onJump={(position) => {
                setReviewing(false);
                setIndex(position);
              }}
              onBack={() => setReviewing(false)}
              onSubmit={() => void doSubmit(false)}
              submitting={submitting}
              submitError={submitError}
            />
          ) : current ? (
            <section className="panel p-5 sm:p-6" aria-labelledby="question-heading">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Question {index + 1} of {questions.length}
                </p>
                <span className={clsx("chip", answers[current.questionId] != null ? "chip-success" : "chip-muted")}>
                  {answers[current.questionId] != null ? "Answered" : "Not answered"}
                </span>
              </div>
              <h2 id="question-heading" className="mt-3 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                {current.text}
              </h2>

              <fieldset className="mt-5">
                <legend className="sr-only">Choose one answer</legend>
                <ul className="space-y-2.5">
                  {current.options.map((option, optionIndex) => {
                    const selected = answers[current.questionId] === optionIndex;
                    return (
                      <li key={optionIndex}>
                        <label
                          className={clsx(
                            "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                            selected
                              ? "border-primary bg-primary-soft"
                              : "border-line bg-sheet hover:border-line-strong hover:bg-hover",
                          )}
                        >
                          <input
                            type="radio"
                            name={`question-${current.questionId}`}
                            value={optionIndex}
                            checked={selected}
                            onChange={() => select(current.questionId, optionIndex)}
                            className="sr-only"
                          />
                          <span
                            className={clsx(
                              "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold",
                              selected ? "bg-primary text-white" : "bg-slate-100 text-slate-600",
                            )}
                            aria-hidden="true"
                          >
                            {OPTION_LETTERS[optionIndex]}
                          </span>
                          <span className="text-sm leading-relaxed text-ink sm:text-[0.9375rem]">{option}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <button type="button" className="btn btn-ghost px-2.5 text-sm" onClick={() => select(current.questionId, null)}>
                  <X className="size-4" aria-hidden="true" />
                  Clear answer
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-line" disabled={index === 0} onClick={() => go(index - 1)}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Previous
                  </button>
                  {index === questions.length - 1 ? (
                    <button type="button" className="btn btn-primary" onClick={() => setReviewing(true)}>
                      Review answers
                      <ClipboardCheck className="size-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => go(index + 1)}>
                      Next
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {submitError ? (
            <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm font-medium text-accent" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="panel p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Questions</p>
              <span className="chip chip-muted tabular-nums">
                {answeredCount}/{questions.length}
              </span>
            </div>
            <ol className="mt-3 grid grid-cols-5 gap-2">
              {questions.map((question, position) => {
                const answered = answers[question.questionId] != null;
                const active = !reviewing && position === index;
                return (
                  <li key={question.questionId}>
                    <button
                      type="button"
                      onClick={() => go(position)}
                      aria-current={active ? "true" : undefined}
                      aria-label={`Question ${position + 1}, ${answered ? "answered" : "not answered"}`}
                      className={clsx(
                        "grid h-9 w-full place-items-center rounded-lg border text-xs font-bold tabular-nums transition-colors",
                        active
                          ? "border-primary bg-primary text-white"
                          : answered
                            ? "border-primary/30 bg-primary-soft text-primary"
                            : "border-line bg-sheet text-slate-500 hover:border-line-strong",
                      )}
                    >
                      {position + 1}
                    </button>
                  </li>
                );
              })}
            </ol>
            <ul className="mt-3 space-y-1.5 text-xs text-muted">
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" /> Current question
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm bg-primary-soft ring-1 ring-primary/30" aria-hidden="true" /> Answered
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm border border-line-strong bg-sheet" aria-hidden="true" /> Not answered
              </li>
            </ul>
          </div>

          <div className="panel p-4">
            <p className="text-sm font-semibold text-ink">Finish up</p>
            <p className="mt-1 text-xs text-muted">
              {unanswered === 0
                ? "All questions answered. Review once, then submit."
                : `${unanswered} question${unanswered === 1 ? "" : "s"} left. Unanswered questions score zero.`}
            </p>
            <button
              type="button"
              className="btn btn-primary mt-3 w-full"
              disabled={submitting}
              // While reviewing, this button submits; otherwise it opens the review step.
              onClick={() => (reviewing ? void doSubmit(false) : setReviewing(true))}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              {submitting ? "Submitting…" : reviewing ? "Submit now" : "Submit test"}
            </button>
            <p className="mt-2 flex items-start gap-1.5 text-[0.6875rem] text-muted">
              <Clock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              The test submits itself when the timer reaches 00:00.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Review step: every question with the chosen answer, plus the final submit. */
function ReviewPanel({
  attempt,
  answers,
  onJump,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  attempt: RunningTest;
  answers: Answers;
  onJump: (position: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
}) {
  const answered = useMemo(
    () => attempt.questions.filter((question) => answers[question.questionId] != null).length,
    [attempt.questions, answers],
  );
  const missing = attempt.questions.length - answered;

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="review-heading">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Review before you submit</p>
      <h2 id="review-heading" className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">
        {answered} of {attempt.questions.length} answered
      </h2>
      <p className="mt-1 text-sm text-muted">
        You can still change any answer. Once you submit, the result is final and graded on the server.
      </p>

      {missing > 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm font-medium text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {missing} question{missing === 1 ? "" : "s"} have no answer. They will be marked unanswered.
        </p>
      ) : null}

      <ol className="mt-4 space-y-2">
        {attempt.questions.map((question, position) => {
          const selected = answers[question.questionId];
          return (
            <li key={question.questionId}>
              <button
                type="button"
                onClick={() => onJump(position)}
                className="flex w-full items-start gap-3 rounded-xl border border-line bg-sheet px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-hover"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 tabular-nums">
                  {position + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{question.text}</span>
                  <span className={clsx("mt-0.5 block truncate text-xs", selected == null ? "text-warn" : "text-muted")}>
                    {selected == null
                      ? "Not answered — tap to answer"
                      : `${OPTION_LETTERS[selected]}. ${question.options[selected]}`}
                  </span>
                </span>
                {selected == null ? (
                  <Circle className="mt-1 size-4 shrink-0 text-slate-300" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {submitError ? (
        <p className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm font-medium text-accent" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <button type="button" className="btn btn-line" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to questions
        </button>
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          {submitting ? "Submitting…" : "Submit test"}
        </button>
      </div>
    </section>
  );
}
