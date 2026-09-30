import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ClipboardList, FolderKanban, LayoutGrid, LogOut, Menu, Users, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children, userLabel }: { children: ReactNode; userLabel?: string | null | undefined }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Abrir menu" onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Link to="/projetos" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><LayoutGrid className="size-4" /></span>
              <span className="text-sm font-semibold tracking-tight">Gestão de Implantações</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {userLabel ? <span className="hidden text-xs text-muted-foreground sm:inline">{userLabel}</span> : null}
            <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="size-4" />Sair</Button>
          </div>
        </div>
        {menuOpen ? (
          <nav className="border-t bg-card">
            <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-2">
              <NavItem to="/projetos" icon={FolderKanban} label="Projetos" onClick={() => setMenuOpen(false)} />
              <NavItem to="/cadastros/clientes" icon={Building2} label="Clientes" onClick={() => setMenuOpen(false)} />
              <NavItem to="/cadastros/produtos" icon={ClipboardList} label="Produtos" onClick={() => setMenuOpen(false)} />
              <NavItem to="/cadastros/usuarios" icon={Users} label="Usuários" onClick={() => setMenuOpen(false)} />
            </div>
          </nav>
        ) : null}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, onClick }: {
  to: "/projetos" | "/cadastros/clientes" | "/cadastros/produtos" | "/cadastros/usuarios";
  icon: typeof FolderKanban;
  label: string;
  onClick: () => void;
}) {
  return <Link to={to} onClick={onClick} activeProps={{ className: "bg-primary/10 text-primary" }} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="size-4" />{label}</Link>;
}
