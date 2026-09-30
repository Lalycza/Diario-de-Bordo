import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Pencil, Plus, Trash2, History, Paperclip, Download, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/lib/useProject";
import { useRole } from "@/lib/useRole";

export const Route = createFileRoute("/_authenticated/projeto/$projectId/demandas")({
  component: DemandasPage,
});

const STATUSES = [
  ["pendente", "Pendente"],
  ["em_andamento", "Em andamento"],
  ["finalizado", "Finalizado"],
] as const;

type DemandForm = {
  id?: string;
  os_number: string;
  scope: string;
  status: string;
  priority: string;
  responsible_person: string;
  sector: string;
  delivery_deadline: string;
  scope_raised_by: string;
  scope_raised_at: string;
  scope_approved_by: string;
  scope_approved_at: string;
  commercial_proposal_sent_by: string;
  commercial_proposal_sent_at: string;
  commercial_proposal_approved_by: string;
  commercial_proposal_approved_at: string;
  development_evaluated_by: string;
  development_evaluated_at: string;
  development_estimated_time: string;
  notes: string;
};

const emptyForm: DemandForm = {
  os_number: "", scope: "", status: "pendente", priority: "media", responsible_person: "", sector: "", delivery_deadline: "",
  scope_raised_by: "", scope_raised_at: "", scope_approved_by: "", scope_approved_at: "",
  commercial_proposal_sent_by: "", commercial_proposal_sent_at: "",
  commercial_proposal_approved_by: "", commercial_proposal_approved_at: "",
  development_evaluated_by: "", development_evaluated_at: "",
  development_estimated_time: "", notes: "",
};

function DemandasPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const project = useProject(projectId);
  const { isAdmin, isSupervisor, isAnalista, isConsultationOnly } = useRole();
  const canEdit = isAdmin || isSupervisor || isAnalista;
  const qc = useQueryClient();
  const [form, setForm] = useState<DemandForm | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [attachmentsId, setAttachmentsId] = useState<string | null>(null);

  const demandsQuery = useQuery({
    queryKey: ["demands", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("demands").select("*").eq("project_id", projectId).order("delivery_deadline", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const attachmentsQuery = useQuery({
    queryKey: ["demand-attachments", attachmentsId], enabled: Boolean(attachmentsId),
    queryFn: async () => { const { data, error } = await supabase.from("demand_attachments").select("*").eq("demand_id", attachmentsId!).order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const historyQuery = useQuery({
    queryKey: ["demand-history", historyId],
    enabled: Boolean(historyId),
    queryFn: async () => {
      const { data, error } = await supabase.from("demand_history").select("*").eq("demand_id", historyId!).order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (v: DemandForm) => {
      const payload = {
        os_number: v.os_number || null, scope: v.scope, status: v.status, priority: v.priority,
        responsible_person: v.responsible_person || null, sector: v.sector || null,
        delivery_deadline: v.delivery_deadline || null,
        scope_raised_by: v.scope_raised_by || null, scope_raised_at: v.scope_raised_at || null,
        scope_approved_by: v.scope_approved_by || null, scope_approved_at: v.scope_approved_at || null,
        commercial_proposal_sent_by: v.commercial_proposal_sent_by || null, commercial_proposal_sent_at: v.commercial_proposal_sent_at || null,
        commercial_proposal_approved_by: v.commercial_proposal_approved_by || null, commercial_proposal_approved_at: v.commercial_proposal_approved_at || null,
        development_evaluated_by: v.development_evaluated_by || null, development_evaluated_at: v.development_evaluated_at || null,
        development_estimated_time: v.development_estimated_time || null, notes: v.notes || null,
      };
      if (v.id) {
        const { error } = await supabase.from("demands").update(payload).eq("id", v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("demands").insert({ ...payload, project_id: projectId, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["demands", projectId] }); setForm(null); toast.success("Demanda salva."); },
    onError: () => toast.error("Não foi possível salvar a demanda."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demands", projectId] }),
    onError: () => toast.error("Não foi possível excluir a demanda."),
  });

  const demands = demandsQuery.data ?? [];
  const [statusFilter, setStatusFilter] = useState("todos");
  const [priorityFilter, setPriorityFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const filteredDemands = useMemo(() => demands.filter((d: any) => {
    const matchesStatus = statusFilter === "todos" || d.status === statusFilter;
    const matchesPriority = priorityFilter === "todos" || d.priority === priorityFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [d.os_number, d.scope, d.responsible_person, d.sector].some((v) => String(v ?? "").toLowerCase().includes(term));
    return matchesStatus && matchesPriority && matchesSearch;
  }), [demands, statusFilter, priorityFilter, search]);
  const statusLabel = (s: string) => STATUSES.find(([key]) => key === s)?.[1] ?? s;
  const formFrom = (d: any): DemandForm => ({
    id: d.id, os_number: d.os_number ?? "", scope: d.scope ?? "", status: d.status ?? "pendente", priority: d.priority ?? "media", responsible_person: d.responsible_person ?? "", sector: d.sector ?? "",
    delivery_deadline: d.delivery_deadline ?? "", scope_raised_by: d.scope_raised_by ?? "", scope_raised_at: d.scope_raised_at ?? "",
    scope_approved_by: d.scope_approved_by ?? "", scope_approved_at: d.scope_approved_at ?? "",
    commercial_proposal_sent_by: d.commercial_proposal_sent_by ?? "", commercial_proposal_sent_at: d.commercial_proposal_sent_at ?? "",
    commercial_proposal_approved_by: d.commercial_proposal_approved_by ?? "", commercial_proposal_approved_at: d.commercial_proposal_approved_at ?? "",
    development_evaluated_by: d.development_evaluated_by ?? "", development_evaluated_at: d.development_evaluated_at ?? "",
    development_estimated_time: d.development_estimated_time ?? "", notes: d.notes ?? "",
  });

  return (
    <AppShell userLabel={user.email}>
      <ProjectHeader projectId={projectId} cliente={project.data?.cliente ?? "Projeto"} subtitle={project.data?.descricao} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-lg font-semibold">Demandas</h2>
          <p className="text-sm text-muted-foreground">Acompanhamento das solicitações e de cada etapa de aprovação, proposta e desenvolvimento.</p>
        </div>
        {canEdit ? <Button className="ml-auto" onClick={() => setForm({ ...emptyForm })}><Plus className="size-4" /> Nova demanda</Button> : null}
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <div className="min-w-[220px] flex-1"><Label>Buscar</Label><Input className="mt-1" placeholder="OS, escopo, responsável ou setor" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-[180px]"><Label>Status</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{STATUSES.map(([k,l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="w-[180px]"><Label>Prioridade</Label><Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent></Select></div>
        <div className="pb-0 text-xs text-muted-foreground">{filteredDemands.length} de {demands.length} demanda(s)</div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-3">OS</th><th className="px-3 py-3">Escopo</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Prioridade</th><th className="px-3 py-3">Em posse de</th><th className="px-3 py-3">Setor</th><th className="px-3 py-3">Prazo</th><th className="px-3 py-3">Escopo levantado</th><th className="px-3 py-3">Escopo aprovado</th><th className="px-3 py-3">Proposta</th><th className="px-3 py-3">Desenvolvimento</th><th className="px-3 py-3">Anexos</th><th className="px-3 py-3">Ações</th></tr>
          </thead>
          <tbody>
            {filteredDemands.length === 0 ? <tr><td colSpan={13} className="px-4 py-10 text-center text-muted-foreground">{demands.length === 0 ? "Nenhuma demanda cadastrada." : "Nenhuma demanda encontrada com os filtros atuais."}</td></tr> : filteredDemands.map((d: any) => (
              <tr key={d.id} className="border-t align-top">
                <td className="px-3 py-3 font-medium">{d.os_number ?? "—"}</td>
                <td className="px-3 py-3 max-w-[280px]">{d.scope}</td>
                <td className="px-3 py-3"><Badge className={d.status==="pendente"?"bg-amber-100 text-amber-800 border-amber-200":d.status==="em_andamento"?"bg-sky-100 text-sky-800 border-sky-200":"bg-emerald-100 text-emerald-800 border-emerald-200"}>{statusLabel(d.status)}</Badge></td>
                <td className="px-3 py-3"><Badge className={d.priority==="alta"?"bg-rose-100 text-rose-800 border-rose-200":d.priority==="baixa"?"bg-violet-100 text-violet-800 border-violet-200":"bg-amber-100 text-amber-800 border-amber-200"}>{d.priority==="alta"?"Alta":d.priority==="baixa"?"Baixa":"Média"}</Badge></td>
                <td className="px-3 py-3">{d.responsible_person ?? "—"}</td><td className="px-3 py-3">{d.sector ?? "—"}</td>
                <td className="px-3 py-3">{d.delivery_deadline ?? "—"}</td>
                <td className="px-3 py-3">{d.scope_raised_by ?? "—"}<div className="text-xs text-muted-foreground">{d.scope_raised_at ?? ""}</div></td>
                <td className="px-3 py-3">{d.scope_approved_by ?? "—"}<div className="text-xs text-muted-foreground">{d.scope_approved_at ?? ""}</div></td>
                <td className="px-3 py-3">{d.commercial_proposal_sent_by ?? "—"}<div className="text-xs text-muted-foreground">{d.commercial_proposal_sent_at ?? ""}</div><div className="mt-1">{d.commercial_proposal_approved_by ?? "—"}<span className="text-xs text-muted-foreground"> {d.commercial_proposal_approved_at ?? ""}</span></div></td>
                <td className="px-3 py-3">{d.development_evaluated_by ?? "—"}<div className="text-xs text-muted-foreground">{d.development_evaluated_at ?? ""}</div><div className="mt-1 text-xs">Tempo: {d.development_estimated_time ?? "—"}</div></td>
                <td className="px-3 py-3"><Button variant="outline" size="sm" onClick={() => setAttachmentsId(d.id)}><Paperclip className="mr-1 size-4"/>Anexos</Button></td>
                <td className="px-3 py-3"><div className="flex gap-1">{canEdit ? <><Button variant="ghost" size="icon" onClick={() => setForm(formFrom(d))}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove.mutate(d.id)}><Trash2 className="size-4" /></Button></> : null}<Button variant="ghost" size="icon" title="Histórico" onClick={() => setHistoryId(d.id)}><History className="size-4" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Editar demanda" : "Nova demanda"}</DialogTitle></DialogHeader>
          {form ? <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nº da OS"><Input value={form.os_number} onChange={e => setForm({...form, os_number:e.target.value})}/></Field>
            <Field label="Em posse de quem"><Input value={form.responsible_person} onChange={e => setForm({...form,responsible_person:e.target.value})}/></Field>
            <Field label="Setor"><Input value={form.sector} onChange={e => setForm({...form,sector:e.target.value})}/></Field>
            <Field label="Prazo de entrega"><Input type="date" value={form.delivery_deadline} onChange={e => setForm({...form, delivery_deadline:e.target.value})}/></Field>
            <Field label="Prioridade"><Select value={form.priority} onValueChange={v => setForm({...form,priority:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent></Select></Field>
            <Field label="Status"><Select value={form.status} onValueChange={v => setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STATUSES.map(([k,l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field>
            <div className="sm:col-span-2"><Field label="Escopo"><Textarea value={form.scope} onChange={e => setForm({...form,scope:e.target.value})}/></Field></div>
            <Field label="Quem levantou o escopo"><Input value={form.scope_raised_by} onChange={e => setForm({...form,scope_raised_by:e.target.value})}/></Field>
            <Field label="Data do levantamento"><Input type="date" value={form.scope_raised_at} onChange={e => setForm({...form,scope_raised_at:e.target.value})}/></Field>
            <Field label="Quem aprovou o escopo"><Input value={form.scope_approved_by} onChange={e => setForm({...form,scope_approved_by:e.target.value})}/></Field>
            <Field label="Data da aprovação do escopo"><Input type="date" value={form.scope_approved_at} onChange={e => setForm({...form,scope_approved_at:e.target.value})}/></Field>
            <Field label="Quem enviou a proposta comercial"><Input value={form.commercial_proposal_sent_by} onChange={e => setForm({...form,commercial_proposal_sent_by:e.target.value})}/></Field>
            <Field label="Data do envio da proposta"><Input type="date" value={form.commercial_proposal_sent_at} onChange={e => setForm({...form,commercial_proposal_sent_at:e.target.value})}/></Field>
            <Field label="Quem aprovou a proposta comercial"><Input value={form.commercial_proposal_approved_by} onChange={e => setForm({...form,commercial_proposal_approved_by:e.target.value})}/></Field>
            <Field label="Data da aprovação da proposta"><Input type="date" value={form.commercial_proposal_approved_at} onChange={e => setForm({...form,commercial_proposal_approved_at:e.target.value})}/></Field>
            <Field label="Quem do Desenvolvimento avaliou"><Input value={form.development_evaluated_by} onChange={e => setForm({...form,development_evaluated_by:e.target.value})}/></Field>
            <Field label="Data da avaliação do Desenvolvimento"><Input type="date" value={form.development_evaluated_at} onChange={e => setForm({...form,development_evaluated_at:e.target.value})}/></Field>
            <Field label="Tempo estimado pelo Desenvolvimento"><Input value={form.development_estimated_time} onChange={e => setForm({...form,development_estimated_time:e.target.value})}/></Field>
            <div className="sm:col-span-2"><Field label="Observações"><Textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}/></Field></div>
          </div> : null}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button disabled={save.isPending || !form?.scope.trim()} onClick={() => form && save.mutate(form)}>Salvar demanda</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyId)} onOpenChange={(open) => !open && setHistoryId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Histórico da demanda</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {(historyQuery.data ?? []).map((h: any) => <div key={h.id} className="rounded border p-3 text-sm"><div className="font-medium">{statusLabel(h.status ?? "")}</div><div className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString("pt-BR")}</div></div>)}
          </div>
        </DialogContent>
      </Dialog>

<Dialog open={Boolean(attachmentsId)} onOpenChange={(open) => !open && setAttachmentsId(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Escopos e anexos</DialogTitle></DialogHeader>
          {attachmentsId ? <div className="space-y-4">
            {canEdit ? <div className="rounded-lg border border-dashed p-4"><Label>Anexar escopo elaborado</Label><Input type="file" className="mt-2" onChange={async e => { const file=e.target.files?.[0]; if(!file)return; const path=attachmentsId+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const up=await supabase.storage.from("demand-attachments").upload(path,file); if(up.error){toast.error("Não foi possível anexar o arquivo.");return;} const ins=await supabase.from("demand_attachments").insert({demand_id:attachmentsId,file_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size,created_by:user.id}); if(ins.error){await supabase.storage.from("demand-attachments").remove([path]);toast.error("Não foi possível registrar o anexo.");return;} qc.invalidateQueries({queryKey:["demand-attachments",attachmentsId]}); e.currentTarget.value=""; toast.success("Anexo adicionado."); }}/></div> : null}
            <div className="space-y-2">{(attachmentsQuery.data??[]).length===0 ? <p className="text-sm text-muted-foreground">Nenhum anexo.</p> : (attachmentsQuery.data??[]).map((a:any)=><div key={a.id} className="flex items-center justify-between rounded border p-3"><span className="truncate font-medium">{a.file_name}</span><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={async()=>{const r=await supabase.storage.from("demand-attachments").createSignedUrl(a.storage_path,300);if(r.data?.signedUrl)window.open(r.data.signedUrl,"_blank");}}><Download className="size-4"/></Button>{canEdit?<Button variant="ghost" size="icon" onClick={async()=>{await supabase.storage.from("demand-attachments").remove([a.storage_path]);await supabase.from("demand_attachments").delete().eq("id",a.id);qc.invalidateQueries({queryKey:["demand-attachments",attachmentsId]});}}><X className="size-4"/></Button>:null}</div></div>)}</div>
          </div> : null}</DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-1">{children}</div></div>;
}
