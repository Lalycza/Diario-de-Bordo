import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatTime } from "@/lib/status";
import { PONDERACOES } from "@/lib/template";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/lib/useProject";

export const Route = createFileRoute("/_authenticated/projeto/$projectId/diario")({
  head: () => ({
    meta: [
      { title: "Diário de bordo" },
      {
        name: "description",
        content:
          "Registros das sessões de treinamento: pauta, participantes, tarefas e próximo encontro.",
      },
      { property: "og:title", content: "Diário de bordo" },
      {
        property: "og:description",
        content: "Histórico das reuniões e treinamentos do projeto de implantação.",
      },
    ],
  }),
  component: DiarioPage,
});

type LogForm = {
  id?: string;
  data_reuniao: string;
  hora_reuniao: string;
  analista: string;
  participantes: string;
  pauta: string;
  tarefa_cliente: string;
  tarefa_hpro: string;
  proximo_treinamento: string;
  observacoes: string;
};

const emptyLog: LogForm = {
  data_reuniao: new Date().toISOString().slice(0, 10),
  hora_reuniao: "",
  analista: "",
  participantes: "",
  pauta: "",
  tarefa_cliente: "",
  tarefa_hpro: "",
  proximo_treinamento: "",
  observacoes: "",
};

function DiarioPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const project = useProject(projectId);
  const [form, setForm] = useState<LogForm | null>(null);
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const logsQuery = useQuery({
    queryKey: ["logs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("log_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("data_reuniao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["logs", projectId] });

  const saveLog = useMutation({
    mutationFn: async (values: LogForm) => {
      const payload = {
        data_reuniao: values.data_reuniao,
        hora_reuniao: values.hora_reuniao || null,
        analista: values.analista || null,
        participantes: values.participantes || null,
        pauta: values.pauta || null,
        tarefa_cliente: values.tarefa_cliente || null,
        tarefa_hpro: values.tarefa_hpro || null,
        proximo_treinamento: values.proximo_treinamento || null,
        observacoes: values.observacoes || null,
      };
      if (values.id) {
        const { error } = await supabase.from("log_entries").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("log_entries")
          .insert({ ...payload, project_id: projectId, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
      toast.success("Registro salvo.");
    },
    onError: () => toast.error("Não foi possível salvar o registro."),
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("log_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const logs = (logsQuery.data ?? []).filter((log) => {
    if (de && log.data_reuniao < de) return false;
    if (ate && log.data_reuniao > ate) return false;
    if (busca) {
      const haystack = [
        log.participantes,
        log.pauta,
        log.tarefa_cliente,
        log.tarefa_hpro,
        log.observacoes,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(busca.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <AppShell userLabel={user.email}>
      <ProjectHeader
        projectId={projectId}
        cliente={project.data?.cliente ?? "Projeto"}
        subtitle={project.data?.descricao}
      />

      <section className="mb-4 rounded-lg border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">Ponderações / orientações</h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {PONDERACOES.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {project.data?.analista ? (
          <p className="mt-3 text-xs">
            <span className="text-muted-foreground">Analista implantador:</span>{" "}
            <span className="font-medium">{project.data.analista}</span>
          </p>
        ) : null}
      </section>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Input
          placeholder="Buscar no conteúdo…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-64"
        />
        <div className="space-y-1">
          <Label htmlFor="de" className="text-xs text-muted-foreground">
            De
          </Label>
          <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ate" className="text-xs text-muted-foreground">
            Até
          </Label>
          <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() =>
              setForm({ ...emptyLog, analista: project.data?.analista ?? "" })
            }
          >
            <Plus className="size-4" /> Novo registro
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <article key={log.id} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarClock className="size-4 text-primary" />
                    {formatDate(log.data_reuniao)}
                    {log.hora_reuniao ? ` · ${formatTime(log.hora_reuniao)}` : ""}
                  </h2>
                  {log.participantes ? (
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {log.participantes}
                    </p>
                  ) : null}
                  {log.analista ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Analista implantador: {log.analista}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar registro"
                    onClick={() =>
                      setForm({
                        id: log.id,
                        data_reuniao: log.data_reuniao,
                        hora_reuniao: formatTime(log.hora_reuniao),
                        analista: log.analista ?? "",
                        participantes: log.participantes ?? "",
                        pauta: log.pauta ?? "",
                        tarefa_cliente: log.tarefa_cliente ?? "",
                        tarefa_hpro: log.tarefa_hpro ?? "",
                        proximo_treinamento: log.proximo_treinamento ?? "",
                        observacoes: log.observacoes ?? "",
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir registro"
                    onClick={() => deleteLog.mutate(log.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Pauta do dia" value={log.pauta} />
                <Field label="Observações / ocorrências" value={log.observacoes} />
                <Field label="Tarefa cliente" value={log.tarefa_cliente} />
                <Field label="Tarefa Hpro" value={log.tarefa_hpro} />
                <Field
                  label="Próximo treinamento"
                  value={log.proximo_treinamento ? formatDate(log.proximo_treinamento) : null}
                />
              </dl>
            </article>
          ))}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar registro" : "Novo registro"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveLog.mutate(form);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="data">Data da reunião</Label>
                  <Input
                    id="data"
                    type="date"
                    value={form.data_reuniao}
                    onChange={(e) => setForm({ ...form, data_reuniao: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hora">Horário</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={form.hora_reuniao}
                    onChange={(e) => setForm({ ...form, hora_reuniao: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="analista">Analista implantador</Label>
                <Input
                  id="analista"
                  value={form.analista}
                  onChange={(e) => setForm({ ...form, analista: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="participantes">Participantes</Label>
                <Input
                  id="participantes"
                  value={form.participantes}
                  onChange={(e) => setForm({ ...form, participantes: e.target.value })}
                  placeholder="Nomes separados por vírgula"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pauta">Pauta do dia</Label>
                <Textarea
                  id="pauta"
                  value={form.pauta}
                  onChange={(e) => setForm({ ...form, pauta: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tc">Tarefa cliente</Label>
                <Textarea
                  id="tc"
                  value={form.tarefa_cliente}
                  onChange={(e) => setForm({ ...form, tarefa_cliente: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="th">Tarefa Hpro</Label>
                <Textarea
                  id="th"
                  value={form.tarefa_hpro}
                  onChange={(e) => setForm({ ...form, tarefa_hpro: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt">Próximo treinamento</Label>
                <Input
                  id="pt"
                  type="date"
                  value={form.proximo_treinamento}
                  onChange={(e) => setForm({ ...form, proximo_treinamento: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obs">Observações / ocorrências</Label>
                <Textarea
                  id="obs"
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveLog.isPending}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm">{value}</dd>
    </div>
  );
}
