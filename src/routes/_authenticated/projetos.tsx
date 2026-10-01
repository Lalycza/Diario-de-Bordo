import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Package } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { effectiveStageStatus, formatDate } from "@/lib/status";
import { TEMPLATE_FASES } from "@/lib/template";
import { AppShell } from "@/components/AppShell";
import { ManagementDashboard } from "@/components/ManagementDashboard";
import { useRole } from "@/lib/useRole";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/projetos")({
  head: () => ({
    meta: [
      { title: "Projetos de implantação" },
      {
        name: "description",
        content: "Lista de projetos de implantação por cliente, com responsável, datas e progresso.",
      },
      { property: "og:title", content: "Projetos de implantação" },
      {
        property: "og:description",
        content: "Acompanhe o progresso de cada projeto de implantação da carteira.",
      },
    ],
  }),
  component: ProjetosPage,
});

type ProjectForm = {
  id?: string;
  client_id: string;
  cliente: string;
  product_id: string;
  descricao: string;
  responsavel: string;
  analista: string;
  coordenacao: string;
  email_cliente: string;
  data_inicio: string;
  previsao_conclusao: string;
  data_entrega_original: string;
  fases: string[];
};

const emptyForm: ProjectForm = {
  client_id: "",
  cliente: "",
  product_id: "",
  descricao: "",
  responsavel: "",
  analista: "",
  coordenacao: "",
  email_cliente: "",
  data_inicio: "",
  previsao_conclusao: "",
  data_entrega_original: "",
  fases: TEMPLATE_FASES.map((f) => f.fase),
};

function ProjetosPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, isSupervisor } = useRole();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<ProjectForm | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients-for-project"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, razao_social, nome_fantasia, email, product_id").order("razao_social");
      if (error) throw error;
      return data ?? [];
    },
  });

  const productsQuery = useQuery({
    queryKey: ["products-for-project"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stagesQuery = useQuery({
    queryKey: ["all-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_stages")
        .select("project_id, status, data_prevista, data_conclusao");
      if (error) throw error;
      return data;
    },
  });

  const projectModulesQuery = useQuery({
    queryKey: ["all-project-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_modules")
        .select("project_id, module_id, planned_training_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const trainingsQuery = useQuery({
    queryKey: ["all-trainings-for-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("project_id, module_id, status, planned_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveProject = useMutation({
    mutationFn: async (values: ProjectForm) => {
      const payload = {
        client_id: values.client_id || null,
        cliente: values.cliente,
        descricao: values.descricao || null,
        responsavel: values.responsavel || null,
        analista: values.analista || null,
        coordenacao: values.coordenacao || null,
        email_cliente: values.email_cliente || null,
        product_id: values.product_id || clientsQuery.data?.find((c) => c.id === values.client_id)?.product_id || null,
        data_inicio: values.data_inicio || null,
        previsao_conclusao: values.previsao_conclusao || null,
        data_entrega_original: values.data_entrega_original || null,
      };
      if (values.id) {
        const { data: currentProject, error: currentError } = await supabase
          .from("projects")
          .select("product_id")
          .eq("id", values.id)
          .single();
        if (currentError) throw currentError;

        const { error } = await supabase.from("projects").update(payload).eq("id", values.id);
        if (error) throw error;

        if (currentProject.product_id !== (values.product_id || null)) {
          const { error: clearError } = await supabase.from("project_modules").delete().eq("project_id", values.id);
          if (clearError) throw clearError;

          if (values.product_id) {
            const { data: catalogModules, error: catalogError } = await supabase
              .from("modules")
              .select("id")
              .eq("product_id", values.product_id)
              .eq("active", true);
            if (catalogError) throw catalogError;

            const uniqueModuleIds = [...new Set((catalogModules ?? []).map((m) => m.id))];
            if (uniqueModuleIds.length > 0) {
              const { error: linksError } = await supabase.from("project_modules").insert(
                uniqueModuleIds.map((moduleId) => ({ project_id: values.id!, module_id: moduleId })),
              );
              if (linksError) throw linksError;
            }
          }
        }
        return;
      }

      const { data: created, error } = await supabase
        .from("projects")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();
      if (error) throw error;

      const selectedItems = TEMPLATE_FASES
        .filter((f) => values.fases.includes(f.fase))
        .flatMap((f) => f.itens.map((item) => item.nome));

      if (!created) return;

      if (values.product_id) {
        const { data: catalogModules, error: catalogError } = await supabase
          .from("modules").select("id").eq("product_id", values.product_id).eq("active", true);
        if (catalogError) throw catalogError;
        const uniqueModuleIds = [...new Set((catalogModules ?? []).map((m) => m.id))];
        if (uniqueModuleIds.length > 0) {
          const { error: linksError } = await supabase.from("project_modules").upsert(
            uniqueModuleIds.map((moduleId) => ({ project_id: created.id, module_id: moduleId })),
            { onConflict: "project_id,module_id", ignoreDuplicates: true },
          );
        if (linksError) throw linksError;
        }
        return;
      }

      if (selectedItems.length === 0) return;

      const { data: catalogModules, error: catalogError } = await supabase
        .from("modules")
        .select("id, name")
        .in("name", selectedItems);

      if (catalogError) throw catalogError;

      const uniqueModuleIds = [...new Set((catalogModules ?? []).map((m) => m.id))];
      if (uniqueModuleIds.length > 0) {
        const { error: linksError } = await supabase.from("project_modules").insert(
          uniqueModuleIds.map((moduleId) => ({
            project_id: created.id,
            module_id: moduleId,
          })),
        );
        if (linksError) throw linksError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["all-project-modules"] });
      queryClient.invalidateQueries({ queryKey: ["all-trainings-for-projects"] });
      setForm(null);
      toast.success("Projeto salvo.");
    },
    onError: () => toast.error("Não foi possível salvar o projeto."),
  });

  const toggleArchive = useMutation({
    mutationFn: async ({ id, arquivado }: { id: string; arquivado: boolean }) => {
      const { error } = await supabase.from("projects").update({ arquivado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const projects = (projectsQuery.data ?? []).filter((p) => p.arquivado === showArchived);

  function progressFor(projectId: string) {
    const assigned = (projectModulesQuery.data ?? []).filter((m) => m.project_id === projectId);
    const trainings = (trainingsQuery.data ?? []).filter((t) => t.project_id === projectId);
    const done = trainings.filter((t) => t.status === "Concluído" || t.status === "Homologado").length;
    const stages = (stagesQuery.data ?? []).filter((s) => s.project_id === projectId);
    const late = stages.filter((s) => effectiveStageStatus(s) === "atrasada").length;
    const percent = assigned.length === 0 ? 0 : Math.min(100, Math.round((done / assigned.length) * 100));
    return { percent, total: assigned.length, done, late };
  }

  const toggleFase = (fase: string) => {
    if (!form) return;
    const fases = form.fases.includes(fase)
      ? form.fases.filter((f) => f !== fase)
      : [...form.fases, fase];
    setForm({ ...form, fases });
  };

  return (
    <AppShell userLabel={user.email}>
      {isAdmin || isSupervisor ? <ManagementDashboard /> : null}

      {!showArchived && (isAdmin || isSupervisor) ? (() => {
        const visible = projects;
        const homologados = visible.filter((p) => p.finalized).length;
        const emImplantacao = visible.filter((p) => !p.finalized).length;
        return (
          <section className="mb-6 rounded-xl border bg-card p-4" aria-label="Resumo da carteira">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{visible.length} Projetos visíveis</h2>
              <span className="text-xs text-muted-foreground">Carteira atual</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-2xl font-semibold">{emImplantacao}</div>
                <div className="text-xs text-muted-foreground">Em implantação</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-2xl font-semibold">{homologados}</div>
                <div className="text-xs text-muted-foreground">Homologados</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-2xl font-semibold">{(trainingsQuery.data ?? []).filter((t) => t.status !== "Concluído" && t.status !== "Homologado").length}</div>
                <div className="text-xs text-muted-foreground">Treinamentos pendentes</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-2xl font-semibold">{new Set((trainingsQuery.data ?? []).filter((t) => t.status !== "Concluído" && t.status !== "Homologado").map((t) => t.project_id)).size}</div>
                <div className="text-xs text-muted-foreground">Go Live parcial</div>
              </div>
            </div>
          </section>
        );
      })() : null}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            {showArchived ? "Projetos arquivados" : "Implantações em andamento por cliente"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Ver ativos" : "Ver arquivados"}
          </Button>
          <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
            <Plus className="size-4" /> Novo projeto
          </Button>
        </div>
      </div>

      {projectsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {showArchived ? "Nenhum projeto arquivado." : "Nenhum projeto cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const p = progressFor(project.id);
            return (
              <div key={project.id} className="rounded-lg border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/projeto/$projectId/cronograma"
                      params={{ projectId: project.id }}
                      className="text-base font-semibold hover:underline"
                    >
                      {project.cliente}
                    </Link>
                    {project.descricao ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{project.descricao}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar projeto"
                      onClick={() =>
                        setForm({
                          id: project.id,
                          cliente: project.cliente,
                          client_id: project.client_id ?? "",
                          product_id: project.product_id ?? "",
                          descricao: project.descricao ?? "",
                          responsavel: project.responsavel ?? "",
                          analista: project.analista ?? "",
                          coordenacao: project.coordenacao ?? "",
                          email_cliente: project.email_cliente ?? "",
                          data_inicio: project.data_inicio ?? "",
                          previsao_conclusao: project.previsao_conclusao ?? "",
                          data_entrega_original: project.data_entrega_original ?? "",
                          fases: [],
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={project.arquivado ? "Reativar projeto" : "Arquivar projeto"}
                      onClick={() =>
                        toggleArchive.mutate({ id: project.id, arquivado: !project.arquivado })
                      }
                    >
                      {project.arquivado ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Analista</dt>
                    <dd className="font-medium">{project.analista ?? project.responsavel ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Coordenação</dt>
                    <dd className="font-medium">{project.coordenacao ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Início</dt>
                    <dd className="font-medium">{formatDate(project.data_inicio)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Entrega</dt>
                    <dd className="font-medium">{formatDate(project.previsao_conclusao)}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {p.done} de {p.total} itens homologados
                      {p.late > 0 ? ` · ${p.late} etapa(s) atrasada(s)` : ""}
                    </span>
                    <span className="font-medium">{p.percent}%</span>
                  </div>
                  <Progress value={p.percent} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/projeto/$projectId/cronograma" params={{ projectId: project.id }}>
                      Cronograma
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/projeto/$projectId/modulos" params={{ projectId: project.id }}>
                      Mapa
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/projeto/$projectId/diario" params={{ projectId: project.id }}>
                      Diário
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/projeto/$projectId/demandas" params={{ projectId: project.id }}>
                      Demandas
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            <DialogDescription>Dados gerais da implantação do cliente.</DialogDescription>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                saveProject.mutate(form);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="cliente">Cliente</Label>
                <Select
                  value={form.client_id || undefined}
                  onValueChange={(value) => {
                    const client = (clientsQuery.data ?? []).find((c) => c.id === value);
                    setForm((current) => current ? {
                      ...current,
                      client_id: value,
                      cliente: client?.razao_social ?? client?.nome_fantasia ?? current.cliente,
                      email_cliente: client?.email ?? current.email_cliente,
                      product_id: client?.product_id ?? current.product_id,
                    } : current);
                  }}
                >
                  <SelectTrigger id="cliente" className="w-full">
                    <SelectValue placeholder={clientsQuery.isLoading ? "Carregando clientes..." : "Selecione o cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientsQuery.data ?? []).map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.razao_social}{client.nome_fantasia ? ` — ${client.nome_fantasia}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">O produto cadastrado no cliente será levado automaticamente para o projeto.</p>
              </div>
              <div className="space-y-1.5 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Package className="size-4" />
                  <Label>Produto / sistema vinculado ao projeto (paliativo)</Label>
                </div>
                <p className="text-xs text-muted-foreground">Preferencialmente o produto vem do cadastro do cliente. Este campo permanece como paliativo para projetos criados sem produto no nascimento do cliente.</p>
                <Select value={form.product_id || undefined} onValueChange={(value) => setForm((current) => current ? { ...current, product_id: value } : current)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={productsQuery.isLoading ? "Carregando produtos..." : "Selecione o produto / sistema"} /></SelectTrigger>
                  <SelectContent>
                    {(productsQuery.data ?? []).map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Projeto / descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="analista">Analista de implantação</Label>
                  <Input
                    id="analista"
                    value={form.analista}
                    onChange={(e) => setForm({ ...form, analista: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coordenacao">Coordenação</Label>
                  <Input
                    id="coordenacao"
                    value={form.coordenacao}
                    onChange={(e) => setForm({ ...form, coordenacao: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="responsavel">Responsável do cliente</Label>
                <Input
                  id="responsavel"
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email_cliente">E-mail do responsável do cliente</Label>
                <Input
                  id="email_cliente"
                  type="email"
                  value={form.email_cliente}
                  onChange={(e) => setForm({ ...form, email_cliente: e.target.value })}
                  placeholder="contato@cliente.com.br"
                />
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
                  <Label htmlFor="previsao">Data de entrega</Label>
                  <Input
                    id="previsao"
                    type="date"
                    value={form.previsao_conclusao}
                    onChange={(e) => setForm({ ...form, previsao_conclusao: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="original">Entrega original</Label>
                  <Input
                    id="original"
                    type="date"
                    value={form.data_entrega_original}
                    onChange={(e) => setForm({ ...form, data_entrega_original: e.target.value })}
                  />
                </div>
              </div>

              {form.id ? null : (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <Label>Fases do modelo</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        setForm({
                          ...form,
                          fases:
                            form.fases.length === TEMPLATE_FASES.length
                              ? []
                              : TEMPLATE_FASES.map((f) => f.fase),
                        })
                      }
                    >
                      {form.fases.length === TEMPLATE_FASES.length
                        ? "Desmarcar todas"
                        : "Marcar todas"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    As fases marcadas já entram no mapa com todos os submódulos do modelo.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TEMPLATE_FASES.map((fase) => (
                      <label
                        key={fase.fase}
                        className="flex items-start gap-2 text-xs leading-tight"
                      >
                        <Checkbox
                          checked={form.fases.includes(fase.fase)}
                          onCheckedChange={() => toggleFase(fase.fase)}
                        />
                        <span>
                          {fase.fase}
                          <span className="ml-1 text-muted-foreground">({fase.itens.length})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveProject.isPending}>
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
