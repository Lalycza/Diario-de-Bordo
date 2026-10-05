import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Mail, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/lib/useProject";

export type DocumentationType = "mapa" | "cronograma" | "diario";
const DOCS: Array<{ id: DocumentationType; label: string }> = [
  { id: "mapa", label: "Mapa de treinamentos" },
  { id: "cronograma", label: "Cronograma" },
  { id: "diario", label: "Diário de bordo" },
];

type Props = { projectId: string; compact?: boolean };

export function DocumentationSendCard({ projectId, compact = false }: Props) {
  const project = useProject(projectId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<DocumentationType[]>(DOCS.map((d) => d.id));
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const promptTimer = useRef<number | null>(null);
  const lastPromptAt = useRef(0);

  const statusQuery = useQuery({
    queryKey: ["documentation-status", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_documentation_status").select("document_type,version,updated_at,sent_at").eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const contactsQuery = useQuery({
    queryKey: ["project-client-contacts", project.data?.client_id],
    enabled: Boolean(project.data?.client_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("client_contacts").select("id,name,email,is_project_responsible").eq("client_id", project.data!.client_id!).not("email", "is", null).order("is_project_responsible", { ascending: false }).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const pending = useMemo(() => {
    const rows = statusQuery.data ?? [];
    return DOCS.filter((doc) => {
      const row = rows.find((x) => x.document_type === doc.id);
      return row && (!row.sent_at || new Date(row.sent_at) < new Date(row.updated_at));
    });
  }, [statusQuery.data]);

  const send = useMutation({
    mutationFn: async () => {
      if (!selectedDocs.length) throw new Error("Selecione pelo menos uma documentação.");
      if (!selectedContacts.length) throw new Error("Selecione pelo menos um contato do cliente.");
      const { data, error } = await supabase.functions.invoke("enviar-documentacao", {
        body: { projectId, documentTypes: selectedDocs, contactIds: selectedContacts, subject: subject.trim() || undefined, body: body.trim() || undefined },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || "Não foi possível enviar a documentação.");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentation-status", projectId] });
      qc.invalidateQueries({ queryKey: ["project-emails", projectId] });
      setOpen(false);
      toast.success("Documentação enviada e histórico registrado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Falha ao enviar."),
  });

  const openComposer = useCallback(() => {
    const contacts = contactsQuery.data ?? [];
    const defaults = contacts.filter((c) => c.is_project_responsible || contacts.length === 1).map((c) => c.id);
    setSelectedDocs(DOCS.map((d) => d.id));
    setSelectedContacts(defaults.length ? defaults : contacts.map((c) => c.id));
    setSubject(`Atualização da implantação — ${project.data?.cliente ?? "Projeto"}`);
    setBody("Olá!\n\nSegue a documentação atualizada da implantação para acompanhamento.\n\nAtenciosamente,\nEquipe HPro");
    setOpen(true);
  }, [project.data?.cliente, contactsQuery.data]);

  useEffect(() => {
    const onDocumentationUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (detail?.projectId !== projectId) return;
      const now = Date.now();
      if (now - lastPromptAt.current < 1000) return;
      lastPromptAt.current = now;
      if (promptTimer.current) window.clearTimeout(promptTimer.current);
      promptTimer.current = window.setTimeout(() => {
        openComposer();
        toast.info("Documentação atualizada. Selecione os documentos e envie ao cliente quando estiver pronto.");
      }, 150);
    };
    window.addEventListener("documentation:updated", onDocumentationUpdated);
    return () => {
      window.removeEventListener("documentation:updated", onDocumentationUpdated);
      if (promptTimer.current) window.clearTimeout(promptTimer.current);
    };
  }, [openComposer, projectId]);

  return <>
    <section className={`rounded-lg border ${pending.length ? "border-warning bg-warning/10" : "bg-card"} p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2"><Mail className="size-4 text-primary" /><div><h2 className="text-sm font-semibold">{pending.length ? "Documentação pendente de envio" : "Documentação para o cliente"}</h2><p className="text-xs text-muted-foreground">Após atualizar Mapa, Cronograma ou Diário, o sistema marca a documentação para envio.</p></div></div>
        <div className="ml-auto flex items-center gap-2">{pending.length ? <Badge variant="secondary">{pending.length} pendente{pending.length > 1 ? "s" : ""}</Badge> : <Badge variant="secondary"><CheckCircle2 className="mr-1 size-3" /> Atualizado</Badge>}<Button size={compact ? "sm" : "default"} onClick={openComposer}><Send className="size-4" /> Enviar documentação</Button></div>
      </div>
      {pending.length ? <div className="mt-3 flex flex-wrap gap-2">{pending.map((doc) => <Badge key={doc.id} variant="outline"><FileText className="mr-1 size-3" />{doc.label}</Badge>)}</div> : null}
    </section>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Enviar documentação ao cliente</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3"><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Documentações</p><div className="grid gap-2 sm:grid-cols-3">{DOCS.map((doc) => <label key={doc.id} className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm"><Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={(checked) => setSelectedDocs((current) => checked ? [...new Set([...current, doc.id])] : current.filter((id) => id !== doc.id))}/><span>{doc.label}</span></label>)}</div></div>
          <div className="space-y-2"><Label>Contatos do cliente</Label>{contactsQuery.isLoading ? <p className="text-xs text-muted-foreground">Carregando contatos…</p> : null}{(contactsQuery.data ?? []).length === 0 ? <div className="rounded-md border border-warning p-3 text-sm">Nenhum contato com e-mail foi cadastrado para este cliente.</div> : <div className="grid gap-2 sm:grid-cols-2">{(contactsQuery.data ?? []).map((contact) => <label key={contact.id} className="flex items-center gap-2 rounded-md border p-3 text-sm"><Checkbox checked={selectedContacts.includes(contact.id)} onCheckedChange={(checked) => setSelectedContacts((current) => checked ? [...new Set([...current, contact.id])] : current.filter((id) => id !== contact.id))}/><span><span className="font-medium">{contact.name}</span>{contact.is_project_responsible ? <Badge className="ml-2" variant="secondary">Responsável</Badge> : null}<span className="block text-xs text-muted-foreground">{contact.email}</span></span></label>)}</div>}</div>
          <div className="space-y-1.5"><Label>Assunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Texto do e-mail</Label><Textarea className="min-h-40" value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Os três documentos são selecionados automaticamente. Você pode retirar qualquer um antes do envio.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => send.mutate()} disabled={send.isPending || !selectedContacts.length || !selectedDocs.length}>{send.isPending ? <><RefreshCw className="size-4 animate-spin" /> Enviando…</> : <><Send className="size-4" /> Enviar agora</>}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
