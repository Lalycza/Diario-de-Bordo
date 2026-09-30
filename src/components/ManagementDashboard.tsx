// Dashboard gerencial — publicação forçada sem alteração de layout
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Rocket,
} from "lucide-react";

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
        .select("id, cliente, descricao, analista, previsao_conclusao")
        .eq("arquivado", false)
        .order("previsao_conclusao", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const demandsQuery = useQuery({
    queryKey: ["management-dashboard-demands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demands")
        .select("id, project_id, status, priority, delivery_deadline");
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const demands = demandsQuery.data ?? [];
    const dated = projects.filter((p) => p.previsao_conclusao);
    const overdue = dated.filter((p) => daysUntil(p.previsao_conclusao!) < 0);
    const upcoming = dated
      .filter((p) => {
        const days = daysUntil(p.previsao_conclusao!);
        return days >= 0 && days <= 15;
      })
      .sort((a, b) => daysUntil(a.previsao_conclusao!) - daysUntil(b.previsao_conclusao!));
    const onTrack = dated.filter((p) => daysUntil(p.previsao_conclusao!) >= 0);
    const pendingDemands = demands.filter((d) => d.status !== "finalizado");
    const highPriority = pendingDemands.filter((d) => d.priority === "alta");

    return { projects, overdue, upcoming, onTrack, pendingDemands, highPriority };
  }, [projectsQuery.data, demandsQuery.data]);

  if (projectsQuery.isLoading || demandsQuery.isLoading) {
    return <p className="mb-6 text-sm text-muted-foreground">Carregando painel gerencial…</p>;
  }

  if (projectsQuery.isError || demandsQuery.isError) {
    return (
      <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        Não foi possível carregar o painel gerencial.
      </div>
    );
  }

  return (
    <section className="mb-8 space-y-4" aria-label="Painel gerencial">
      <div>
        <h2 className="text-lg font-semibold">Visão geral da implantação</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhamento rápido da carteira, prazos e demandas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Rocket className="size-4" />Go Lives próximos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{summary.upcoming.length}</p><p className="text-xs text-muted-foreground">próximos 15 dias</p></CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="size-4" />Atrasados</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{summary.overdue.length}</p><p className="text-xs text-muted-foreground">com prazo vencido</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" />No prazo</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{summary.onTrack.length}</p><p className="text-xs text-muted-foreground">com data prevista</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ClipboardList className="size-4" />Demandas abertas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{summary.pendingDemands.length}</p><p className="text-xs text-muted-foreground">{summary.highPriority.length} de alta prioridade</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="size-4" />Projetos ativos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{summary.projects.length}</p><p className="text-xs text-muted-foreground">na carteira atual</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">🚀 Próximos Go Lives</CardTitle></CardHeader>
          <CardContent>
            {summary.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum Go Live nos próximos 15 dias.</p>
            ) : (
              <div className="space-y-3">
                {summary.upcoming.slice(0, 6).map((project) => (
                  <div key={project.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{project.cliente}</p>
                      <p className="text-xs text-muted-foreground">{project.analista ?? "Sem analista definido"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">{formatDate(project.previsao_conclusao)}</p>
                      <p className="text-xs text-muted-foreground">
                        {daysUntil(project.previsao_conclusao!) === 0 ? "hoje" : `em ${daysUntil(project.previsao_conclusao!)} dia(s)`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">🔴 Projetos que precisam de atenção</CardTitle></CardHeader>
          <CardContent>
            {summary.overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto com prazo vencido.</p>
            ) : (
              <div className="space-y-3">
                {summary.overdue.slice(0, 6).map((project) => (
                  <div key={project.id} className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{project.cliente}</p>
                      <p className="text-xs text-muted-foreground">{project.analista ?? "Sem analista definido"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">{formatDate(project.previsao_conclusao)}</p>
                      <p className="text-xs text-destructive">{Math.abs(daysUntil(project.previsao_conclusao!))} dia(s) de atraso</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
