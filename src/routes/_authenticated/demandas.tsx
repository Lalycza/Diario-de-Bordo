import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/demandas")({ component: DemandasPage });

function DemandasPage() {
  const { user } = Route.useRouteContext();
  const demandsQuery = useQuery({ queryKey: ["all-demands"], queryFn: async () => {
    const { data, error } = await supabase.from("demands").select("id, project_id, os_number, scope, status, priority, responsible_person, sector, delivery_deadline").order("delivery_deadline", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) throw error; return data ?? [];
  }});
  const projectsQuery = useQuery({ queryKey: ["demand-projects"], queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("id, cliente, name");
    if (error) throw error; return data ?? [];
  }});
  const projectName = new Map((projectsQuery.data ?? []).map((p) => [p.id, p.cliente || p.name || "Projeto"]));
  const statusLabel: Record<string,string> = { pendente:"Pendente", em_andamento:"Em andamento", finalizado:"Finalizado" };
  const priorityLabel: Record<string,string> = { alta:"Alta", media:"Média", baixa:"Baixa" };
  return <AppShell userLabel={user.email}>
    <div className="mb-6 flex items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Demandas</h1><p className="text-sm text-muted-foreground">Visão consolidada das demandas dos projetos aos quais você tem acesso.</p></div><ClipboardList className="size-6 text-primary" /></div>
    {demandsQuery.isLoading || projectsQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : demandsQuery.isError || projectsQuery.isError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível carregar as demandas.</div> : (demandsQuery.data ?? []).length === 0 ? <div className="rounded-lg border bg-card p-8 text-center"><p className="text-sm text-muted-foreground">Nenhuma demanda cadastrada.</p></div> :
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[900px] text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Projeto</th><th className="p-3">OS</th><th className="p-3">Escopo</th><th className="p-3">Status</th><th className="p-3">Prioridade</th><th className="p-3">Responsável</th><th className="p-3">Prazo</th><th className="p-3"></th></tr></thead><tbody>
        {(demandsQuery.data ?? []).map((d) => <tr key={d.id} className="border-b last:border-0"><td className="p-3 font-medium">{projectName.get(d.project_id) ?? "Projeto"}</td><td className="p-3">{d.os_number ?? "—"}</td><td className="max-w-[320px] p-3">{d.scope}</td><td className="p-3"><Badge variant="outline">{statusLabel[d.status] ?? d.status}</Badge></td><td className="p-3">{priorityLabel[d.priority] ?? d.priority ?? "—"}</td><td className="p-3">{d.responsible_person ?? "—"}</td><td className="p-3">{d.delivery_deadline ? new Date(`\${d.delivery_deadline}T00:00:00`).toLocaleDateString("pt-BR") : "—"}</td><td className="p-3 text-right"><Button asChild size="sm" variant="outline"><Link to="/projeto/$projectId/demandas" params={{ projectId: d.project_id }}>Abrir</Link></Button></td></tr>)}
      </tbody></table></div>}
  </AppShell>;
}