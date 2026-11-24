import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { adminCreateQuestion, adminUpdateQuestion, type AdminQuestion } from "@/lib/test/api";
import { OPTION_LETTERS } from "@/lib/test/format";

type FieldErrors = { text?: string; options?: string[]; subject?: string; correctIndex?: string };

const BLANK = { text: "", options: ["", "", "", ""], correctIndex: 0, subject: "" };

/** Add or edit a question. Validation mirrors the Zod schema on the server. */
export function QuestionForm({
  editing,
  subjects,
  onSaved,
  onCancel,
}: {
  editing?: AdminQuestion | null;
  subjects: string[];
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(editing?.text ?? BLANK.text);
  const [options, setOptions] = useState<string[]>(editing?.options ?? BLANK.options);
  const [correctIndex, setCorrectIndex] = useState(editing?.correctIndex ?? 0);
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function validate(): FieldErrors {
    const found: FieldErrors = {};
    if (text.trim().length < 10) found.text = "Write at least 10 characters.";
    else if (text.trim().length > 500) found.text = "Keep the question under 500 characters.";
    const optionErrors = options.map((option) =>
      option.trim().length === 0 ? "Fill in this option." : option.trim().length > 200 ? "Keep it under 200 characters." : "",
    );
    if (optionErrors.some(Boolean)) found.options = optionErrors;
    else if (new Set(options.map((option) => option.trim().toLowerCase())).size !== 4) {
      found.options = ["", "", "", "All four options must be different."];
    }
    if (subject.trim().length < 2) found.subject = "Give the question a subject, e.g. JavaScript.";
    else if (subject.trim().length > 60) found.subject = "Keep the subject under 60 characters.";
    return found;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    const found = validate();
    setErrors(found);
    if (found.text || found.options || found.subject) return;
    setPending(true);
    const payload = {
      text: text.trim(),
      options: options.map((option) => option.trim()),
      correctIndex,
      subject: subject.trim(),
    };
    try {
      const result = editing ? await adminUpdateQuestion(editing.id, payload) : await adminCreateQuestion(payload);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(editing ? "Question updated." : "Question added to the bank.");
      if (!editing) {
        setText("");
        setOptions(BLANK.options);
        setCorrectIndex(0);
      }
      setErrors({});
      onSaved();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the question.");
    } finally {
      setPending(false);
    }
  }

  function setOption(index: number, value: string) {
    setOptions((existing) => existing.map((option, position) => (position === index ? value : option)));
    setErrors((existing) => ({ ...existing, options: undefined }));
  }

  return (
    <form className="panel p-5 sm:p-6" onSubmit={onSubmit} noValidate aria-label={editing ? "Edit question" : "Add a question"}>
      <h2 className="font-display text-lg font-bold text-ink">{editing ? "Edit question" : "Add a question"}</h2>
      <p className="mt-1 text-sm text-muted">
        Saved straight to MongoDB. Questions are drawn at random when a student starts a test.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="question-text">
            Question
          </label>
          <textarea
            id="question-text"
            className="field min-h-20 resize-y"
            value={text}
            maxLength={500}
            onChange={(event) => {
              setText(event.target.value);
              setErrors((existing) => ({ ...existing, text: undefined }));
            }}
            aria-invalid={errors.text ? true : undefined}
            aria-describedby={errors.text ? "question-text-error" : undefined}
            placeholder="What does `typeof null` return in JavaScript?"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            {errors.text ? (
              <p id="question-text-error" className="text-xs font-medium text-accent" role="alert">
                {errors.text}
              </p>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted tabular-nums">{text.length}/500</span>
          </div>
        </div>

        <fieldset>
          <legend className="label">Options — pick the correct one</legend>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-start gap-2">
                <label
                  className={clsx(
                    "mt-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border text-xs font-bold",
                    correctIndex === index
                      ? "border-success bg-success-soft text-success"
                      : "border-line bg-sheet text-slate-600 hover:border-line-strong",
                  )}
                  title={`Mark option ${OPTION_LETTERS[index]} as the correct answer`}
                >
                  <input
                    type="radio"
                    name="correct-option"
                    className="sr-only"
                    checked={correctIndex === index}
                    onChange={() => setCorrectIndex(index)}
                  />
                  {OPTION_LETTERS[index]}
                </label>
                <input
                  className="field"
                  value={option}
                  maxLength={200}
                  onChange={(event) => setOption(index, event.target.value)}
                  placeholder={`Option ${OPTION_LETTERS[index]}`}
                  aria-label={`Option ${OPTION_LETTERS[index]}`}
                  aria-invalid={errors.options?.[index] ? true : undefined}
                />
              </div>
            ))}
          </div>
          {errors.options?.some(Boolean) ? (
            <p className="mt-1.5 text-xs font-medium text-accent" role="alert">
              {errors.options.find(Boolean)}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">
              Answer key: <span className="font-semibold text-ink">{OPTION_LETTERS[correctIndex]}</span>
            </p>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="question-subject">
            Subject
          </label>
          <input
            id="question-subject"
            className="field"
            list="subject-options"
            value={subject}
            maxLength={60}
            onChange={(event) => {
              setSubject(event.target.value);
              setErrors((existing) => ({ ...existing, subject: undefined }));
            }}
            aria-invalid={errors.subject ? true : undefined}
            placeholder="JavaScript"
          />
          <datalist id="subject-options">
            {subjects.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          {errors.subject ? (
            <p className="mt-1 text-xs font-medium text-accent" role="alert">
              {errors.subject}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm font-medium text-accent" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            {pending ? "Saving…" : editing ? "Save changes" : "Add question"}
          </button>
          {editing && onCancel ? (
            <button type="button" className="btn btn-line" onClick={onCancel} disabled={pending}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
