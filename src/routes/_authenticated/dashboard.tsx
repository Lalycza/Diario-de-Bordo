import { createFileRoute } from "@tanstack/react-router";
import { ManagementDashboard } from "@/components/ManagementDashboard";
import { AppShell } from "@/components/AppShell";
import { useRole } from "@/lib/useRole";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, isSupervisor } = useRole();
  return (
    <AppShell userLabel={user.email}>
      {isAdmin || isSupervisor ? <ManagementDashboard /> : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">O Dashboard gerencial está disponível para Administrador e Supervisor.</div>
      )}
    </AppShell>
  );
}