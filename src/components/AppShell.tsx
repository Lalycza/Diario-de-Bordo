import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutList, LogOut, LayoutDashboard, ClipboardList } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel?: string | null | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-1">
            <Link to="/projetos" className="mr-2 flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><LayoutList className="size-4" /></span>
              Gestão de Implantações
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent"><LayoutDashboard className="size-4" />Dashboard</Link>
            <Link to="/demandas" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent"><ClipboardList className="size-4" />Demandas</Link>
          </nav>
          <div className="flex items-center gap-3">
            {userLabel ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">{userLabel}</span>
            ) : null}
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
