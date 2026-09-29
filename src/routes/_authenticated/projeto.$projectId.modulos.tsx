import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MODULOS, MODULE_STATUS, MODULE_STATUS_KEYS, formatDate } from "@/lib/status";
import type { ModuleStatus } from "@/lib/status";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/lib/useProject";

export const Route = createFileRoute("/_authenticated/projeto/$projectId/modulos")({
  head: () => ({
    meta: [
      { title: "Mapa de módulos" },
      {
        name: "description",
        content:
          "Mapa de módulos e submódulos com datas de treinamento, homologação e responsáveis.",
      },
      { property: "og:title", content: "Mapa de módulos" },
      {
        property: "og:description",
        content: "Status de configuração, treinamento e homologação de cada submódulo.",
      },
    ],
  }),
  component: ModulosPage,
});

type ModuleForm = {
  id?: string;
  nome: string;
  parent_id: string;
  grupo: string;
  area: string;
  responsavel_cliente: string;
  responsavel_hpro: string;
  status: string;
  data_treinamento: string;
  data_homologacao: string;
  homologado_por: string;
  observacoes: string;
};

const SEM_PAI = "nenhum";

const emptyModule: ModuleForm = {
  nome: "",
  parent_id: SEM_PAI,
  grupo: "",
  area: "",
  responsavel_cliente: "",
  responsavel_hpro: "",
  status: "pendente",
  data_treinamento: "",
  data_homologacao: "",
  homologado_por: "",
  observacoes: "",
};

function ModulosPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const project = useProject(projectId);
  const [form, setForm] = useState<ModuleForm | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [responsavelFiltro, setResponsavelFiltro] = useState("todos");

  const modulesQuery = useQuery({
    queryKey: ["modules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("project_id", projectId)
        .order("ordem")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["modules", projectId] });

  const saveModule = useMutation({
    mutationFn: async (values: ModuleForm) => {
      const payload = {
        nome: values.nome,
        parent_id: values.parent_id === SEM_PAI ? null : values.parent_id,
        grupo: values.grupo || null,
        area: values.area || null,
        responsavel_cliente: values.responsavel_cliente || null,
        responsavel_hpro: values.responsavel_hpro || null,
        status: values.status,
        data_treinamento: values.data_treinamento || null,
        data_homologacao: values.data_homologacao || null,
        homologado_por: values.homologado_por || null,
        observacoes: values.observacoes || null,
      };
      if (values.id) {
        const { error } = await supabase.from("modules").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("modules")
          .insert({ ...payload, project_id: projectId, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
      toast.success("Registro salvo.");
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const modules = modulesQuery.data ?? [];
  const pais = modules.filter((m) => !m.parent_id);

  const responsaveis = useMemo(
    () =>
      Array.from(
        new Set(modules.map((m) => m.responsavel_hpro).filter((v): v is string => Boolean(v))),
      ),
    [modules],
  );

  const matches = (m: (typeof modules)[number]) => {
    if (statusFiltro !== "todos" && m.status !== statusFiltro) return false;
    if (responsavelFiltro !== "todos" && m.responsavel_hpro !== responsavelFiltro) return false;
    if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  };

  const grupos = pais
    .map((pai) => {
      const filhos = modules.filter((m) => m.parent_id === pai.id);
      return { pai, filhos: filhos.filter(matches), filhosTotal: filhos };
    })
    .filter((g) => matches(g.pai) || g.filhos.length > 0);

  const orfaos = modules.filter(
    (m) => m.parent_id && !pais.some((p) => p.id === m.parent_id) && matches(m),
  );

  const counts = MODULE_STATUS_KEYS.map((key) => ({
    key,
    label: MODULE_STATUS[key].label,
    total: modules.filter((m) => m.status === key).length,
  }));

  return (
    <AppShell userLabel={user.email}>
      <ProjectHeader
        projectId={projectId}
        cliente={project.data?.cliente ?? "Projeto"}
        subtitle={project.data?.descricao}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-5">
        {counts.map((c) => (
          <div key={c.key} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.total}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar módulo ou submódulo…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-64"
        />
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {MODULE_STATUS_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {MODULE_STATUS[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os responsáveis</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => setForm({ ...emptyModule })}>
            <Plus className="size-4" /> Novo módulo
          </Button>
        </div>
      </div>

      {grupos.length === 0 && orfaos.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-muted-foreground">
          Nenhum módulo encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(({ pai, filhos, filhosTotal }) => {
            const homologados = filhosTotal.filter((f) => f.status === "homologado").length;
            return (
              <section key={pai.id} className="overflow-hidden rounded-lg border bg-card">
                <header className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
                  <h3 className="text-sm font-semibold">{pai.nome}</h3>
                  {pai.area ? (
                    <span className="text-xs text-muted-foreground">{pai.area}</span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {homologados} de {filhosTotal.length} submódulos homologados
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setForm({ ...emptyModule, parent_id: pai.id })}
                    >
                      <Plus className="size-4" /> Submódulo
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar módulo"
                      onClick={() => setForm(toForm(pai))}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir módulo"
                      onClick={() => deleteModule.mutate(pai.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </header>
                {filhos.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum submódulo cadastrado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2">Submódulo</th>
                          <th className="px-4 py-2">Resp. cliente</th>
                          <th className="px-4 py-2">Resp. Hpro</th>
                          <th className="px-4 py-2">Treinamento</th>
                          <th className="px-4 py-2">Homologação</th>
                          <th className="px-4 py-2">Homologado por</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filhos.map((m) => (
                          <ModuleRow
                            key={m.id}
                            m={m}
                            onEdit={() => setForm(toForm(m))}
                            onDelete={() => deleteModule.mutate(m.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}

          {orfaos.length > 0 ? (
            <section className="overflow-hidden rounded-lg border bg-card">
              <header className="border-b bg-muted/40 px-4 py-3 text-sm font-semibold">
                Sem módulo principal
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {orfaos.map((m) => (
                      <ModuleRow
                        key={m.id}
                        m={m}
                        onEdit={() => setForm(toForm(m))}
                        onDelete={() => deleteModule.mutate(m.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form?.id
                ? "Editar registro"
                : form?.parent_id !== SEM_PAI
                  ? "Novo submódulo"
                  : "Novo módulo"}
            </DialogTitle>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveModule.mutate(form);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                    list={form.parent_id === SEM_PAI ? "modulos-sugestoes" : undefined}
                  />
                  <datalist id="modulos-sugestoes">
                    {MODULOS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>Pertence ao módulo</Label>
                  <Select
                    value={form.parent_id}
                    onValueChange={(value) => setForm({ ...form, parent_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_PAI}>É um módulo principal</SelectItem>
                      {pais
                        .filter((p) => p.id !== form.id)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="grupo">Grupo (utilitário)</Label>
                  <Input
                    id="grupo"
                    value={form.grupo}
                    onChange={(e) => setForm({ ...form, grupo: e.target.value })}
                    placeholder="Ex.: CADASTROS, ORÇAMENTO"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">Área / responsável</Label>
                  <Input
                    id="area"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
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
                      {MODULE_STATUS_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {MODULE_STATUS[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rc">Responsável do cliente</Label>
                  <Input
                    id="rc"
                    value={form.responsavel_cliente}
                    onChange={(e) => setForm({ ...form, responsavel_cliente: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rh">Responsável Hpro</Label>
                  <Input
                    id="rh"
                    value={form.responsavel_hpro}
                    onChange={(e) => setForm({ ...form, responsavel_hpro: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dt">Treinamento</Label>
                  <Input
                    id="dt"
                    type="date"
                    value={form.data_treinamento}
                    onChange={(e) => setForm({ ...form, data_treinamento: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dh">Homologação</Label>
                  <Input
                    id="dh"
                    type="date"
                    value={form.data_homologacao}
                    onChange={(e) => setForm({ ...form, data_homologacao: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hp">Homologado por</Label>
                  <Input
                    id="hp"
                    value={form.homologado_por}
                    onChange={(e) => setForm({ ...form, homologado_por: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obs">Observações</Label>
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
                <Button type="submit" disabled={saveModule.isPending}>
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

type ModuleRowData = {
  id: string;
  nome: string;
  status: string;
  area: string | null;
  grupo?: string | null;
  parent_id: string | null;
  responsavel_cliente: string | null;
  responsavel_hpro: string | null;
  data_treinamento: string | null;
  data_homologacao: string | null;
  homologado_por: string | null;
  observacoes: string | null;
};

function toForm(m: ModuleRowData): ModuleForm {
  return {
    id: m.id,
    nome: m.nome,
    parent_id: m.parent_id ?? SEM_PAI,
    grupo: m.grupo ?? "",
    area: m.area ?? "",
    responsavel_cliente: m.responsavel_cliente ?? "",
    responsavel_hpro: m.responsavel_hpro ?? "",
    status: m.status,
    data_treinamento: m.data_treinamento ?? "",
    data_homologacao: m.data_homologacao ?? "",
    homologado_por: m.homologado_por ?? "",
    observacoes: m.observacoes ?? "",
  };
}

function ModuleRow({
  m,
  onEdit,
  onDelete,
}: {
  m: ModuleRowData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = MODULE_STATUS[m.status as ModuleStatus] ?? MODULE_STATUS.pendente;
  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <p className="flex items-center gap-2 font-medium">
          <CornerDownRight className="size-3.5 text-muted-foreground" />
          {m.grupo ? <span className="text-xs text-muted-foreground">{m.grupo} ·</span> : null}
          {m.nome}
        </p>
        {m.observacoes ? (
          <p className="text-xs text-muted-foreground">{m.observacoes}</p>
        ) : null}
      </td>
      <td className="px-4 py-3">{m.responsavel_cliente ?? "—"}</td>
      <td className="px-4 py-3">{m.responsavel_hpro ?? "—"}</td>
      <td className="px-4 py-3">{formatDate(m.data_treinamento)}</td>
      <td className="px-4 py-3">{formatDate(m.data_homologacao)}</td>
      <td className="px-4 py-3">{m.homologado_por ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge className={status.className} variant="secondary">
          {status.label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Editar" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
