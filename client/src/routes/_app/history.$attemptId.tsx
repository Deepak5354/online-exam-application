import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  Clock,
  History,
  MinusCircle,
  PlayCircle,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { getAttempt, type GradedQuestion } from "@/lib/test/api";
import { useAccount } from "@/components/desk/test-state";
import { formatDateTime, formatDuration, formatPercent, OPTION_LETTERS } from "@/lib/test/format";

export const Route = createFileRoute("/_app/history/$attemptId")({
  head: () => ({ meta: [{ title: "Result · Online Exam Application" }] }),
  component: ResultPage,
});

/**
 * Detailed result of one attempt.
 *
 * Everything on this page is what the server calculated and stored: the score,
 * the counts, the pass mark and each question's right answer. Nothing is worked
 * out in the browser.
 */
function ResultPage() {
  const { attemptId } = Route.useParams();
  const account = useAccount();
  const query = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => getAttempt(attemptId),
    // The test screen caches the running attempt under the same key, so this
    // page must always ask the server for the graded result.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const payload = query.data;
  const result = payload && "ok" in payload && payload.ok && "result" in payload ? payload.result : null;
  const running = payload && "ok" in payload && payload.ok && "attempt" in payload ? payload.attempt : null;
  const failure = payload && "ok" in payload && !payload.ok ? payload.error : null;

  if (query.isPending) {
    return (
      <div className="space-y-3" aria-hidden="true">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  // An attempt that is still running is not a result: send the student back to it.
  if (running) {
    return (
      <div className="panel max-w-lg p-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">This test is still running</h1>
        <p className="mt-2 text-sm text-muted">The countdown has not finished yet, so there is no result to show.</p>
        <Link to="/test/$attemptId" params={{ attemptId: running.id }} className="btn btn-primary mt-4">
          Go back to the test
        </Link>
      </div>
    );
  }

  if (failure || !result) {
    return (
      <div className="panel max-w-lg p-6">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <TriangleAlert className="size-5 text-warn" aria-hidden="true" />
          Cannot open this result
        </p>
        <p className="mt-2 text-sm text-muted">{failure ?? "That attempt is no longer available."}</p>
        <Link to="/history" className="btn btn-line mt-4">
          Back to test history
        </Link>
      </div>
    );
  }

  const passed = result.passed;

  return (
    <div className="rise space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/history" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Test history
        </Link>
        <Link to="/test" className="btn btn-primary">
          <PlayCircle className="size-4" aria-hidden="true" />
          Take another test
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Test result</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {result.testName}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {account.name} · {account.email}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {formatDateTime(result.submittedAt)} · took {formatDuration(result.timeTakenSeconds)}
            {result.autoSubmitted ? " · submitted automatically when time ran out" : ""}
          </p>
        </div>
        <span
          className={clsx(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
            passed ? "bg-success-soft text-success" : "bg-accent-soft text-accent",
          )}
        >
          {passed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
          {passed ? "Passed" : "Not passed"} · pass mark {result.passPercent}%
        </span>
      </header>

      <section className="panel overflow-hidden" aria-label="Score summary">
        <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col justify-center gap-1 border-b border-line bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-6 text-white sm:border-b-0 sm:border-r">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">Marks obtained</p>
            <p className="font-display text-5xl font-extrabold leading-none tabular-nums">
              {result.score}
              <span className="text-2xl text-indigo-200">/{result.totalQuestions}</span>
            </p>
            <p className="mt-1 text-sm text-indigo-100">{formatPercent(result.percentage)} score</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-indigo-100">
              <Clock className="size-3.5" aria-hidden="true" />
              {formatDuration(result.timeTakenSeconds)} of {formatDuration(result.durationSeconds)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-line">
            <SummaryCell label="Total questions" value={String(result.totalQuestions)} tone="neutral" icon={History} />
            <SummaryCell label="Correct" value={String(result.correctCount)} tone="success" icon={CheckCircle2} />
            <SummaryCell label="Incorrect" value={String(result.incorrectCount)} tone="danger" icon={XCircle} />
            <SummaryCell label="Unanswered" value={String(result.unansweredCount)} tone="warn" icon={MinusCircle} />
          </dl>
        </div>
      </section>

      <section aria-labelledby="analysis-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="analysis-heading" className="font-display text-xl font-bold text-ink">
            Question-wise analysis
          </h2>
          <ul className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" /> Correct
            </li>
            <li className="flex items-center gap-1.5">
              <XCircle className="size-3.5 text-accent" aria-hidden="true" /> Incorrect
            </li>
            <li className="flex items-center gap-1.5">
              <CircleSlash className="size-3.5 text-warn" aria-hidden="true" /> Unanswered
            </li>
          </ul>
        </div>

        <ol className="space-y-3">
          {result.questions.map((question) => (
            <li key={question.questionId}>
              <QuestionReview question={question} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "warn" | "neutral";
  icon: typeof CheckCircle2;
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-accent"
        : tone === "warn"
          ? "text-warn"
          : "text-ink";
  return (
    <div className="bg-sheet p-4 sm:p-5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon className={clsx("size-3.5", color)} aria-hidden="true" />
        {label}
      </dt>
      <dd className={clsx("mt-1 font-display text-2xl font-extrabold tabular-nums", color)}>{value}</dd>
    </div>
  );
}

/** One graded question: the text, both answers, and why it was right or wrong. */
function QuestionReview({ question }: { question: GradedQuestion }) {
  const state = question.isUnanswered ? "unanswered" : question.isCorrect ? "correct" : "incorrect";
  const shell =
    state === "correct"
      ? "border-success/35 bg-success-soft/40"
      : state === "incorrect"
        ? "border-accent/35 bg-accent-soft/40"
        : "border-line bg-sheet";

  return (
    <article className={clsx("rounded-xl border p-4 sm:p-5", shell)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink sm:text-[0.9375rem]">
          <span className="mr-1.5 text-muted">Q{question.number}.</span>
          {question.text}
        </p>
        <span
          className={clsx(
            "chip shrink-0",
            state === "correct" ? "chip-success" : state === "incorrect" ? "chip-danger" : "chip-muted",
          )}
        >
          {state === "correct" ? (
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
          ) : state === "incorrect" ? (
            <XCircle className="size-3.5" aria-hidden="true" />
          ) : (
            <CircleSlash className="size-3.5" aria-hidden="true" />
          )}
          {state === "correct" ? "Correct" : state === "incorrect" ? "Incorrect" : "Unanswered"}
        </span>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex;
          const isSelected = index === question.selectedIndex;
          return (
            <li
              key={index}
              className={clsx(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                isCorrect
                  ? "border-success/50 bg-sheet"
                  : isSelected
                    ? "border-accent/50 bg-sheet"
                    : "border-line bg-sheet/70",
              )}
            >
              <span
                className={clsx(
                  "grid size-6 shrink-0 place-items-center rounded-md text-[0.6875rem] font-bold",
                  isCorrect
                    ? "bg-success text-white"
                    : isSelected
                      ? "bg-accent text-white"
                      : "bg-slate-100 text-slate-600",
                )}
                aria-hidden="true"
              >
                {OPTION_LETTERS[index]}
              </span>
              <span className="min-w-0 flex-1 text-ink">{option}</span>
              {isCorrect ? (
                <span className="shrink-0 text-[0.6875rem] font-semibold text-success">Correct answer</span>
              ) : isSelected ? (
                <span className="shrink-0 text-[0.6875rem] font-semibold text-accent">Your answer</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div className="flex gap-1.5">
          <dt className="text-muted">Your answer:</dt>
          <dd className={clsx("font-semibold", state === "unanswered" ? "text-warn" : "text-ink")}>
            {question.selectedText ?? "Not answered"}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">Correct answer:</dt>
          <dd className="font-semibold text-ink">{question.correctText}</dd>
        </div>
      </dl>
    </article>
  );
}
