import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProject } from "@/lib/useProject";

export const Route = createFileRoute("/_authenticated/projeto/$projectId/modulos")({
  head: () => ({
    meta: [
      { title: "Mapa de módulos" },
      {
        name: "description",
        content: "Mapa do projeto a partir do produto selecionado, com módulos e submódulos do catálogo.",
      },
    ],
  }),
  component: ModulosPage,
});

type CatalogModule = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
};

type CatalogSubmodule = {
  id: string;
  module_id: string;
  name: string;
  code: string | null;
  description: string | null;
};

type ProjectModule = {
  project_id: string;
  module_id: string;
  planned_training_date: string | null;
};

function ModulosPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const project = useProject(projectId);
  const [busca, setBusca] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const modulesQuery = useQuery({
    queryKey: ["project-catalog-modules", projectId],
    queryFn: async () => {
      const { data: links, error: linksError } = await supabase
        .from("project_modules")
        .select("project_id, module_id, planned_training_date")
        .eq("project_id", projectId);
      if (linksError) throw linksError;

      const moduleIds = (links ?? []).map((item) => item.module_id);
      if (moduleIds.length === 0) return { links: [], modules: [], submodules: [] };

      const { data: modules, error: modulesError } = await supabase
        .from("modules")
        .select("id, name, code, description")
        .in("id", moduleIds)
        .eq("active", true)
        .order("name");
      if (modulesError) throw modulesError;

      const { data: submodules, error: submodulesError } = await supabase
        .from("submodules")
        .select("id, module_id, name, code, description")
        .in("module_id", moduleIds)
        .eq("active", true)
        .order("name");
      if (submodulesError) throw submodulesError;

      return {
        links: (links ?? []) as ProjectModule[],
        modules: (modules ?? []) as CatalogModule[],
        submodules: (submodules ?? []) as CatalogSubmodule[],
      };
    },
  });

  const updateTrainingDate = useMutation({
    mutationFn: async ({ moduleId, date }: { moduleId: string; date: string }) => {
      const { error } = await supabase
        .from("project_modules")
        .update({ planned_training_date: date || null })
        .eq("project_id", projectId)
        .eq("module_id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-catalog-modules", projectId] });
      queryClient.invalidateQueries({ queryKey: ["all-project-modules"] });
      toast.success("Data de treinamento salva.");
    },
    onError: () => toast.error("Não foi possível salvar a data."),
  });

  const links = modulesQuery.data?.links ?? [];
  const modules = modulesQuery.data?.modules ?? [];
  const submodules = modulesQuery.data?.submodules ?? [];

  const filtered = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return modules;
    return modules.filter((module) => {
      const children = submodules.filter((item) => item.module_id === module.id);
      return (
        module.name.toLowerCase().includes(term) ||
        children.some((item) => item.name.toLowerCase().includes(term))
      );
    });
  }, [busca, modules, submodules]);

  const linkByModule = new Map(links.map((link) => [link.module_id, link]));
  const submodulesByModule = new Map<string, CatalogSubmodule[]>();
  for (const item of submodules) {
    const list = submodulesByModule.get(item.module_id) ?? [];
    list.push(item);
    submodulesByModule.set(item.module_id, list);
  }

  return (
    <AppShell userLabel={project.data?.cliente ?? "Projeto"}>
      <ProjectHeader
        projectId={projectId}
        cliente={project.data?.cliente ?? "Projeto"}
        subtitle={project.data?.descricao}
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mapa</h1>
          <p className="text-sm text-muted-foreground">
            Módulos e submódulos herdados do produto do projeto.
          </p>
        </div>
        <Input
          className="max-w-72"
          placeholder="Buscar módulo ou submódulo…"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </div>

      {modulesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando catálogo…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="font-medium">Nenhum módulo vinculado a este projeto.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ao criar um projeto, selecione o produto. Os módulos existentes desse produto entram automaticamente no Mapa.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((module) => {
            const children = submodulesByModule.get(module.id) ?? [];
            const link = linkByModule.get(module.id);
            const isOpen = expanded[module.id] ?? true;

            return (
              <section key={module.id} className="overflow-hidden rounded-lg border bg-card">
                <header className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setExpanded((state) => ({ ...state, [module.id]: !isOpen }))}
                    aria-label={isOpen ? "Recolher módulo" : "Expandir módulo"}
                  >
                    {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{module.name}</h2>
                      {module.code ? <Badge variant="secondary">{module.code}</Badge> : null}
                      <span className="text-xs text-muted-foreground">
                        {children.length} submódulo(s)
                      </span>
                    </div>
                    {module.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    Treinamento
                    <Input
                      type="date"
                      className="h-8 w-36"
                      value={link?.planned_training_date ?? ""}
                      onChange={(event) =>
                        updateTrainingDate.mutate({ moduleId: module.id, date: event.target.value })
                      }
                    />
                  </label>
                </header>

                {isOpen ? (
                  <div className="divide-y">
                    {children.length === 0 ? (
                      <p className="px-6 py-4 text-sm text-muted-foreground">
                        Nenhum submódulo cadastrado no catálogo.
                      </p>
                    ) : (
                      children.map((child) => (
                        <div key={child.id} className="flex items-center gap-3 px-6 py-3">
                          <div className="size-2 rounded-full bg-muted-foreground/50" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{child.name}</p>
                            {child.description ? (
                              <p className="text-xs text-muted-foreground">{child.description}</p>
                            ) : null}
                          </div>
                          {child.code ? (
                            <span className="ml-auto text-xs text-muted-foreground">{child.code}</span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
