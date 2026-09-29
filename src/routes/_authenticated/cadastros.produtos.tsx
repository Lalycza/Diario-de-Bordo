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
          "Cadastre os produtos (sistemas) e os módulos e submódulos que serão levados para cada projeto.",
      },
      { property: "og:title", content: "Cadastro de produtos e módulos" },
      {
        property: "og:description",
        content: "Produtos, módulos e submódulos que alimentam o mapa e o cronograma dos projetos.",
      },
    ],
  }),
  component: ProdutosPage,
});

type ProductForm = { id?: string; nome: string; descricao: string };
type ModuleForm = {
  id?: string;
  parent_id: string | null;
  nome: string;
  grupo: string;
  area: string;
  responsavel: string;
};

function ProdutosPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin } = useRole();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const products = productsQuery.data ?? [];
  const activeId = selected ?? products[0]?.id ?? null;

  const modulesQuery = useQuery({
    queryKey: ["product-modules", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_modules")
        .select("*")
        .eq("product_id", activeId!)
        .order("ordem")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const saveProduct = useMutation({
    mutationFn: async (values: ProductForm) => {
      const payload = { nome: values.nome, descricao: values.descricao || null };
      if (values.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", values.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("products")
        .insert({ ...payload, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductForm(null);
      toast.success("Produto salvo.");
    },
    onError: () => toast.error("Não foi possível salvar o produto."),
  });

  const saveModule = useMutation({
    mutationFn: async (values: ModuleForm) => {
      if (!activeId) throw new Error("Selecione um produto.");
      const payload = {
        product_id: activeId,
        parent_id: values.parent_id,
        nome: values.nome,
        grupo: values.grupo || null,
        area: values.area || null,
        responsavel: values.responsavel || null,
      };
      if (values.id) {
        const { error } = await supabase.from("product_modules").update(payload).eq("id", values.id);
        if (error) throw error;
        return;
      }
      const ordem = (modulesQuery.data ?? []).length;
      const { error } = await supabase.from("product_modules").insert({ ...payload, ordem });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-modules", activeId] });
      setModuleForm(null);
      toast.success("Módulo salvo.");
    },
    onError: () => toast.error("Não foi possível salvar o módulo."),
  });

  const removeModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-modules", activeId] }),
    onError: () => toast.error("Não foi possível excluir."),
  });

  const modules = modulesQuery.data ?? [];
  const pais = modules.filter((m) => !m.parent_id);

  return (
    <AppShell userLabel={user.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos e módulos</h1>
          <p className="text-sm text-muted-foreground">
            Cada produto guarda seus módulos e submódulos, que são levados ao projeto na criação.
          </p>
        </div>
        {isAdmin ? (
          <Button size="sm" onClick={() => setProductForm({ nome: "", descricao: "" })}>
            <Plus className="size-4" /> Novo produto
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {products.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              Nenhum produto cadastrado.
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
                <span className="font-medium">{product.nome}</span>
                {product.descricao ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {product.descricao}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              {products.find((p) => p.id === activeId)?.nome ?? "Selecione um produto"}
            </h2>
            {isAdmin && activeId ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const product = products.find((p) => p.id === activeId);
                    if (product)
                      setProductForm({
                        id: product.id,
                        nome: product.nome,
                        descricao: product.descricao ?? "",
                      });
                  }}
                >
                  <Pencil className="size-4" /> Editar produto
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setModuleForm({
                      parent_id: null,
                      nome: "",
                      grupo: "",
                      area: "",
                      responsavel: "",
                    })
                  }
                >
                  <Plus className="size-4" /> Módulo
                </Button>
              </div>
            ) : null}
          </header>

          {!activeId ? (
            <p className="p-6 text-sm text-muted-foreground">
              Cadastre um produto para começar a montar os módulos.
            </p>
          ) : pais.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum módulo neste produto ainda.</p>
          ) : (
            <div className="divide-y">
              {pais.map((pai) => {
                const filhos = modules.filter((m) => m.parent_id === pai.id);
                return (
                  <div key={pai.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{pai.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {filhos.length} submódulo(s)
                          {pai.responsavel ? ` · ${pai.responsavel}` : ""}
                        </p>
                      </div>
                      {isAdmin ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setModuleForm({
                                parent_id: pai.id,
                                nome: "",
                                grupo: "",
                                area: pai.area ?? "",
                                responsavel: pai.responsavel ?? "",
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
                              setModuleForm({
                                id: pai.id,
                                parent_id: null,
                                nome: pai.nome,
                                grupo: pai.grupo ?? "",
                                area: pai.area ?? "",
                                responsavel: pai.responsavel ?? "",
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir módulo"
                            onClick={() => removeModule.mutate(pai.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {filhos.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {filhos.map((filho) => (
                          <li
                            key={filho.id}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                          >
                            <span className="flex items-center gap-2">
                              <CornerDownRight className="size-3.5 text-muted-foreground" />
                              {filho.grupo ? (
                                <span className="text-xs text-muted-foreground">
                                  {filho.grupo} ·
                                </span>
                              ) : null}
                              {filho.nome}
                            </span>
                            {isAdmin ? (
                              <span className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Editar submódulo"
                                  onClick={() =>
                                    setModuleForm({
                                      id: filho.id,
                                      parent_id: pai.id,
                                      nome: filho.nome,
                                      grupo: filho.grupo ?? "",
                                      area: filho.area ?? "",
                                      responsavel: filho.responsavel ?? "",
                                    })
                                  }
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Excluir submódulo"
                                  onClick={() => removeModule.mutate(filho.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{productForm?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>Sistema que será implantado nos clientes.</DialogDescription>
          </DialogHeader>
          {productForm ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveProduct.mutate(productForm);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="produto-nome">Nome</Label>
                <Input
                  id="produto-nome"
                  value={productForm.nome}
                  onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="produto-descricao">Descrição</Label>
                <Textarea
                  id="produto-descricao"
                  value={productForm.descricao}
                  onChange={(e) => setProductForm({ ...productForm, descricao: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProductForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveProduct.isPending}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={moduleForm !== null} onOpenChange={(open) => !open && setModuleForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moduleForm?.parent_id ? "Submódulo" : "Módulo"}
              {moduleForm?.id ? " · edição" : ""}
            </DialogTitle>
            <DialogDescription>
              Estes itens são copiados para o mapa do projeto quando o produto é vinculado.
            </DialogDescription>
          </DialogHeader>
          {moduleForm ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveModule.mutate(moduleForm);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="modulo-nome">Nome</Label>
                <Input
                  id="modulo-nome"
                  value={moduleForm.nome}
                  onChange={(e) => setModuleForm({ ...moduleForm, nome: e.target.value })}
                  required
                />
              </div>
              {moduleForm.parent_id ? (
                <div className="space-y-1.5">
                  <Label htmlFor="modulo-grupo">Grupo (utilitário)</Label>
                  <Input
                    id="modulo-grupo"
                    value={moduleForm.grupo}
                    onChange={(e) => setModuleForm({ ...moduleForm, grupo: e.target.value })}
                    placeholder="Ex.: CADASTROS, ORÇAMENTO"
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="modulo-area">Área</Label>
                  <Input
                    id="modulo-area"
                    value={moduleForm.area}
                    onChange={(e) => setModuleForm({ ...moduleForm, area: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modulo-resp">Responsável</Label>
                  <Input
                    id="modulo-resp"
                    value={moduleForm.responsavel}
                    onChange={(e) => setModuleForm({ ...moduleForm, responsavel: e.target.value })}
                    placeholder="HPRO / CLIENTE"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModuleForm(null)}>
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
