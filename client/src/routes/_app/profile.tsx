import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserRound } from "lucide-react";
import { updateName } from "@/lib/auth/client";
import { ME_QUERY_KEY } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/desk/test-state";
import { SESSION_QUERY_KEY } from "@/routes/_app";
import { ChangePasswordCard } from "@/components/desk/change-password";
import { PageHeader } from "@/components/desk/ui";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile · Online Exam Application" }] }),
  component: ProfilePage,
});

/** Account page. The change-password card is the one Queue Desk already had. */
function ProfilePage() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const initial = (account.name || account.email).charAt(0).toUpperCase() || "S";

  useEffect(() => {
    if (!editing) setName(account.name);
  }, [editing, account.name]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 80) {
      setError("Use a name between 2 and 80 characters.");
      return;
    }
    setPending(true);
    try {
      const result = await updateName(trimmed);
      if (!result.ok) {
        setError(result.error || "Could not update the name.");
        return;
      }
      // Both the header and the sidebar read the name from the session query.
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      queryClient.setQueryData(ME_QUERY_KEY, (existing: unknown) => existing);
      setEditing(false);
      setMessage("Name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the name.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rise max-w-lg space-y-6">
      <PageHeader eyebrow="Account" title="Profile" />
      <div className="panel p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-lg font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">{account.name || "Student"}</p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted">
              {account.role === "admin" ? (
                <>
                  <ShieldCheck className="size-3.5" aria-hidden="true" /> Admin
                </>
              ) : (
                <>
                  <UserRound className="size-3.5" aria-hidden="true" /> Student
                </>
              )}
            </p>
          </div>
        </div>
        <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Name</dt>
            {editing ? (
              <form className="mt-2 space-y-3" onSubmit={onSave}>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  required
                />
                <div className="flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={pending}>
                    {pending ? "Saving…" : "Save"}
                  </button>
                  <button
                    className="btn btn-line"
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setError("");
                      setName(account.name);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dd className="mt-0.5 font-medium text-ink">{account.name || "—"}</dd>
            )}
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Email</dt>
            <dd className="mt-0.5 font-medium text-ink">{account.email}</dd>
            <p className="mt-1 text-xs text-muted">Email is the address used to sign in. It cannot be changed here.</p>
          </div>
        </dl>
        {error ? (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm text-success" role="status">
            {message}
          </p>
        ) : null}
        {!editing ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
              Edit profile
            </button>
          </div>
        ) : null}
      </div>
      <ChangePasswordCard />
    </div>
  );
}
