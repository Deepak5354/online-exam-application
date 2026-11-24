import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { loadSession } from "@/lib/test/api";
import { AccountProvider, accountFromSession } from "@/components/desk/test-state";
import { AccountSkeleton, Shell } from "@/components/desk/shell";

export const SESSION_QUERY_KEY = ["session"] as const;

/**
 * Layout for everything behind the sign-in. The same `GET /api/auth/me` cookie
 * check the Queue Desk used decides who gets in; the Login page itself is
 * untouched and still lives at /login.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: loadSession,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: mounted,
  });

  if (!mounted || query.isPending) return <AccountSkeleton />;

  const user = query.data?.user ?? null;
  if (!user) {
    // Send visitors to the existing Login page with a note about why.
    if (typeof window !== "undefined") {
      const next = window.location.pathname;
      const target = next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";
      window.location.replace(target);
    }
    return <AccountSkeleton />;
  }

  return (
    <AccountProvider value={accountFromSession(user)}>
      <Shell>
        <Outlet />
      </Shell>
    </AccountProvider>
  );
}
