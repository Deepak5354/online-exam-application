import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardList, Loader2, PlayCircle, Timer, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import { loadBank, startTest } from "@/lib/test/api";
import { PageHeader } from "@/components/desk/ui";

export const Route = createFileRoute("/_app/test/")({
  head: () => ({ meta: [{ title: "Start a test · Online Exam Application" }] }),
  component: StartTestPage,
});

/**
 * Confirms the rules, then hands over to /test/$attemptId.
 *
 * The attempt itself is created by the server: it samples 10 questions from
 * MongoDB and writes `startedAt` + `deadlineAt` at that moment. Nothing about
 * the clock is decided in the browser.
 */
function StartTestPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const bank = useQuery({ queryKey: ["bank"], queryFn: loadBank, refetchOnWindowFocus: false });

  function begin(subject?: string) {
    setStarting(true);
    setError("");
    void (async () => {
      try {
        const result = await startTest(subject);
        if (!result || !("ok" in result) || !result.ok) {
          setError(result && "error" in result ? result.error : "Could not start a test.");
          setStarting(false);
          return;
        }
        if ("attempt" in result) {
          await navigate({ to: "/test/$attemptId", params: { attemptId: result.attempt.id }, replace: true });
        } else {
          await navigate({ to: "/history/$attemptId", params: { attemptId: result.result.id }, replace: true });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start a test.");
        setStarting(false);
      }
    })();
  }

  const busy = starting;

  return (
    <div className="rise max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Online test"
        title="Start a new test"
        description="Ten questions, ten minutes. Your answers are saved as you go and graded on the server."
      />

      {error ? (
        <div className="panel border-warn/40 bg-warn-soft p-4" role="alert">
          <p className="flex items-center gap-2 text-sm font-semibold text-warn">
            <TriangleAlert className="size-4" aria-hidden="true" />
            Cannot start a test yet
          </p>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      ) : null}

      <div className="panel p-6">
        {busy ? (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Preparing your test…
          </p>
        ) : (
          <>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <ClipboardList className="size-[1.1rem]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-ink">
                    {bank.data?.required ?? 10} multiple-choice questions
                  </span>
                  <span className="block text-muted">
                    Picked at random from {bank.data?.total ?? "the"} questions in MongoDB. Four options each.
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn">
                  <Timer className="size-[1.1rem]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-ink">10 minute countdown</span>
                  <span className="block text-muted">
                    It starts now and keeps running on the server if you refresh or switch tabs.
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                  <BookOpen className="size-[1.1rem]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-ink">Result straight away</span>
                  <span className="block text-muted">
                    Score, percentage, pass or fail, and a question-by-question breakdown.
                  </span>
                </span>
              </li>
            </ul>

            {bank.data && "subjects" in bank.data && bank.data.subjects.length > 1 ? (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-semibold text-ink">Choose a subject (optional)</p>
                <p className="mt-0.5 text-xs text-muted">
                  Mixed draws from every subject. A subject needs at least {bank.data.required} questions.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={clsx("btn", starting ? "btn-line" : "btn-primary")}
                    disabled={starting}
                    onClick={() => begin()}
                  >
                    <PlayCircle className="size-4" aria-hidden="true" />
                    Mixed test
                  </button>
                  {bank.data.subjects
                    .filter((subject) => subject.count >= (bank.data?.required ?? 10))
                    .map((subject) => (
                      <button
                        key={subject.subject}
                        type="button"
                        className="btn btn-line"
                        disabled={starting}
                        onClick={() => begin(subject.subject)}
                      >
                        {subject.subject}
                        <span className="chip chip-muted tabular-nums">{subject.count}</span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-primary btn-lg mt-6 w-full" disabled={starting} onClick={() => begin()}>
                <PlayCircle className="size-5" aria-hidden="true" />
                Start test
              </button>
            )}

            <p className="mt-4 text-xs text-muted">
              Starting the test begins the countdown immediately. Keep this tab open until you submit.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
