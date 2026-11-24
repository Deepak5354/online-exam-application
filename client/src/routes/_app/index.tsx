import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/desk/dashboard-view";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Dashboard · Online Exam Application" }] }),
  component: DashboardView,
});
