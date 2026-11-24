import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardList,
  History,
  PlayCircle,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { loadDashboard } from "@/lib/test/api";
import { formatDateTime, formatPercent, formatRelative, greeting } from "@/lib/test/format";
import { useAccount } from "@/components/desk/test-state";
import { AttemptRow } from "@/components/desk/attempt-row";
import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/desk/ui";

/** The student dashboard: the same panels and cards as Queue Desk, test numbers instead of queues. */
export function DashboardView() {
  const account = useAccount();
  const query = useQuery({ queryKey: ["dashboard"], queryFn: loadDashboard, refetchOnWindowFocus: false });
  const data = query.data && "totalAttempts" in query.data ? query.data : null;
  const error = query.data && "error" in query.data ? query.data.error : null;
  const firstName = (account.name || account.email).split(/\s+/)[0];

  return (
    <div className="rise space-y-6">
      <PageHeader
        eyebrow="Student dashboard"
        title={`${greeting()}, ${firstName}`}
        description={`Signed in as ${account.email}. Every test you take is saved here, graded on the server.`}
        actions={
          <>
            <Link to="/test" className="btn btn-primary">
              <PlayCircle className="size-4" aria-hidden="true" />
              Start new test
            </Link>
            <Link to="/history" className="btn btn-line">
              <History className="size-4" aria-hidden="true" />
              Test history
            </Link>
          </>
        }
      />

      {error ? (
        <div className="panel p-4" role="alert">
          <p className="text-sm text-accent">{String(error)}</p>
          <button type="button" className="btn btn-line mt-3" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-[7.5rem]" aria-hidden="true" />
          ))}
        </div>
      ) : data ? (
        <>
          <section aria-label="Your numbers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tests attempted"
              value={String(data.totalAttempts)}
              hint={data.totalAttempts === 0 ? "No tests yet" : `${data.totalCorrect} questions answered right`}
              icon={ClipboardList}
            />
            <StatCard
              label="Latest score"
              value={data.latest ? `${data.latest.score ?? 0}/${data.latest.totalQuestions}` : "—"}
              hint={data.latest ? `${formatPercent(data.latest.percentage)} · ${formatRelative(data.latest.submittedAt)}` : "Take a test to see it"}
              icon={Award}
              tone="success"
            />
            <StatCard
              label="Average score"
              value={formatPercent(data.averagePercentage)}
              hint={data.totalAttempts === 0 ? "Starts with your first test" : `Across ${data.totalAttempts} test${data.totalAttempts === 1 ? "" : "s"}`}
              icon={TrendingUp}
              tone="warn"
            />
            <StatCard
              label="Best result"
              value={formatPercent(data.bestPercentage)}
              hint={`${data.passedCount} test${data.passedCount === 1 ? "" : "s"} passed`}
              icon={Target}
              tone="primary"
            />
          </section>

          {!data.bank.ready ? (
            <div className="panel border-warn/40 bg-warn-soft p-4" role="alert">
              <p className="text-sm font-semibold text-warn">The question bank is nearly empty.</p>
              <p className="mt-1 text-sm text-muted">
                A test needs {data.bank.required} questions and there are {data.bank.total}. Ask an admin to add more.
              </p>
            </div>
          ) : null}

          <section aria-labelledby="start-heading">
            <div className="ticket is-live">
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-100">
                    <span className="pulse-dot" aria-hidden="true" /> Ready when you are
                  </p>
                  <h2 id="start-heading" className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">
                    {data.openAttemptId ? "You have a test in progress" : "Start a new test"}
                  </h2>
                  <p className="mt-1.5 max-w-lg text-sm text-indigo-100">
                    {data.openAttemptId
                      ? "Your timer is still running. Pick up where you left off — a refresh does not restart the clock."
                      : `${data.bank.required} questions from the bank (${data.bank.total} available), 10 minutes, graded the moment you submit.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/25">
                    <Timer className="size-4" aria-hidden="true" /> 10 min
                  </span>
                  {data.openAttemptId ? (
                    <Link
                      to="/test/$attemptId"
                      params={{ attemptId: data.openAttemptId }}
                      className="btn btn-lg bg-white text-[#4338ca] shadow-lg shadow-indigo-900/20 hover:bg-indigo-50"
                    >
                      Resume test
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <Link
                      to="/test"
                      className="btn btn-lg bg-white text-[#4338ca] shadow-lg shadow-indigo-900/20 hover:bg-indigo-50"
                    >
                      Start new test
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="recent-heading" className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <h2 id="recent-heading" className="font-display text-lg font-bold">
                Recent attempts
              </h2>
              <Link to="/history" className="btn btn-ghost min-h-9 px-2.5 text-sm">
                All history
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="p-3 sm:p-4">
              {query.isLoading ? (
                <ListSkeleton rows={3} />
              ) : data.recent.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No tests attempted yet">
                  <p>Start your first test and your score will show up here, with a question-by-question breakdown.</p>
                  <Link to="/test" className="btn btn-primary mt-4">
                    <PlayCircle className="size-4" aria-hidden="true" />
                    Start new test
                  </Link>
                </EmptyState>
              ) : (
                <ul className="space-y-2.5">
                  {data.recent.map((attempt) => (
                    <li key={attempt.id}>
                      <AttemptRow attempt={attempt} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-label="How it works" className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ClipboardList, title: "10 questions", body: "Drawn at random from the MongoDB question bank." },
              { icon: Timer, title: "10 minutes", body: "The countdown runs on the server, so a refresh cannot reset it." },
              { icon: CheckCircle2, title: "Instant result", body: "Correct, incorrect and unanswered questions, graded on submit." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="panel flex items-start gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-[1.1rem]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-xs text-muted">{body}</p>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      <p className="text-xs text-muted">Last updated {formatDateTime(new Date().toISOString())}</p>
    </div>
  );
}
