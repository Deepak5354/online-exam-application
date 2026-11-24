import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, ShieldAlert, Trash2, Users } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { adminDeleteQuestion, adminListQuestions, adminStats, type AdminQuestion } from "@/lib/test/api";
import { useAccount } from "@/components/desk/test-state";
import { QuestionForm } from "@/components/desk/question-form";
import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/desk/ui";
import { OPTION_LETTERS } from "@/lib/test/format";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin · Online Exam Application" }] }),
  component: AdminPage,
});

/**
 * Admin panel: add, edit and delete questions in the bank.
 * The server enforces admin access on every call (403 for students); this page
 * only hides itself from students to avoid a dead end.
 */
function AdminPage() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [filter, setFilter] = useState("");

  const questions = useQuery({ queryKey: ["admin", "questions"], queryFn: adminListQuestions, refetchOnWindowFocus: false });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminStats, refetchOnWindowFocus: false });

  const remove = useMutation({
    mutationFn: (questionId: string) => adminDeleteQuestion(questionId),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Question removed.");
      if (editing) setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["bank"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete the question."),
  });

  if (account.role !== "admin") {
    return (
      <div className="panel max-w-lg p-6">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <ShieldAlert className="size-5 text-warn" aria-hidden="true" />
          Admins only
        </p>
        <p className="mt-2 text-sm text-muted">
          Your account is a student account. Ask an admin to add you with <code className="font-mono">ADMIN_EMAILS</code>.
        </p>
      </div>
    );
  }

  const list = questions.data && "ok" in questions.data && questions.data.ok ? questions.data.questions : [];
  const subjects = [...new Set(list.map((question) => question.subject))].sort();
  const visible = filter ? list.filter((question) => question.subject === filter) : list;

  return (
    <div className="rise space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Question bank"
        description="Questions are stored in MongoDB and served to students through the API. Correct answers are never sent before submission."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Questions in bank"
          value={stats.data && "questions" in stats.data ? String(stats.data.questions) : "—"}
          hint="At least 10 needed for a test"
          icon={BookOpen}
        />
        <StatCard
          label="Subjects"
          value={stats.data && "subjects" in stats.data ? String(stats.data.subjects.length) : "—"}
          hint={subjects.slice(0, 3).join(", ")}
          icon={BookOpen}
          tone="warn"
        />
        <StatCard
          label="Registered students"
          value={stats.data && "students" in stats.data ? String(stats.data.students) : "—"}
          hint="Admins are not counted"
          icon={Users}
          tone="success"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section aria-labelledby="bank-heading" className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 id="bank-heading" className="font-display text-lg font-bold">
              Questions
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="subject-filter">
                Filter by subject
              </label>
              <select
                id="subject-filter"
                className="field min-h-9 w-auto py-1 text-sm"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-3 sm:p-4">
            {questions.isPending ? (
              <ListSkeleton rows={4} />
            ) : visible.length === 0 ? (
              <EmptyState icon={BookOpen} title={filter ? "No questions for this subject" : "The bank is empty"}>
                <p>Add your first question with the form beside this list.</p>
              </EmptyState>
            ) : (
              <ul className="max-h-[42rem] space-y-2.5 overflow-y-auto pr-1">
                {visible.map((question) => (
                  <li
                    key={question.id}
                    className={clsx(
                      "rounded-xl border p-3.5",
                      editing?.id === question.id ? "border-primary bg-primary-soft/40" : "border-line bg-sheet",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{question.text}</p>
                        <p className="mt-1 text-xs text-muted">
                          <span className="chip chip-muted mr-1.5">{question.subject}</span>
                          Answer: {OPTION_LETTERS[question.correctIndex]}. {question.options[question.correctIndex]}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Edit question: ${question.text}`}
                          onClick={() => setEditing(question)}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={`Delete question: ${question.text}`}
                          disabled={remove.isPending}
                          onClick={() => {
                            if (window.confirm("Delete this question from the bank?")) remove.mutate(question.id);
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <ul className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                      {question.options.map((option, index) => (
                        <li key={index} className={clsx("truncate", index === question.correctIndex && "font-semibold text-success")}>
                          {OPTION_LETTERS[index]}. {option}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <QuestionForm
            key={editing?.id ?? "new"}
            editing={editing}
            subjects={subjects}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void queryClient.invalidateQueries({ queryKey: ["admin"] });
              void queryClient.invalidateQueries({ queryKey: ["bank"] });
            }}
          />
        </div>
      </div>
    </div>
  );
}
