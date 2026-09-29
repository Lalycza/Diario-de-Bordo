import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  MODULOS,
  STAGE_STATUS,
  STAGE_STATUS_KEYS,
  currentWeekRange,
  effectiveStageStatus,
  formatDate,
  isToday,
  todayISO,
} from "@/lib/status";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { GradeSemanas } from "@/components/GradeSemanas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/lib/useProject";

export const Route = createFileRoute("/_authenticated/projeto/$projectId/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma do projeto" },
      {
        name: "description",
        content: "Etapas da implantação por módulo, com pauta da semana, prazos e status.",
      },
      { property: "og:title", content: "Cronograma do projeto" },
      {
        property: "og:description",
        content: "Acompanhe visualmente etapas, replanejamentos e homologações do projeto.",
      },
    ],
  }),
  component: CronogramaPage,
});

type StageForm = {
  id?: string;
  nome: string;
  modulo: string;
  descricao: string;
  responsavel: string;
  data_inicio: string;
  data_prevista: string;
  data_conclusao: string;
  status: string;
  pauta_semana: boolean;
};

const SEM_MODULO = "sem_modulo";

const emptyStage: StageForm = {
  nome: "",
  modulo: SEM_MODULO,
  descricao: "",
  responsavel: "",
  data_inicio: "",
  data_prevista: "",
  data_conclusao: "",
  status: "nao_iniciada",
  pauta_semana: false,
};

function CronogramaPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const project = useProject(projectId);
  const [form, setForm] = useState<StageForm | null>(null);
  const [moduloFiltro, setModuloFiltro] = useState("todos");
  const semana = currentWeekRange();

  const stagesQuery = useQuery({
    queryKey: ["stages", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", projectId)
        .order("data_prevista", { ascending: true, nullsFirst: false })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stages", projectId] });
    queryClient.invalidateQueries({ queryKey: ["all-stages"] });
  };

  const saveStage = useMutation({
    mutationFn: async (values: StageForm) => {
      const payload = {
        nome: values.nome,
        modulo: values.modulo === SEM_MODULO ? null : values.modulo,
        descricao: values.descricao || null,
        responsavel: values.responsavel || null,
        data_inicio: values.data_inicio || null,
        data_prevista: values.data_prevista || null,
        data_conclusao: values.data_conclusao || null,
        status: values.status,
        pauta_semana: values.pauta_semana,
      };
      if (values.id) {
        const { error } = await supabase.from("project_stages").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_stages")
          .insert({ ...payload, project_id: projectId, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
      toast.success("Etapa salva.");
    },
    onError: () => toast.error("Não foi possível salvar a etapa."),
  });

  const concludeStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_stages")
        .update({ status: "homologada", data_conclusao: todayISO() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const togglePauta = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("project_stages")
        .update({ pauta_semana: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const stages = stagesQuery.data ?? [];
  const done = stages.filter((s) => {
    const st = effectiveStageStatus(s);
    return st === "concluida" || st === "homologada";
  }).length;
  const late = stages.filter((s) => effectiveStageStatus(s) === "atrasada").length;
  const replanejadas = stages.filter((s) => effectiveStageStatus(s) === "replanejada").length;
  const percent = stages.length ? Math.round((done / stages.length) * 100) : 0;

  const pauta = stages.filter(
    (s) =>
      s.pauta_semana ||
      (s.data_prevista && s.data_prevista >= semana.inicio && s.data_prevista <= semana.fim),
  );

  const visiveis =
    moduloFiltro === "todos"
      ? stages
      : stages.filter((s) => (s.modulo ?? SEM_MODULO) === moduloFiltro);

  const grupos = [...MODULOS, SEM_MODULO].map((modulo) => ({
    modulo,
    label: modulo === SEM_MODULO ? "Sem módulo" : modulo,
    itens: visiveis.filter((s) => (s.modulo ?? SEM_MODULO) === modulo),
  }));

  return (
    <AppShell userLabel={user.email}>
      <ProjectHeader
        projectId={projectId}
        cliente={project.data?.cliente ?? "Projeto"}
        subtitle={project.data?.descricao}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-5">
        <SummaryCard label="Etapas" value={String(stages.length)} />
        <SummaryCard label="Homologadas" value={String(done)} />
        <SummaryCard label="Replanejadas" value={String(replanejadas)} />
        <SummaryCard label="Atrasadas" value={String(late)} tone={late > 0 ? "danger" : undefined} />
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Progresso</p>
          <p className="mt-1 text-2xl font-semibold">{percent}%</p>
          <Progress value={percent} className="mt-2" />
        </div>
      </div>

      <GradeSemanas stages={stages} />

      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Star className="size-4 text-warning-foreground" />
          <h2 className="text-sm font-semibold">Pauta da semana</h2>
          <span className="text-xs text-muted-foreground">
            {formatDate(semana.inicio)} a {formatDate(semana.fim)}
          </span>
        </div>
        {pauta.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma etapa marcada nem prevista para esta semana.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {pauta.map((s) => {
              const status = effectiveStageStatus(s);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {s.modulo ? `${s.modulo} · ` : ""}
                      {s.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Previsto para {formatDate(s.data_prevista)}
                      {isToday(s.data_prevista, s.data_inicio) ? " · hoje" : ""}
                    </p>
                  </div>
                  <Badge className={STAGE_STATUS[status].className} variant="secondary">
                    {STAGE_STATUS[status].label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={moduloFiltro} onValueChange={setModuloFiltro}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os módulos</SelectItem>
            {MODULOS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
            <SelectItem value={SEM_MODULO}>Sem módulo</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setForm({ ...emptyStage })}>
            <Plus className="size-4" /> Nova etapa
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {grupos.every((g) => g.itens.length === 0) ? (
          <div className="rounded-lg border bg-card px-4 py-8 text-center text-muted-foreground">
            Nenhuma etapa cadastrada.
          </div>
        ) : (
          grupos
            .filter((g) => g.itens.length > 0)
            .map((grupo) => {
              const concluidas = grupo.itens.filter((s) => {
                const st = effectiveStageStatus(s);
                return st === "concluida" || st === "homologada";
              }).length;
              const pct = Math.round((concluidas / grupo.itens.length) * 100);
              return (
                <section key={grupo.modulo} className="overflow-hidden rounded-lg border bg-card">
                  <header className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
                    <h3 className="text-sm font-semibold">{grupo.label}</h3>
                    <span className="text-xs text-muted-foreground">
                      {concluidas} de {grupo.itens.length} concluídas
                    </span>
                    <Progress value={pct} className="ml-auto w-32" />
                    <span className="w-10 text-right text-xs font-medium">{pct}%</span>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2">Etapa</th>
                          <th className="px-4 py-2">Responsável</th>
                          <th className="px-4 py-2">Início</th>
                          <th className="px-4 py-2">Previsto</th>
                          <th className="px-4 py-2">Conclusão</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.itens.map((stage) => {
                          const status = effectiveStageStatus(stage);
                          const hoje = isToday(stage.data_prevista, stage.data_inicio);
                          return (
                            <tr
                              key={stage.id}
                              className={hoje ? "border-t bg-info/5" : "border-t"}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 font-medium">
                                  {stage.nome}
                                  {stage.pauta_semana ? (
                                    <Star className="size-3.5 text-warning-foreground" />
                                  ) : null}
                                  {hoje ? (
                                    <Badge variant="secondary" className="bg-info/15 text-info">
                                      Hoje
                                    </Badge>
                                  ) : null}
                                </div>
                                {stage.descricao ? (
                                  <p className="text-xs text-muted-foreground">{stage.descricao}</p>
                                ) : null}
                              </td>
                              <td className="px-4 py-3">{stage.responsavel ?? "—"}</td>
                              <td className="px-4 py-3">{formatDate(stage.data_inicio)}</td>
                              <td
                                className={
                                  status === "atrasada"
                                    ? "px-4 py-3 font-medium text-danger"
                                    : "px-4 py-3"
                                }
                              >
                                {formatDate(stage.data_prevista)}
                              </td>
                              <td className="px-4 py-3">{formatDate(stage.data_conclusao)}</td>
                              <td className="px-4 py-3">
                                <Badge
                                  className={STAGE_STATUS[status].className}
                                  variant="secondary"
                                >
                                  {STAGE_STATUS[status].label}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={
                                      stage.pauta_semana
                                        ? "Remover da pauta da semana"
                                        : "Colocar na pauta da semana"
                                    }
                                    onClick={() =>
                                      togglePauta.mutate({
                                        id: stage.id,
                                        value: !stage.pauta_semana,
                                      })
                                    }
                                  >
                                    <Star
                                      className={
                                        stage.pauta_semana
                                          ? "size-4 text-warning-foreground"
                                          : "size-4"
                                      }
                                    />
                                  </Button>
                                  {status !== "homologada" ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Marcar como homologada"
                                      onClick={() => concludeStage.mutate(stage.id)}
                                    >
                                      <Check className="size-4" />
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Editar etapa"
                                    onClick={() =>
                                      setForm({
                                        id: stage.id,
                                        nome: stage.nome,
                                        modulo: stage.modulo ?? SEM_MODULO,
                                        descricao: stage.descricao ?? "",
                                        responsavel: stage.responsavel ?? "",
                                        data_inicio: stage.data_inicio ?? "",
                                        data_prevista: stage.data_prevista ?? "",
                                        data_conclusao: stage.data_conclusao ?? "",
                                        status: stage.status,
                                        pauta_semana: stage.pauta_semana,
                                      })
                                    }
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Excluir etapa"
                                    onClick={() => deleteStage.mutate(stage.id)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
        )}
      </div>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar etapa" : "Nova etapa"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveStage.mutate(form);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome da etapa</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Módulo</Label>
                  <Select
                    value={form.modulo}
                    onValueChange={(value) => setForm({ ...form, modulo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_MODULO}>Sem módulo</SelectItem>
                      {MODULOS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={form.responsavel}
                    onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_STATUS_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {STAGE_STATUS[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inicio">Início</Label>
                  <Input
                    id="inicio"
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prevista">Previsto</Label>
                  <Input
                    id="prevista"
                    type="date"
                    value={form.data_prevista}
                    onChange={(e) => setForm({ ...form, data_prevista: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conclusao">Conclusão</Label>
                  <Input
                    id="conclusao"
                    type="date"
                    value={form.data_conclusao}
                    onChange={(e) => setForm({ ...form, data_conclusao: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.pauta_semana}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, pauta_semana: checked === true })
                  }
                />
                Incluir na pauta da semana
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveStage.isPending}>
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | undefined;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "danger" ? "mt-1 text-2xl font-semibold text-danger" : "mt-1 text-2xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
