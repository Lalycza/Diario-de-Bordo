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
    queryKey: ["management-dashboard-projects-v2"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, cliente, descricao, analista, previsao_conclusao, finalized, arquivado, documentation_scope")
        .eq("arquivado", false)
        .eq("finalized", false)
        .order("previsao_conclusao", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const demandsQuery = useQuery({
    queryKey: ["management-dashboard-demands-v2"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase.from("demands").select("id, project_id, status, priority");
      if (error) throw error;
      return data ?? [];
    },
  });

  const trainingsQuery = useQuery({
    queryKey: ["management-dashboard-trainings-v3"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("project_id, module_id, submodule_id, status, rescheduled_at, planned_date, training_start_date, training_completion_date, homologation_date, homologation_responsible")
        .range(0, 4999);
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectModulesQuery = useQuery({
    queryKey: ["management-dashboard-project-modules-v2"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_modules")
        .select("project_id, module_id, planned_training_date")
        .range(0, 4999);
      if (error) throw error;
      return data ?? [];
    },
  });

  const modulesQuery = useQuery({
    queryKey: ["management-dashboard-modules-v1"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase.from("modules").select("id, nome").range(0, 4999);
      if (error) throw error;
      return data ?? [];
    },
  });

  const documentationQuery = useQuery({
    queryKey: ["management-dashboard-documentation-v2"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documentation_status")
        .select("project_id, document_type, version, sent_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const demands = demandsQuery.data ?? [];
    const trainings = trainingsQuery.data ?? [];
    const projectModules = projectModulesQuery.data ?? [];
    const documentation = documentationQuery.data ?? [];
    const modules = modulesQuery.data ?? [];
    const moduleById = new Map(modules.map((m) => [m.id, m]));
    const dated = projects.filter((p) => p.previsao_conclusao);
    const overdue = dated.filter((p) => daysUntil(p.previsao_conclusao!) < 0);
    const upcoming = dated.filter((p) => {
      const days = daysUntil(p.previsao_conclusao!);
      return days >= 0 && days <= 15;
    }).sort((a, b) => daysUntil(a.previsao_conclusao!) - daysUntil(b.previsao_conclusao!));
    const onTrack = dated.filter((p) => daysUntil(p.previsao_conclusao!) >= 0);
    const pendingDemands = demands.filter((d) => d.status !== "finalizado");
    const highPriority = pendingDemands.filter((d) => d.priority === "alta");
    const withoutAnalyst = projects.filter((p) => !p.analista?.trim());
    const withoutDeadline = projects.filter((p) => !p.previsao_conclusao);

    type AttentionModule = {
      projectId: string;
      moduleId: string;
      moduleName: string;
      reasons: string[];
      severity: "critical" | "warning";
    };

    const attentionModules: AttentionModule[] = [];

    projectModules.forEach((pm) => {
      const module = moduleById.get(pm.module_id);
      if (!module) return;

      const rows = trainings.filter((t) => t.project_id === pm.project_id && t.module_id === pm.module_id);
      const main = rows.find((t) => !t.submodule_id);
      const subs = rows.filter((t) => Boolean(t.submodule_id));
      const forecast = pm.planned_training_date ?? main?.planned_date ?? null;
      const reasons: string[] = [];

      if (!forecast) {
        reasons.push("Sem previsão de treinamento");
      } else if (daysUntil(forecast) <= 0 && !main?.training_start_date && !subs.some((t) => t.training_start_date)) {
        reasons.push("Treinamento previsto sem início");
      }

      const reschedules = rows.filter((t) => t.rescheduled_at).length;
      if (reschedules >= 2) reasons.push(reschedules + " replanejamentos");

      const allSubsHomologated = subs.length > 0 && subs.every((t) => t.homologation_date && t.homologation_responsible);
      const hasCompletedWork = subs.length > 0
        ? subs.every((t) => t.training_completion_date)
        : Boolean(main?.training_completion_date);
      if (hasCompletedWork && !allSubsHomologated) reasons.push("Homologação pendente");

      if (reasons.length > 0) {
        attentionModules.push({
          projectId: pm.project_id,
          moduleId: pm.module_id,
          moduleName: module.nome,
          reasons,
          severity: reasons.some((r) => r === "Treinamento previsto sem início" || r === "Homologação pendente") ? "critical" : "warning",
        });
      }
    });

    const projectAttentionById = new Map<string, AttentionModule[]>();
    attentionModules.forEach((item) => {
      projectAttentionById.set(item.projectId, [...(projectAttentionById.get(item.projectId) ?? []), item]);
    });

    const rescheduledCount = new Map<string, number>();
    trainings.forEach((t) => {
      if (t.rescheduled_at) rescheduledCount.set(t.project_id, (rescheduledCount.get(t.project_id) ?? 0) + 1);
    });
    const frequentRescheduling = projects.filter((p) => (rescheduledCount.get(p.id) ?? 0) >= 2);

    const moduleIdsByProject = new Map<string, string[]>();
    projectModules.forEach((pm) => {
      moduleIdsByProject.set(pm.project_id, [...(moduleIdsByProject.get(pm.project_id) ?? []), pm.module_id]);
    });
    const projectTrainings = new Map<string, typeof trainings>();
    trainings.forEach((t) => {
      projectTrainings.set(t.project_id, [...(projectTrainings.get(t.project_id) ?? []), t]);
    });

    const moduleHomologated = (projectId: string) => {
      const expected = moduleIdsByProject.get(projectId) ?? [];
      const rows = projectTrainings.get(projectId) ?? [];
      return expected.filter((moduleId) => {
        const main = rows.find((t) => t.module_id === moduleId && !t.submodule_id);
        if (main?.status === "Homologado") return true;
        const subs = rows.filter((t) => t.module_id === moduleId && t.submodule_id);
        return subs.length > 0 && subs.every((t) => t.status === "Homologado");
      }).length;
    };

    const goLiveAttention = dated.filter((p) => {
      const days = daysUntil(p.previsao_conclusao!);
      return days >= 0 && days <= 30 && moduleHomologated(p.id) === 0;
    });

    const documentationPending = projects.filter((p) => {
      const scope = p.documentation_scope ?? "all";
      const required = scope === "diario" ? ["diario"] : ["mapa", "cronograma", "diario"];
      return required.some((type) => {
        const row = documentation.find((d) => d.project_id === p.id && d.document_type === type);
        return !row || row.version <= 0 || !row.sent_at;
      });
    });

    return {
      projects, overdue, upcoming, onTrack, pendingDemands, highPriority, withoutAnalyst, withoutDeadline,
      frequentRescheduling, goLiveAttention, documentationPending, attentionModules, projectAttentionById,
      rescheduledCount,
    };
  }, [projectsQuery.data, demandsQuery.data, trainingsQuery.data, projectModulesQuery.data, modulesQuery.data, documentationQuery.data]);

  if (projectsQuery.isLoading || demandsQuery.isLoading || trainingsQuery.isLoading || projectModulesQuery.isLoading || modulesQuery.isLoading || documentationQuery.isLoading) {
    return <p className="mb-6 text-sm text-muted-foreground">Carregando painel gerencial…</p>;
  }

  if (projectsQuery.isError || demandsQuery.isError || trainingsQuery.isError || projectModulesQuery.isError || modulesQuery.isError || documentationQuery.isError) {
    return <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível carregar o painel gerencial.</div>;
  }

  const row = (project: (typeof summary.projects)[number], extra: ReactNode) => (
    <div key={project.id} className="my-1.5 flex items-center justify-between gap-3 rounded-[10px] border p-3">
      <div className="min-w-0"><p className="truncate font-medium">{project.cliente ?? project.descricao ?? "Projeto"}</p><p className="text-xs text-muted-foreground">{project.analista ?? "Sem responsável"}</p></div>
      <div className="shrink-0 text-right"><p className="text-sm font-medium">{formatDate(project.previsao_conclusao)}</p><div className="text-xs text-muted-foreground">{extra}</div></div>
    </div>
  );

  const attentionProjects = (projects: typeof summary.projects, label: (project: typeof summary.projects[number]) => ReactNode) => (
    <div className="mt-2 space-y-1.5">
      {projects.slice(0, 4).map((project) => (
        <div key={project.id} className="flex items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-xs">
          <span className="min-w-0 truncate font-medium">{project.cliente ?? project.descricao ?? "Projeto"}</span>
          <span className="shrink-0 text-muted-foreground">{label(project)}</span>
        </div>
      ))}
      {projects.length > 4 && <p className="px-1 text-xs text-muted-foreground">+ {projects.length - 4} outro(s)</p>}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🔴 Precisam de atenção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.attentionModules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum módulo precisa de atenção no momento.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {summary.attentionModules.length} módulo(s) com pendência. Os submódulos são usados como base dos alertas, mas não aparecem nesta lista.
                  </p>
                  <div className="space-y-2">
                    {Array.from(summary.projectAttentionById.entries()).slice(0, 8).map(([projectId, items]) => {
                      const project = summary.projects.find((p) => p.id === projectId);
                      if (!project) return null;
                      return (
                        <div key={projectId} className="rounded-[10px] border p-3">
                          <p className="text-sm font-semibold">{project.cliente ?? project.descricao ?? "Projeto"}</p>
                          <div className="mt-2 space-y-1">
                            {items.slice(0, 6).map((item) => (
                              <a
                                key={item.moduleId}
                                href={"/projeto/" + item.projectId + "/modulos#module-" + item.moduleId}
                                className="flex items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-xs transition hover:bg-muted/50"
                              >
                                <span className="min-w-0 truncate font-medium">{item.moduleName}</span>
                                <span className={item.severity === "critical" ? "shrink-0 text-destructive" : "shrink-0 text-amber-600 dark:text-amber-300"}>
                                  {item.reasons.join(" · ")}
                                </span>
                              </a>
                            ))}
                            {items.length > 6 ? <p className="px-1 text-xs text-muted-foreground">+ {items.length - 6} módulo(s) neste projeto</p> : null}
                          </div>
                        </div>
                      );
                    })}
                    {summary.projectAttentionById.size > 8 ? <p className="text-xs text-muted-foreground">+ {summary.projectAttentionById.size - 8} projeto(s) com módulos em atenção.</p> : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
