import { createFileRoute } from "@tanstack/react-router";
import { ManagementDashboard } from "@/components/ManagementDashboard";
import { useRole } from "@/lib/useRole";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — IMPLANTA" },
      { name: "description", content: "Painel gerencial da carteira de projetos e demandas." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin, isSupervisor, isCS } = useRole();

  if (!(isAdmin || isSupervisor || isCS)) {
    return null;
  }

  return <ManagementDashboard />;
}
