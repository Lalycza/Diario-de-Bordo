import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

export function ManagementDashboard() {
  const projectsQuery = useQuery({
    queryKey: ["management-dashboard-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, cliente, descricao, analista, previsao_conclusao, finalized, arquivado")
        .eq("arquivado", false)
        .eq("finalized", false)
        .order("previsao_conclusao", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const demandsQuery = useQuery({
    queryKey: ["management-dashboard-demands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("demands").select("id, project_id, status, priority");
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const demands = demandsQuery.data ?? [];
    const dated = projects.filter((p) => p.previsao_conclusao);
    const overdue = dated.filter((p) => daysUntil(p.previsao_conclusao!) < 0);
    const upcoming = dated.filter((p) => {
      const days = daysUntil(p.previsao_conclusao!);
      return days >= 0 && days <= 15;
    }).sort((a, b) => daysUntil(a.previsao_conclusao!) - daysUntil(b.previsao_conclusao!));
    const onTrack = dated.filter((p) => daysUntil(p.previsao_conclusao!) >= 0);
    const pendingDemands = demands.filter((d) => d.status !== "finalizado");
    const highPriority = pendingDemands.filter((d) => d.priority === "alta");
    return { projects, overdue, upcoming, onTrack, pendingDemands, highPriority };
  }, [projectsQuery.data, demandsQuery.data]);

  if (projectsQuery.isLoading || demandsQuery.isLoading) {
    return <p className="mb-6 text-sm text-muted-foreground">Carregando painel gerencial…</p>;
  }

  if (projectsQuery.isError || demandsQuery.isError) {
    return <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível carregar o painel gerencial.</div>;
  }

  const row = (project: (typeof summary.projects)[number], extra: ReactNode) => (
    <div key={project.id} className="my-1.5 flex items-center justify-between gap-3 rounded-[10px] border p-3">
      <div className="min-w-0"><p className="truncate font-medium">{project.cliente ?? project.descricao ?? "Projeto"}</p><p className="text-xs text-muted-foreground">{project.analista ?? "Sem responsável"}</p></div>
      <div className="shrink-0 text-right"><p className="text-sm font-medium">{formatDate(project.previsao_conclusao)}</p><div className="text-xs text-muted-foreground">{extra}</div></div>
    </div>
  );

  return (
    <section className="mb-8 space-y-4" aria-label="Painel gerencial">
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-xl font-semibold">Painel gerencial</h2>
        <p className="text-sm text-muted-foreground">Visão rápida da carteira, prazos e demandas.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="pt-4"><p className="text-2xl font-semibold">{summary.upcoming.length}</p><p className="text-xs text-muted-foreground">Entregas nos próximos 15 dias</p></CardContent></Card>
          <Card className="border-destructive/20"><CardContent className="pt-4"><p className="text-2xl font-semibold text-destructive">{summary.overdue.length}</p><p className="text-xs text-muted-foreground">Projetos atrasados</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-2xl font-semibold">{summary.onTrack.length}</p><p className="text-xs text-muted-foreground">No prazo</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-2xl font-semibold">{summary.pendingDemands.length}</p><p className="text-xs text-muted-foreground">Demandas abertas · {summary.highPriority.length} de alta prioridade</p></CardContent></Card>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">🚀 Próximas entregas</CardTitle></CardHeader><CardContent>{summary.upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma entrega nos próximos 15 dias.</p> : summary.upcoming.slice(0, 6).map((p) => row(p, daysUntil(p.previsao_conclusao!) === 0 ? "hoje" : `em ${daysUntil(p.previsao_conclusao!)} dia(s)`))}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">🔴 Precisam de atenção</CardTitle></CardHeader><CardContent>{summary.overdue.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum projeto com prazo vencido.</p> : summary.overdue.slice(0, 6).map((p) => row(p, <span className="text-destructive">{Math.abs(daysUntil(p.previsao_conclusao!))} dia(s) de atraso</span>))}</CardContent></Card>
        </div>
      </div>
    </section>
  );
}
