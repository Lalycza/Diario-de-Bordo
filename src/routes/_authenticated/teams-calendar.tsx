import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, CircleAlert, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/teams-calendar")({
  head: () => ({
    meta: [
      { title: "Microsoft 365 — Agenda IMPLANTA" },
      { name: "description", content: "Configuração da integração individual com o calendário Microsoft 365." },
    ],
  }),
  component: TeamsCalendarPage,
});

function TeamsCalendarPage() {
  const { isAdmin, isSupervisor, isAnalista, isLoading } = useRole();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Verificando permissões…</div>;
  if (!(isAdmin || isSupervisor || isAnalista)) {
    return <div className="p-6 text-sm text-muted-foreground">Você não tem permissão para acessar esta configuração.</div>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <header className="flex items-start gap-4">
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sky-500">
          <CalendarDays className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Microsoft 365 Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Integração individual do calendário corporativo com a Agenda do Diário de Bordo.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 border-amber-500/40 text-amber-600">Preview</Badge>
      </header>

      <Card className="border-sky-500/25">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-sky-500" />
            <CardTitle>Conexão protegida por usuário</CardTitle>
          </div>
          <CardDescription>
            Cada analista conectará sua própria conta Microsoft 365. A integração foi projetada para importar eventos sem editar nem excluir compromissos no Outlook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium">Backend de testes preparado</p>
              <p className="text-sm text-muted-foreground">Tabelas isoladas, acesso por usuário e função de OAuth/sincronização publicados somente no projeto Supabase de testes.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium">Aguardando configuração do TI</p>
              <p className="text-sm text-muted-foreground">O registro do aplicativo no Microsoft Entra ID, o consentimento e os secrets do ambiente de testes ainda precisam ser configurados antes de habilitar a conexão.</p>
            </div>
          </div>
          <Button type="button" disabled className="w-full sm:w-auto">
            <LockKeyhole className="mr-2 size-4" />
            Conectar Microsoft 365 — aguardando configuração
          </Button>
          <p className="text-xs text-muted-foreground">
            A conexão permanece desabilitada até a validação do ambiente de autenticação de preview. Nenhuma conta Microsoft é conectada nesta etapa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Escopo aprovado para o piloto</CardTitle>
          <CardDescription>Permissões mínimas e separação dos calendários pessoais.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Microsoft Graph com permissões delegadas de leitura: Calendars.Read e User.Read.</li>
            <li>O token de renovação é criptografado no servidor e não é retornado ao navegador.</li>
            <li>Eventos importados ficam separados dos compromissos manuais e dos agendamentos do Cronograma.</li>
            <li>Um usuário autenticado só poderá consultar os eventos associados ao próprio usuário do Diário.</li>
            <li>Não há escrita de eventos no Outlook nem sincronização bidirecional nesta primeira fase.</li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
