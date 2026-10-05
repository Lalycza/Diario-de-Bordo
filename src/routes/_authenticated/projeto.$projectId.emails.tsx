import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { DocumentationSendCard } from "@/components/DocumentationSendCard";
import { useProject } from "@/lib/useProject";
import { formatDate } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/projeto/$projectId/emails")({
  head: () => ({ meta: [{ title: "E-mails do projeto" }] }),
  component: ProjectEmailsPage,
});

function ProjectEmailsPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const project = useProject(projectId);
  const query = useQuery({
    queryKey: ["project-emails", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_emails").select("id,sent_at,recipients,subject,body,attachment_names,document_types,status,provider_message_id,error_message").eq("project_id", projectId).order("sent_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = query.data ?? [];
  return <AppShell userLabel={user.email}>
    <ProjectHeader projectId={projectId} cliente={project.data?.cliente ?? "Projeto"} subtitle={project.data?.descricao} />
    <DocumentationSendCard projectId={projectId} />
    <div className="mb-4 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Mail className="size-4 text-primary" /> Histórico de e-mails</h2>
      <p className="mt-1 text-xs text-muted-foreground">Todos os envios feitos pela central de documentação ficam registrados aqui.</p>
    </div>
    {rows.length === 0 ? <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum e-mail enviado neste projeto.</div> :
      <div className="space-y-3">{rows.map((row) => <article key={row.id} className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">{formatDate(row.sent_at)}</p><h3 className="mt-1 text-sm font-semibold">{row.subject ?? "Sem assunto"}</h3><p className="mt-1 text-xs text-muted-foreground">Para: {row.recipients ?? "—"}</p></div>
          <span className={row.status === "enviado" ? "rounded-full bg-success/15 px-2 py-1 text-xs text-success" : "rounded-full bg-danger/15 px-2 py-1 text-xs text-danger"}>{row.status ?? "—"}</span>
        </div>
        {row.body ? <p className="mt-4 whitespace-pre-wrap text-sm">{row.body}</p> : null}
        {row.attachment_names ? <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Paperclip className="size-3.5" /> {row.attachment_names}</p> : null}
        {row.error_message ? <p className="mt-2 text-xs text-danger">{row.error_message}</p> : null}
      </article>)}</div>}
  </AppShell>;
}
