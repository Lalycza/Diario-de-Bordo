import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  DatabaseBackup,
  FolderKanban,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Menu,
  Package,
  Plus,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRole } from "@/lib/useRole";

type MenuSection = "gerencial" | "projetos" | "produtos" | "clientes" | "usuarios";

type ProductMenuItem = {
  id: string;
  name: string;
};

function MenuItems({
  canManage,
  open,
  toggle,
  products,
  productsLoading,
  onNavigate,
}: {
  canManage: boolean;
  open: Record<MenuSection, boolean>;
  toggle: (section: MenuSection) => void;
  products: ProductMenuItem[];
  productsLoading: boolean;
  onNavigate?: () => void;
}) {
  const itemClass = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted";
  const sectionClass =
    "flex w-full items-center justify-between rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted";

  return (
    <nav className="space-y-2" aria-label="Menu principal">
      {canManage ? (
        <section>
          <button type="button" onClick={() => toggle("gerencial")} className={sectionClass}>
            <span>Gerencial</span>
            {open.gerencial ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          {open.gerencial ? (
            <div className="mt-1">
              <Link to="/projetos" onClick={onNavigate} className={itemClass}>
                <LayoutDashboard className="size-4" />
                Dashboards
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <button type="button" onClick={() => toggle("projetos")} className={sectionClass}>
          <span>Projetos</span>
          {open.projetos ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {open.projetos ? (
          <div className="mt-1 space-y-1">
            <Link to="/projetos" onClick={onNavigate} className={itemClass}>
              <FolderKanban className="size-4" />
              Meus projetos
            </Link>
            <a href="/projetos?novo=1" onClick={onNavigate} className={itemClass}>
              <Plus className="size-4" />
              Novo Projeto
            </a>
          </div>
        ) : null}
      </section>

      <section>
        <button type="button" onClick={() => toggle("produtos")} className={sectionClass}>
          <span>Produtos</span>
          {open.produtos ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {open.produtos ? (
          <div className="mt-1 space-y-1">
            <Link to="/cadastros/produtos" onClick={onNavigate} className={itemClass}>
              <Package className="size-4" />
              Produtos
            </Link>
            <div className="ml-5 border-l pl-2">
              {productsLoading ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">Carregando produtos…</p>
              ) : products.length ? (
                products.map((product) => (
                  <Link
                    key={product.id}
                    to="/cadastros/produtos"
                    onClick={onNavigate}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    title={product.name}
                  >
                    {product.name}
                  </Link>
                ))
              ) : (
                <p className="px-2 py-1 text-xs text-muted-foreground">Nenhum produto ativo.</p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <button type="button" onClick={() => toggle("clientes")} className={sectionClass}>
          <span>Clientes</span>
          {open.clientes ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        {open.clientes ? (
          <div className="mt-1">
            <Link to="/cadastros/clientes" onClick={onNavigate} className={itemClass}>
              <Users className="size-4" />
              Cadastro
            </Link>
          </div>
        ) : null}
      </section>

      {canManage ? (
        <section>
          <button type="button" onClick={() => toggle("usuarios")} className={sectionClass}>
            <span>Cadastro de usuários</span>
            {open.usuarios ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          {open.usuarios ? (
            <div className="mt-1">
              <Link to="/cadastros/usuarios" onClick={onNavigate} className={itemClass}>
                <UserCog className="size-4" />
                Manutenção
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </nav>
  );
}

export function AppShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel?: string | null | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isSupervisor } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [open, setOpen] = useState<Record<MenuSection, boolean>>({
    gerencial: true,
    projetos: true,
    produtos: true,
    clientes: true,
    usuarios: true,
  });

  const productsQuery = useQuery({
    queryKey: ["menu-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function toggle(section: MenuSection) {
    setOpen((current) => ({ ...current, [section]: !current[section] }));
  }

  const canManage = isAdmin || isSupervisor;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-4">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutList className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Gestão de Implantações</p>
              <p className="truncate text-xs text-muted-foreground">HPro</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <MenuItems
              canManage={canManage}
              open={open}
              toggle={toggle}
              products={productsQuery.data ?? []}
              productsLoading={productsQuery.isLoading}
            />
          </div>

          <div className="border-t p-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-2">
              <span className="truncate text-xs text-muted-foreground">{userLabel ?? "Usuário"}</span>
              <ThemeToggle />
            </div>

            {canManage ? (
              <a
                href="https://supabase.com/dashboard/project/zdiuuiqtztommsjrihzs/database/backups/scheduled"
                target="_blank"
                rel="noreferrer"
                className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                <DatabaseBackup className="size-4" />
                Backup
              </a>
            ) : null}

            <Button variant="ghost" className="w-full justify-start gap-2 px-3" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b bg-card">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Abrir menu"
                >
                  <Menu className="size-5" />
                </Button>
                <Link to="/projetos" className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <LayoutList className="size-4" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">Gestão de Implantações</span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">{userLabel ?? ""}</span>
                <div className="md:hidden">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="relative flex h-full w-[min(86vw,20rem)] flex-col border-r bg-card shadow-xl">
                <div className="flex h-16 items-center justify-between border-b px-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <LayoutList className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Gestão de Implantações</p>
                      <p className="text-xs text-muted-foreground">HPro</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                    <X className="size-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  <MenuItems
                    canManage={canManage}
                    open={open}
                    toggle={toggle}
                    products={productsQuery.data ?? []}
                    productsLoading={productsQuery.isLoading}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>

                <div className="border-t p-3">
                  <div className="mb-2 px-2 text-xs text-muted-foreground">{userLabel ?? "Usuário"}</div>
                  {canManage ? (
                    <a
                      href="https://supabase.com/dashboard/project/zdiuuiqtztommsjrihzs/database/backups/scheduled"
                      target="_blank"
                      rel="noreferrer"
                      className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                    >
                      <DatabaseBackup className="size-4" />
                      Backup
                    </a>
                  ) : null}
                  <Button variant="ghost" className="w-full justify-start gap-2 px-3" onClick={handleSignOut}>
                    <LogOut className="size-4" />
                    Sair
                  </Button>
                </div>
              </aside>
            </div>
          ) : null}

          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
