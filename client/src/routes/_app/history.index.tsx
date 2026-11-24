import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, History as HistoryIcon, PlayCircle } from "lucide-react";
import { loadHistory } from "@/lib/test/api";
import { AttemptRow } from "@/components/desk/attempt-row";
import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/desk/ui";
import { formatPercent } from "@/lib/test/format";

export const Route = createFileRoute("/_app/history/")({
  head: () => ({ meta: [{ title: "Test history · Online Exam Application" }] }),
  component: HistoryPage,
});

/** Every attempt of the signed-in student. The API filters by session, not by a query param. */
function HistoryPage() {
  const query = useQuery({ queryKey: ["history"], queryFn: loadHistory, refetchOnWindowFocus: false });
  const payload = query.data;
  const attempts = payload && "ok" in payload && payload.ok ? payload.attempts : [];
  const failure = payload && "ok" in payload && !payload.ok ? payload.error : null;
  const finished = attempts.filter((attempt) => attempt.status !== "in_progress");
  const average =
    finished.length === 0
      ? null
      : Math.round((finished.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) / finished.length) * 10) / 10;
  const best = finished.length === 0 ? null : Math.max(...finished.map((attempt) => attempt.percentage ?? 0));

  return (
    <div className="rise space-y-6">
      <PageHeader
        eyebrow="Test history"
        title="Your previous attempts"
        description="Only your own attempts appear here. Open any one of them for the question-by-question result."
        actions={
          <Link to="/test" className="btn btn-primary">
            <PlayCircle className="size-4" aria-hidden="true" />
            Start new test
          </Link>
        }
      />

      {failure ? (
        <div className="panel p-4" role="alert">
          <p className="text-sm text-accent">{failure}</p>
          <button type="button" className="btn btn-line mt-3" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      {finished.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Tests completed" value={String(finished.length)} icon={ClipboardList} />
          <StatCard label="Average score" value={formatPercent(average)} icon={HistoryIcon} tone="warn" />
          <StatCard label="Best score" value={formatPercent(best)} icon={HistoryIcon} tone="success" />
        </div>
      ) : null}

      <section aria-labelledby="history-heading" className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3.5 sm:px-5">
          <h2 id="history-heading" className="font-display text-lg font-bold">
            All attempts
          </h2>
        </div>
        <div className="p-3 sm:p-4">
          {query.isPending ? (
            <ListSkeleton rows={4} />
          ) : attempts.length === 0 ? (
            <EmptyState icon={HistoryIcon} title="No tests taken yet">
              <p>Your attempts and their detailed results will be listed here after your first test.</p>
              <Link to="/test" className="btn btn-primary mt-4">
                <PlayCircle className="size-4" aria-hidden="true" />
                Start new test
              </Link>
            </EmptyState>
          ) : (
            <ul className="space-y-2.5">
              {attempts.map((attempt) => (
                <li key={attempt.id}>
                  <AttemptRow attempt={attempt} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
