import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TriangleAlert } from "lucide-react";
import { getAttempt } from "@/lib/test/api";
import { TestScreen } from "@/components/desk/test-screen";

export const Route = createFileRoute("/_app/test/$attemptId")({
  head: () => ({ meta: [{ title: "Test in progress · Online Exam Application" }] }),
  component: TestPage,
});

/**
 * The exam itself. The attempt (questions + deadline) comes from the server, so
 * opening this page again after a refresh shows the same questions with the
 * time that is actually left.
 */
function TestPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => getAttempt(attemptId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });

  const payload = query.data;
  const failure = payload && "ok" in payload && !payload.ok ? payload.error : null;
  const result = payload && "ok" in payload && payload.ok && "result" in payload ? payload.result : null;
  const attempt = payload && "ok" in payload && payload.ok && "attempt" in payload ? payload.attempt : null;

  // Already submitted (for example the server graded it while the tab was closed).
  if (result) {
    return (
      <div className="panel max-w-lg p-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">This test is already submitted</h1>
        <p className="mt-2 text-sm text-muted">
          Your result is ready: {result.score}/{result.totalQuestions} ({result.percentage}%).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/history/$attemptId" params={{ attemptId: result.id }} className="btn btn-primary">
            View detailed result
          </Link>
          <Link to="/history" className="btn btn-line">
            Test history
          </Link>
        </div>
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading your test…
      </div>
    );
  }

  if (failure || !attempt) {
    return (
      <div className="panel max-w-lg p-6">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <TriangleAlert className="size-5 text-warn" aria-hidden="true" />
          Cannot open this test
        </p>
        <p className="mt-2 text-sm text-muted">{failure ?? "That test is no longer available."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/test" className="btn btn-primary">
            Start a new test
          </Link>
          <Link to="/history" className="btn btn-line">
            Test history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TestScreen
      key={attempt.id}
      attempt={attempt}
      onFinished={() => {
        void navigate({ to: "/history/$attemptId", params: { attemptId: attempt.id }, replace: true });
      }}
    />
  );
}
