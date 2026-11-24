import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { clsx } from "clsx";
import type { AttemptSummary } from "@/lib/test/api";
import { formatDateTime, formatDuration, formatPercent } from "@/lib/test/format";

/** One attempt, as listed on the dashboard and on the Test history page. */
export function AttemptRow({ attempt }: { attempt: AttemptSummary }) {
  const running = attempt.status === "in_progress";
  const passed = attempt.passed === true;

  return (
    <Link
      to={running ? "/test/$attemptId" : "/history/$attemptId"}
      params={{ attemptId: attempt.id }}
      className="panel-link flex flex-wrap items-center gap-3 rounded-xl border border-line bg-sheet px-3.5 py-3 sm:flex-nowrap"
    >
      <span
        className={clsx(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          running ? "bg-warn-soft text-warn" : passed ? "bg-success-soft text-success" : "bg-accent-soft text-accent",
        )}
        aria-hidden="true"
      >
        {running ? <Clock className="size-5" /> : passed ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-ink">{attempt.testName}</span>
          <span className="chip chip-muted">{attempt.subject}</span>
          {running ? <span className="chip">In progress</span> : null}
          {!running && attempt.autoSubmitted ? <span className="chip chip-muted">Time ran out</span> : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {formatDateTime(attempt.submittedAt ?? attempt.startedAt)}
          {attempt.timeTakenSeconds != null ? ` · took ${formatDuration(attempt.timeTakenSeconds)}` : ""}
        </span>
      </span>

      <span className="flex items-center gap-4 sm:gap-6">
        <span className="text-right">
          <span className="block font-display text-lg font-extrabold leading-none tabular-nums text-ink">
            {running ? `${attempt.totalQuestions}` : (attempt.score ?? 0)}
            <span className="text-sm font-semibold text-muted">/{attempt.totalQuestions}</span>
          </span>
          <span className="text-[0.6875rem] text-muted">score</span>
        </span>
        <span className="hidden text-right sm:block">
          <span className="block font-display text-lg font-extrabold leading-none tabular-nums text-ink">
            {running ? "—" : formatPercent(attempt.percentage)}
          </span>
          <span className="text-[0.6875rem] text-muted">percentage</span>
        </span>
        <span className="hidden items-center gap-3 text-xs text-muted md:flex">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
            {attempt.correctCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="size-3.5 text-accent" aria-hidden="true" />
            {attempt.incorrectCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="size-3.5 text-slate-400" aria-hidden="true" />
            {attempt.unansweredCount ?? 0}
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
      </span>
    </Link>
  );
}
