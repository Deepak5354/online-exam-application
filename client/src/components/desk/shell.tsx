import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { History, LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { signOut } from "@/lib/auth/client";
import { useAccount } from "@/components/desk/test-state";
import { Logo } from "@/components/desk/auth-shell";
import { ThemeToggle } from "@/components/desk/theme-toggle";

type NavId = "dashboard" | "history" | "admin" | "profile";

function activeNav(pathname: string, id: NavId) {
  if (id === "dashboard") return pathname === "/";
  if (id === "history") return pathname === "/history" || /^\/history\/[^/]+$/.test(pathname);
  if (id === "admin") return pathname === "/admin";
  return pathname === "/profile";
}

/** Placeholder shown for a moment while the session cookie is checked. */
export function AccountSkeleton() {
  return (
    <div className="min-h-dvh md:flex">
      <div className="border-b border-line bg-sheet px-4 py-3 md:h-dvh md:w-64 md:shrink-0 md:border-b-0 md:border-r md:px-5 md:py-5">
        <div className="skeleton h-9 w-36" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-9">
          <p className="text-sm text-muted" role="status">
            Checking your session…
          </p>
        </div>
      </div>
    </div>
  );
}

/** Sidebar layout for the signed-in app. Same structure as Queue Desk, new destinations. */
export function Shell({ children }: { children: ReactNode }) {
  const account = useAccount();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [signingOut, setSigningOut] = useState(false);
  // The test screen gets the full width and no navigation away from it.
  const inTest = /^\/test\/[^/]+$/.test(pathname);

  const NAV = [
    { id: "dashboard" as const, to: "/", label: "Dashboard", icon: LayoutDashboard },
    { id: "history" as const, to: "/history", label: "Test history", icon: History },
    ...(account.role === "admin"
      ? [{ id: "admin" as const, to: "/admin", label: "Admin", icon: ShieldCheck }]
      : []),
  ];

  const initial = (account.name || account.email || "S").charAt(0).toUpperCase();

  function logout() {
    setSigningOut(true);
    void signOut("/login").catch((error) => {
      setSigningOut(false);
      toast.error(error instanceof Error ? error.message : "Sign-out failed. You are still signed in.");
    });
  }

  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#test-app"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-sheet focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="flex flex-col border-b border-line bg-sheet md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5">
          <Link to="/" aria-label="Online Exam Application home">
            <Logo compact />
          </Link>
          <div className="flex items-center gap-1.5">
            {/* Phones show the icon here; larger screens have the labeled button in the sidebar footer. */}
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <Link
              to="/profile"
              aria-label="Profile"
              className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary md:hidden"
            >
              {initial}
            </Link>
          </div>
        </div>

        <nav
          aria-label="Test app"
          className="flex gap-1.5 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0"
        >
          {NAV.map(({ id, to, label, icon: Icon }) => {
            const active = activeNav(pathname, id);
            return (
              <Link
                key={id}
                to={to}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold transition-colors md:w-full",
                  active ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                )}
              >
                <Icon className="size-[1.1rem]" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        {!inTest ? (
          <div className="mt-5 hidden px-3 md:block">
            <div className="panel border-dashed p-3.5">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">How a test works</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted">
                <li>10 questions, drawn at random</li>
                <li>10 minutes, one attempt at a time</li>
                <li>Your answers save as you go</li>
              </ul>
              <Link to="/test" className="btn btn-primary mt-3 min-h-10 w-full text-sm">
                Start new test
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-auto hidden border-t border-line p-3 md:block">
          <Link
            to="/profile"
            aria-current={activeNav(pathname, "profile") ? "page" : undefined}
            className={clsx(
              "flex min-h-12 items-center gap-3 rounded-xl px-3 transition-colors",
              activeNav(pathname, "profile") ? "bg-primary-soft" : "hover:bg-slate-50",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{account.name || account.email}</span>
              <span className="flex items-center gap-1 truncate text-xs text-muted">
                {account.role === "admin" ? (
                  <>
                    <ShieldCheck className="size-3" aria-hidden="true" /> Admin
                  </>
                ) : (
                  <>
                    <UserRound className="size-3" aria-hidden="true" /> Student
                  </>
                )}
              </span>
            </span>
          </Link>
          <ThemeToggle
            labeled
            className="mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
          />
          <button
            type="button"
            className="mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink disabled:cursor-wait disabled:opacity-60"
            disabled={signingOut}
            onClick={logout}
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      </aside>

      <main id="test-app" className="min-w-0 flex-1">
        <div className={clsx("mx-auto w-full px-4 py-6 md:px-8 md:py-9", inTest ? "max-w-6xl" : "max-w-5xl")}>
          {children}
          {!inTest ? (
            <div className="mt-10 flex justify-center md:hidden">
              <button type="button" className="btn btn-ghost" disabled={signingOut} onClick={logout}>
                <LogOut className="size-4" aria-hidden="true" />
                {signingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
