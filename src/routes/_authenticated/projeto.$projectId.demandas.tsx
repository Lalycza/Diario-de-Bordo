import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { History, Paperclip, Download, X, Plus, Trash2, FileText } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/projeto/$projectId/demandas")({ component: DemandasPage });

const STATUSES = [
  ["pendente", "Pendente"],
  ["em_andamento", "Em andamento"],
  ["finalizado", "Finalizado"],
] as const;

const PRIORITIES = [
  ["alta", "Alta"],
  ["media", "Média"],
  ["baixa", "Baixa"],
] as const;

const EVENTS = [
  ["alignment", "Alinhamento / levantamento"],
  ["development", "Avaliação do Desenvolvimento"],
  ["commercial_proposal", "Proposta comercial"],
  ["client_approval", "Aprovação do cliente"],
  ["status_update", "Alteração de status"],
  ["note", "Nova observação"],
  ["correction", "Correção / complemento"],
] as const;

type Demand = Record<string, any> & { id: string };
type EventForm = {
  occurred: string;
  details: string;
  participants: string;
  responsible: string;
  estimated: string;
  delivery: string;
  commercial: string;
  approver: string;
  status: string;
};

function today() { return new Date().toISOString().slice(0, 10); }
function label(list: readonly (readonly [string, string])[], value: string) { return list.find(([k]) => k === value)?.[1] ?? value; }
function fmtDate(value: string | null | undefined) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "—"; }
function fmtDateTime(value: string | null | undefined) { return value ? new Date(value).toLocaleString("pt-BR") : "—"; }

const emptyEvent: EventForm = { occurred: today(), details: "", participants: "", responsible: "", estimated: "", delivery: "", commercial: "", approver: "", status: "pendente" };

function DemandasPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const project = useProject(projectId);
  const { isAdmin, isSupervisor, isAnalista, isConsultationOnly } = useRole();
  const canEdit = isAdmin || isSupervisor || isAnalista;
  const canDelete = isAdmin;
  const qc = useQueryClient();
  const [form, setForm] = useState<any | null>(null);
  const [eventTarget, setEventTarget] = useState<{ id: string; type: string } | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>({ ...emptyEvent });
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [attachmentsId, setAttachmentsId] = useState<string | null>(null);

  const demandsQuery = useQuery({
    queryKey: ["demands", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("demands").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Demand[];
    },
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

  const attachmentsQuery = useQuery({
    queryKey: ["demand-attachments", attachmentsId],
    enabled: Boolean(attachmentsId),
    queryFn: async () => {
      const { data, error } = await supabase.from("demand_attachments").select("*").eq("demand_id", attachmentsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const payload = {
        os_number: v.os_number || null, scope: v.scope, status: v.status, priority: v.priority,
        responsible_person: v.responsible_person || null, sector: v.sector || null, delivery_deadline: v.delivery_deadline || null,
        scope_raised_by: v.scope_raised_by || null, scope_raised_at: v.scope_raised_at || null,
        scope_approved_by: v.scope_approved_by || null, scope_approved_at: v.scope_approved_at || null,
        commercial_proposal_sent_by: v.commercial_proposal_sent_by || null, commercial_proposal_sent_at: v.commercial_proposal_sent_at || null,
        commercial_proposal_approved_by: v.commercial_proposal_approved_by || null, commercial_proposal_approved_at: v.commercial_proposal_approved_at || null,
        development_evaluated_by: v.development_evaluated_by || null, development_evaluated_at: v.development_evaluated_at || null,
        development_estimated_time: v.development_estimated_time || null, notes: v.notes || null,
      };
      if (v.id) {
        const { data: current } = await supabase.from("demands").select("*").eq("id", v.id).maybeSingle();
        const { error } = await supabase.from("demands").update(payload).eq("id", v.id);
        if (error) throw error;
        await supabase.from("demand_history").insert({ demand_id: v.id, changed_by: user.id, status: v.status, snapshot: { ...(current ?? {}), ...payload, _event_type: "edit", _details: "Demanda editada" } });
      } else {
        const { data, error } = await supabase.from("demands").insert({ ...payload, project_id: projectId, created_by: user.id }).select("id").single();
        if (error) throw error;
        await supabase.from("demand_history").insert({ demand_id: data.id, changed_by: user.id, status: v.status, snapshot: { ...payload, _event_type: "created", _details: "Demanda criada" } });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["demands", projectId] }); qc.invalidateQueries({ queryKey: ["demand-history"] }); setForm(null); toast.success("Demanda salva."); },
    onError: (e: any) => toast.error(e.message || "Não foi possível salvar a demanda."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["demands", projectId] }); toast.success("Demanda excluída."); },
    onError: (e: any) => toast.error(e.message || "Não foi possível excluir a demanda."),
  });

  const addEvent = useMutation({
    mutationFn: async ({ demand, type, values }: { demand: Demand; type: string; values: EventForm }) => {
      const next: Record<string, any> = {};
      if (type === "alignment") {
        next.scope_raised_at = values.occurred || today();
        next.scope_raised_by = values.participants || user.email;
        next.notes = [demand.notes, values.details ? `Alinhamento: ${values.details}` : null, values.participants ? `Participantes: ${values.participants}` : null].filter(Boolean).join("\n");
      } else if (type === "development") {
        next.development_evaluated_at = values.occurred || today();
        next.development_evaluated_by = values.responsible || null;
        next.development_estimated_time = values.estimated || null;
        next.delivery_deadline = values.delivery || demand.delivery_deadline || null;
      } else if (type === "commercial_proposal") {
        next.commercial_proposal_sent_by = values.commercial || null;
        next.commercial_proposal_sent_at = values.occurred || today();
      } else if (type === "client_approval") {
        next.commercial_proposal_approved_by = values.approver || null;
        next.commercial_proposal_approved_at = values.occurred || today();
      } else if (type === "status_update") {
        next.status = values.status;
      } else {
        next.notes = [demand.notes, values.details].filter(Boolean).join("\n");
      }

      const { error } = await supabase.from("demands").update(next).eq("id", demand.id);
      if (error) throw error;

      const { error: historyError } = await supabase.from("demand_history").insert({
        demand_id: demand.id,
        changed_by: user.id,
        status: next.status ?? demand.status,
        snapshot: {
          ...demand,
          ...next,
          _event_type: type,
          _event_label: label(EVENTS, type),
          _details: values.details || null,
          _participants: values.participants || null,
          _actor_name: user.email,
          _occurred_on: values.occurred || today(),
        },
      });
      if (historyError) throw historyError;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["demands", projectId] }); qc.invalidateQueries({ queryKey: ["demand-history"] }); setEventTarget(null); setEventForm({ ...emptyEvent, occurred: today() }); toast.success("Inclusão registrada no histórico."); },
    onError: (e: any) => toast.error(e.message || "Não foi possível registrar a inclusão."),
  });

  const demands = demandsQuery.data ?? [];
  const selectedHistory = historyQuery.data ?? [];
  const historyRows = useMemo(() => selectedHistory.map((h: any) => {
    const s = h.snapshot ?? {};
    return { ...h, event: s._event_label || "Alteração", details: s._details || "", occurred: s._occurred_on || h.changed_at, actor: s._actor_name || "Usuário" };
  }), [selectedHistory]);

  function openNew() {
    setForm({
      os_number: "", scope: "", status: "pendente", priority: "media", responsible_person: "", sector: "", delivery_deadline: "",
      scope_raised_by: "", scope_raised_at: "", scope_approved_by: "", scope_approved_at: "",
      commercial_proposal_sent_by: "", commercial_proposal_sent_at: "", commercial_proposal_approved_by: "", commercial_proposal_approved_at: "",
      development_evaluated_by: "", development_evaluated_at: "", development_estimated_time: "", notes: "",
    });
  }

  function openEvent(demand: Demand, type: string) {
    setEventForm({ ...emptyEvent, status: demand.status ?? "pendente" });
    setEventTarget({ id: demand.id, type });
  }

  function printDemand(demand: Demand) {
    const rows = (selectedHistory.length && historyId === demand.id ? historyRows : []).map((h: any) => `<div style="border-bottom:1px solid #ddd;padding:8px 0"><b>${h.event}</b><br>${fmtDate(h.occurred)} · ${h.actor}<br>${h.details || ""}</div>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Relatório da demanda</title><style>body{font-family:Arial;padding:30px;color:#182236}h1{font-size:20px}p{line-height:1.5}.meta{color:#666;font-size:12px}</style></head><body><h1>Relatório da Demanda${demand.os_number ? " · OS " + demand.os_number : ""}</h1><p><b>Necessidade:</b> ${demand.scope}</p><p><b>Status:</b> ${label(STATUSES,demand.status)} · <b>Prioridade:</b> ${label(PRIORITIES,demand.priority)}</p><p><b>Prazo:</b> ${fmtDate(demand.delivery_deadline)} · <b>Responsável:</b> ${demand.responsible_person || "—"} · <b>Setor:</b> ${demand.sector || "—"}</p><h2>Linha do tempo</h2>${rows || "<p>Nenhum histórico carregado. Abra o histórico antes de imprimir para incluir os registros.</p>"}</body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <AppShell userLabel={user.email}>
      <ProjectHeader projectId={projectId} cliente={project.data?.cliente ?? "Projeto"} subtitle={project.data?.descricao} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div><h2 className="text-lg font-semibold">Demandas</h2><p className="text-sm text-muted-foreground">Toda inclusão permanece registrada na linha do tempo.</p></div>
        {canEdit ? <Button className="ml-auto" onClick={openNew}><Plus className="size-4" /> Nova demanda</Button> : null}
        <Button variant="outline" onClick={() => window.print()}><FileText className="size-4 mr-1" /> PDF do projeto</Button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {STATUSES.map(([key, text]) => <div key={key} className="rounded-lg border bg-card p-4"><div className="text-2xl font-semibold">{demands.filter((d) => d.status === key).length}</div><div className="text-xs text-muted-foreground">{text}</div></div>)}
      </div>

      <div className="space-y-4">
        {demands.length === 0 ? <div className="rounded-lg border bg-card px-4 py-10 text-center text-muted-foreground">Nenhuma demanda cadastrada para este projeto.</div> : demands.map((d) => (
          <div key={d.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><div className="font-semibold">{d.os_number ? `OS ${d.os_number} · ` : ""}{d.scope}</div><div className="mt-1 text-sm text-muted-foreground">Prazo atual: <b>{fmtDate(d.delivery_deadline)}</b>{d.responsible_person ? ` · Responsável: ${d.responsible_person}` : ""}{d.sector ? ` · Setor: ${d.sector}` : ""}</div></div>
              <div className="flex gap-2"><Badge className={d.status === "finalizado" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : d.status === "em_andamento" ? "bg-sky-100 text-sky-800 border-sky-200" : "bg-amber-100 text-amber-800 border-amber-200"}>{label(STATUSES,d.status)}</Badge><Badge className={d.priority === "alta" ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-muted"}>Prioridade {label(PRIORITIES,d.priority)}</Badge></div>
            </div>
            {d.notes ? <p className="mt-3 whitespace-pre-wrap text-sm">{d.notes}</p> : null}
            <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <div><b>Escopo levantado</b><br />{d.scope_raised_by || "—"} {d.scope_raised_at ? `· ${fmtDate(d.scope_raised_at)}` : ""}</div>
              <div><b>Escopo aprovado</b><br />{d.scope_approved_by || "—"} {d.scope_approved_at ? `· ${fmtDate(d.scope_approved_at)}` : ""}</div>
              <div><b>Proposta comercial</b><br />{d.commercial_proposal_sent_by || "—"} {d.commercial_proposal_sent_at ? `· ${fmtDate(d.commercial_proposal_sent_at)}` : ""}<br />Aprovada: {d.commercial_proposal_approved_by || "—"}</div>
              <div><b>Desenvolvimento</b><br />{d.development_evaluated_by || "—"} {d.development_evaluated_at ? `· ${fmtDate(d.development_evaluated_at)}` : ""}<br />Tempo: {d.development_estimated_time || "—"}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canEdit ? EVENTS.map(([type, text]) => <Button key={type} size="sm" variant="outline" onClick={() => openEvent(d,type)}><Plus className="mr-1 size-3" />{text}</Button>) : null}
              <Button size="sm" variant="outline" onClick={() => setHistoryId(d.id)}><History className="mr-1 size-4" /> Histórico completo</Button>
              <Button size="sm" variant="outline" onClick={() => setAttachmentsId(d.id)}><Paperclip className="mr-1 size-4" /> Anexos</Button>
              <Button size="sm" variant="outline" onClick={() => printDemand(d)}><FileText className="mr-1 size-4" /> PDF</Button>
              {canEdit ? <Button size="sm" variant="ghost" onClick={() => setForm({ ...d })}>Editar cadastro</Button> : null}
              {canDelete ? <Button size="sm" variant="destructive" onClick={() => { if (confirm("Excluir esta demanda e seu histórico?")) remove.mutate(d.id); }}><Trash2 className="mr-1 size-4" /> Excluir</Button> : null}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Editar demanda" : "Nova demanda"}</DialogTitle></DialogHeader>
          {form ? <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nº da OS"><Input value={form.os_number} onChange={e => setForm({...form,os_number:e.target.value})}/></Field>
            <Field label="Em posse de quem"><Input value={form.responsible_person} onChange={e => setForm({...form,responsible_person:e.target.value})}/></Field>
            <Field label="Setor"><Input value={form.sector} onChange={e => setForm({...form,sector:e.target.value})}/></Field>
            <Field label="Prazo de entrega"><Input type="date" value={form.delivery_deadline} onChange={e => setForm({...form,delivery_deadline:e.target.value})}/></Field>
            <Field label="Prioridade"><Select value={form.priority} onValueChange={v => setForm({...form,priority:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{PRIORITIES.map(([k,l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Status"><Select value={form.status} onValueChange={v => setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STATUSES.map(([k,l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field>
            <div className="sm:col-span-2"><Field label="Escopo / necessidade inicial"><Textarea value={form.scope} onChange={e => setForm({...form,scope:e.target.value})}/></Field></div>
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
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button disabled={save.isPending || !form?.scope?.trim()} onClick={() => form && save.mutate(form)}>Salvar demanda</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(eventTarget)} onOpenChange={(open) => !open && setEventTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nova inclusão · {eventTarget ? label(EVENTS,eventTarget.type) : ""}</DialogTitle></DialogHeader>
          {eventTarget ? <div className="space-y-4">
            <Field label="Data"><Input type="date" value={eventForm.occurred} onChange={e => setEventForm({...eventForm,occurred:e.target.value})}/></Field>
            {eventTarget.type === "alignment" ? <><Field label="O que foi alinhado"><Textarea value={eventForm.details} onChange={e => setEventForm({...eventForm,details:e.target.value})}/></Field><Field label="Participantes"><Input value={eventForm.participants} onChange={e => setEventForm({...eventForm,participants:e.target.value})}/></Field></> : null}
            {eventTarget.type === "development" ? <><Field label="Responsável do Desenvolvimento"><Input value={eventForm.responsible} onChange={e => setEventForm({...eventForm,responsible:e.target.value})}/></Field><Field label="Tempo estimado"><Input value={eventForm.estimated} onChange={e => setEventForm({...eventForm,estimated:e.target.value})}/></Field><Field label="Data prevista de entrega"><Input type="date" value={eventForm.delivery} onChange={e => setEventForm({...eventForm,delivery:e.target.value})}/></Field><Field label="Observações"><Textarea value={eventForm.details} onChange={e => setEventForm({...eventForm,details:e.target.value})}/></Field></> : null}
            {eventTarget.type === "commercial_proposal" ? <Field label="Responsável comercial"><Input value={eventForm.commercial} onChange={e => setEventForm({...eventForm,commercial:e.target.value})}/></Field> : null}
            {eventTarget.type === "client_approval" ? <><Field label="Quem aprovou pelo cliente"><Input value={eventForm.approver} onChange={e => setEventForm({...eventForm,approver:e.target.value})}/></Field><Field label="Observações"><Textarea value={eventForm.details} onChange={e => setEventForm({...eventForm,details:e.target.value})}/></Field></> : null}
            {eventTarget.type === "status_update" ? <Field label="Novo status"><Select value={eventForm.status} onValueChange={v => setEventForm({...eventForm,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STATUSES.map(([k,l])=><SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field> : null}
            {["note","correction"].includes(eventTarget.type) ? <Field label="Descrição"><Textarea rows={6} value={eventForm.details} onChange={e => setEventForm({...eventForm,details:e.target.value})}/></Field> : null}
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">Este registro será mantido no histórico. Para corrigir uma informação, faça uma nova inclusão.</div>
          </div> : null}
          <DialogFooter><Button variant="outline" onClick={() => setEventTarget(null)}>Cancelar</Button><Button disabled={addEvent.isPending} onClick={() => { const d=demands.find(x=>x.id===eventTarget?.id); if(d&&eventTarget)addEvent.mutate({demand:d,type:eventTarget.type,values:eventForm}); }}>Registrar inclusão</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyId)} onOpenChange={(open) => !open && setHistoryId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Histórico completo da demanda</DialogTitle></DialogHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto">
            {historyRows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p> : historyRows.map((h:any) => <div key={h.id} className="rounded-lg border p-3"><div className="font-medium">{h.event}</div><div className="text-xs text-muted-foreground">{fmtDate(h.occurred)} · registrado por {h.actor} · {fmtDateTime(h.changed_at)}</div>{h.details ? <div className="mt-2 whitespace-pre-wrap text-sm">{h.details}</div> : null}</div>)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(attachmentsId)} onOpenChange={(open) => !open && setAttachmentsId(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Anexos da demanda</DialogTitle></DialogHeader>
          {attachmentsId ? <div className="space-y-4">
            {canEdit ? <div className="rounded-lg border border-dashed p-4"><Label>Anexar escopo / documento</Label><Input type="file" className="mt-2" onChange={async e => { const file=e.target.files?.[0]; if(!file)return; const path=attachmentsId+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const up=await supabase.storage.from("demand-attachments").upload(path,file); if(up.error){toast.error("Não foi possível anexar o arquivo.");return;} const ins=await supabase.from("demand_attachments").insert({demand_id:attachmentsId,file_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size,created_by:user.id}); if(ins.error){await supabase.storage.from("demand-attachments").remove([path]);toast.error("Não foi possível registrar o anexo.");return;} qc.invalidateQueries({queryKey:["demand-attachments",attachmentsId]}); e.currentTarget.value=""; toast.success("Anexo adicionado."); }}/></div> : null}
            <div className="space-y-2">{(attachmentsQuery.data??[]).length===0 ? <p className="text-sm text-muted-foreground">Nenhum anexo.</p> : (attachmentsQuery.data??[]).map((a:any)=><div key={a.id} className="flex items-center justify-between rounded border p-3"><span className="truncate font-medium">{a.file_name}</span><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={async()=>{const r=await supabase.storage.from("demand-attachments").createSignedUrl(a.storage_path,300);if(r.data?.signedUrl)window.open(r.data.signedUrl,"_blank");}}><Download className="size-4"/></Button>{canEdit?<Button variant="ghost" size="icon" onClick={async()=>{await supabase.storage.from("demand-attachments").remove([a.storage_path]);await supabase.from("demand_attachments").delete().eq("id",a.id);qc.invalidateQueries({queryKey:["demand-attachments",attachmentsId]});}}><X className="size-4"/></Button>:null}</div></div>)}</div>
          </div> : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-1">{children}</div></div>;
}
