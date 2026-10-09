import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/useRole";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/cadastros/produtos")({
  head: () => ({
    meta: [
      { title: "Cadastro de produtos e módulos" },
      {
        name: "description",
        content:
          "Cadastre produtos, módulos e submódulos que alimentam o mapa e o cronograma dos projetos.",
      },
    ],
  }),
  component: ProdutosPage,
});

type ProductForm = { id?: string; name: string; description: string };
type ModuleForm = {
  id?: string;
  kind: "module" | "submodule";
  parent_id: string | null;
  name: string;
  code: string;
  description: string;
};

function ProdutosPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, isSupervisor } = useRole();
  const canManage = isAdmin || isSupervisor;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const products = productsQuery.data ?? [];
  const activeId =
    selected && products.some((product) => product.id === selected)
      ? selected
      : products[0]?.id ?? null;

  const modulesQuery = useQuery({
    queryKey: ["product-modules", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, product_id, name, code, description, active")
        .eq("product_id", activeId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const modules = modulesQuery.data ?? [];
  const moduleIds = modules.map((module) => module.id);

  const submodulesQuery = useQuery({
    queryKey: ["product-submodules", activeId, moduleIds.join(",")],
    enabled: !!activeId && moduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submodules")
        .select("id, module_id, name, code, description, active")
        .in("module_id", moduleIds)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const submodules = submodulesQuery.data ?? [];

  const saveProduct = useMutation({
    mutationFn: async (values: ProductForm) => {
      const payload = { name: values.name.trim(), description: values.description.trim() || null };
      if (!payload.name) throw new Error("Informe o nome do produto.");
      if (values.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", values.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("products")
        .insert({ ...payload, created_by: user.id, active: true });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["menu-products"] }),
      ]);
      setProductForm(null);
      toast.success("Produto salvo.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar o produto."),
  });

  const saveModule = useMutation({
    mutationFn: async (values: ModuleForm) => {
      const name = values.name.trim();
      if (!name) throw new Error("Informe o nome.");
      if (values.kind === "module") {
        if (!activeId) throw new Error("Selecione um produto.");
        const payload = {
          product_id: activeId,
          name,
          code: values.code.trim() || null,
          description: values.description.trim() || null,
        };
        if (values.id) {
          const { error } = await supabase.from("modules").update(payload).eq("id", values.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("modules").insert({ ...payload, active: true });
          if (error) throw error;
        }
        return;
      }

      if (!values.parent_id) throw new Error("Selecione o módulo principal.");
      const payload = {
        module_id: values.parent_id,
        name,
        code: values.code.trim() || null,
        description: values.description.trim() || null,
      };
      if (values.id) {
        const { error } = await supabase.from("submodules").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("submodules").insert({ ...payload, active: true });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product-modules", activeId] }),
        queryClient.invalidateQueries({ queryKey: ["product-submodules"] }),
      ]);
      setModuleForm(null);
      toast.success("Registro salvo.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar o registro."),
  });

  const removeModule = useMutation({
    mutationFn: async (item: { id: string; kind: "module" | "submodule" }) => {
      if (item.kind === "module") {
        const { count, error: countError } = await supabase
          .from("submodules")
          .select("id", { count: "exact", head: true })
          .eq("module_id", item.id);
        if (countError) throw countError;
        if ((count ?? 0) > 0) {
          throw new Error("Exclua ou desative os submódulos antes de excluir este módulo.");
        }
        const { error } = await supabase.from("modules").delete().eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("submodules").delete().eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product-modules", activeId] }),
        queryClient.invalidateQueries({ queryKey: ["product-submodules"] }),
      ]);
      toast.success("Registro excluído.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível excluir o registro."),
  });

  const openModuleForm = (values: ModuleForm) => setModuleForm(values);

  return (
    <AppShell userLabel={user.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos e módulos</h1>
          <p className="text-sm text-muted-foreground">
            A mesma lista de produtos ativos do menu, com seus módulos e submódulos vinculados.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setProductForm({ name: "", description: "" })}>
            <Plus className="size-4" /> Novo produto
          </Button>
        ) : null}
      </div>

      {productsQuery.isError ? (
        <p className="mb-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
          Não foi possível carregar os produtos. Atualize a página ou confira as permissões.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {productsQuery.isLoading ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Carregando produtos…</p>
          ) : products.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              Nenhum produto ativo cadastrado.
            </p>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelected(product.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                  product.id === activeId ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"
                }`}
              >
                <span className="font-medium">{product.name}</span>
                {product.description ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{product.description}</span>
                ) : null}
              </button>
            ))
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              {products.find((product) => product.id === activeId)?.name ?? "Selecione um produto"}
            </h2>
            {canManage && activeId ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const product = products.find((item) => item.id === activeId);
                    if (product) {
                      setProductForm({
                        id: product.id,
                        name: product.name,
                        description: product.description ?? "",
                      });
                    }
                  }}
                >
                  <Pencil className="size-4" /> Editar produto
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    openModuleForm({ kind: "module", parent_id: null, name: "", code: "", description: "" })
                  }
                >
                  <Plus className="size-4" /> Módulo
                </Button>
              </div>
            ) : null}
          </header>

          {!activeId ? (
            <p className="p-6 text-sm text-muted-foreground">Cadastre ou ative um produto para começar.</p>
          ) : modulesQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando módulos…</p>
          ) : modulesQuery.isError ? (
            <p className="p-6 text-sm text-destructive">Não foi possível carregar os módulos deste produto.</p>
          ) : modules.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum módulo neste produto ainda.</p>
          ) : (
            <div className="divide-y">
              {modules.map((module) => {
                const children = submodules.filter((submodule) => submodule.module_id === module.id);
                return (
                  <div key={module.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{module.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {children.length} submódulo(s){module.code ? ` · ${module.code}` : ""}
                        </p>
                        {module.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
                        ) : null}
                      </div>
                      {canManage ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openModuleForm({
                                kind: "submodule",
                                parent_id: module.id,
                                name: "",
                                code: "",
                                description: "",
                              })
                            }
                          >
                            <Plus className="size-4" /> Submódulo
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar módulo"
                            onClick={() =>
                              openModuleForm({
                                id: module.id,
                                kind: "module",
                                parent_id: null,
                                name: module.name,
                                code: module.code ?? "",
                                description: module.description ?? "",
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir módulo"
                            onClick={() => removeModule.mutate({ id: module.id, kind: "module" })}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {children.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {children.map((child) => (
                          <li
                            key={child.id}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{child.name}</span>
                              {child.code ? <span className="text-xs text-muted-foreground">{child.code}</span> : null}
                            </span>
                            {canManage ? (
                              <span className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Editar submódulo"
                                  onClick={() =>
                                    openModuleForm({
                                      id: child.id,
                                      kind: "submodule",
                                      parent_id: module.id,
                                      name: child.name,
                                      code: child.code ?? "",
                                      description: child.description ?? "",
                                    })
                                  }
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Excluir submódulo"
                                  onClick={() => removeModule.mutate({ id: child.id, kind: "submodule" })}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={productForm !== null} onOpenChange={(open) => !open && setProductForm(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{productForm?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>O produto ativo aparece no menu e pode ser vinculado a clientes.</DialogDescription>
          </DialogHeader>
          {productForm ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveProduct.mutate(productForm);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="produto-nome">Nome</Label>
                <Input
                  id="produto-nome"
                  value={productForm.name}
                  onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="produto-descricao">Descrição</Label>
                <Textarea
                  id="produto-descricao"
                  value={productForm.description}
                  onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProductForm(null)}>Cancelar</Button>
                <Button type="submit" disabled={saveProduct.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={moduleForm !== null} onOpenChange={(open) => !open && setModuleForm(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {moduleForm?.kind === "submodule" ? "Submódulo" : "Módulo"}
              {moduleForm?.id ? " · edição" : ""}
            </DialogTitle>
            <DialogDescription>
              Os registros são gravados nas tabelas de módulos e submódulos usadas pelo sistema.
            </DialogDescription>
          </DialogHeader>
          {moduleForm ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveModule.mutate(moduleForm);
              }}
            >
              {moduleForm.kind === "submodule" ? (
                <div className="space-y-1.5">
                  <Label>Módulo principal</Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {modules.find((item) => item.id === moduleForm.parent_id)?.name ?? "Módulo selecionado"}
                  </p>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="modulo-nome">Nome</Label>
                <Input
                  id="modulo-nome"
                  value={moduleForm.name}
                  onChange={(event) => setModuleForm({ ...moduleForm, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modulo-codigo">Código (opcional)</Label>
                <Input
                  id="modulo-codigo"
                  value={moduleForm.code}
                  onChange={(event) => setModuleForm({ ...moduleForm, code: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modulo-descricao">Descrição (opcional)</Label>
                <Textarea
                  id="modulo-descricao"
                  value={moduleForm.description}
                  onChange={(event) => setModuleForm({ ...moduleForm, description: event.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModuleForm(null)}>Cancelar</Button>
                <Button type="submit" disabled={saveModule.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
