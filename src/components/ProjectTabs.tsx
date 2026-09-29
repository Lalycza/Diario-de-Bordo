import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CalendarRange, LayoutGrid } from "lucide-react";

const tabs = [
  { to: "/projeto/$projectId/cronograma", label: "Cronograma", icon: CalendarRange },
  { to: "/projeto/$projectId/modulos", label: "Módulos", icon: LayoutGrid },
  { to: "/projeto/$projectId/diario", label: "Diário de bordo", icon: BookOpen },
] as const;

export function ProjectHeader({
  projectId,
  cliente,
  subtitle,
}: {
  projectId: string;
  cliente: string;
  subtitle?: string | null | undefined;
}) {
  return (
    <div className="mb-6 space-y-4">
      <Link
        to="/projetos"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Todos os projetos
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{cliente}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ projectId }}
            className="-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{
              className:
                "-mb-px inline-flex items-center gap-2 border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground",
            }}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
