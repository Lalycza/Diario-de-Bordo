import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Pencil, Plus, Search, FolderPlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lookupCnpj } from "@/lib/cnpj.functions";
import { formatDate } from "@/lib/status";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/cadastros/clientes")({
  head: () => ({
    meta: [
      { title: "Cadastro de clientes" },
      {
        name: "description",
        content:
          "Cadastro de clientes com busca automática pelo CNPJ, projetos vinculados e histórico de e-mails enviados.",
      },
      { property: "og:title", content: "Cadastro de clientes" },
      {
        property: "og:description",
        content: "Clientes, dados da Receita, projetos vinculados e e-mails enviados.",
      },
    ],
  }),
  component: ClientesPage,
});

type ClientForm = {
  id?: string;
  product_id: string;
  product_ids: string[];
  product_statuses: Record<string, "implantacao" | "suporte" | "consultoria">;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  situacao_cadastral: string;
  atividade_principal: string;
  observacoes: string;
};

const emptyClient: ClientForm = {
  product_id: "",
  product_ids: [],
  product_statuses: {},
  cnpj: "",
  razao_social: "",
  nome_fantasia: "",
  email: "",
  telefone: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  municipio: "",
  uf: "",
  cep: "",
  situacao_cadastral: "",
  atividade_principal: "",
  observacoes: "",
};

function ClientesPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const buscarCnpj = useServerFn(lookupCnpj);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  const abrirNovoProjeto = (clientId: string) => {
    window.location.href = "/projetos?client_id=" + encodeURIComponent(clientId);
  };

  const productsQuery = useQuery({
    queryKey: ["products-for-client"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const clientProductsQuery = useQuery({
    queryKey: ["client-products", detalhe],
    enabled: !!detalhe,
    queryFn: async () => {
      const { data, error } = await supabase.from("client_products").select("product_id, status").eq("client_id", detalhe!);
      if (error) throw error;
      return (data ?? []).map((row) => ({ product_id: row.product_id, status: row.status as "implantacao" | "suporte" | "consultoria" }));
    },
  });

  const clientProductsEditQuery = useQuery({
    queryKey: ["client-products-edit", form?.id],
    enabled: !!form?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("client_products").select("product_id, status").eq("client_id", form!.id!);
      if (error) throw error;
      return (data ?? []).map((row) => ({ product_id: row.product_id, status: row.status as "implantacao" | "suporte" | "consultoria" }));
    },
  });

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, cliente, client_id, data_inicio, previsao_conclusao, arquivado");
      if (error) throw error;
      return data;
    },
  });

  const emailsQuery = useQuery({
    queryKey: ["client-emails", detalhe],
    enabled: !!detalhe,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_emails")
        .select("*")
        .eq("client_id", detalhe!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const documentsQuery = useQuery({
    queryKey: ["client-documents", detalhe],
    enabled: !!detalhe,
    queryFn: async () => {
      const ids = (projectsQuery.data ?? [])
        .filter((p) => p.client_id === detalhe)
        .map((p) => p.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("project_documents")
        .select("id, nome, project_id, created_at")
        .in("project_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const consultar = useMutation({
    mutationFn: async (cnpj: string) => {
      const normalized = cnpj.replace(/\D/g, "");
      if (normalized.length !== 14) throw new Error("Informe um CNPJ com 14 dígitos.");
      return buscarCnpj({ data: { cnpj: normalized } });
    },
    onSuccess: (dados) => {
      setForm((current) => {
        if (!current) return current;
        const preserved = Object.fromEntries(
          Object.entries(dados).filter(([, value]) => value !== null && value !== undefined && value !== ""),
        );
        return { ...current, ...preserved, product_ids: current.product_ids, product_statuses: current.product_statuses };
      });
      toast.success("Dados da Receita carregados.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível consultar o CNPJ.");
      // A consulta falhou; o formulário permanece intacto.
    },
  });

  const saveClient = useMutation({
    mutationFn: async (values: ClientForm) => {
      const payload = {
        product_id: values.product_ids[0] || values.product_id || null,
        cnpj: values.cnpj.replace(/\D/g, "") || null,
        razao_social: values.razao_social,
        nome_fantasia: values.nome_fantasia || null,
        email: values.email || null,
        telefone: values.telefone || null,
        logradouro: values.logradouro || null,
        numero: values.numero || null,
        complemento: values.complemento || null,
        bairro: values.bairro || null,
        municipio: values.municipio || null,
        uf: values.uf || null,
        cep: values.cep || null,
        situacao_cadastral: values.situacao_cadastral || null,
        atividade_principal: values.atividade_principal || null,
        observacoes: values.observacoes || null,
      };
      if (values.id) {
        const { error: clearProductsError } = await supabase.from("client_products").delete().eq("client_id", values.id);
        if (clearProductsError) throw clearProductsError;
        if (values.product_ids.length > 0) {
          const { error: productLinksError } = await supabase.from("client_products").insert(
            values.product_ids.map((product_id) => ({ client_id: values.id!, product_id, status: values.product_statuses[product_id] ?? "implantacao" })),
          );
          if (productLinksError) throw productLinksError;
        }
        const { error } = await supabase.from("clients").update(payload).eq("id", values.id);
        if (error) throw error;
        return;
      }
      const { data: createdClient, error } = await supabase.from("clients").insert({ ...payload, created_by: user.id }).select("id").single();
      if (error) throw error;
      if (values.product_ids.length > 0 && createdClient) {
        const { error: productLinksError } = await supabase.from("client_products").insert(
          values.product_ids.map((product_id) => ({ client_id: createdClient.id, product_id, status: values.product_statuses[product_id] ?? "implantacao" })),
        );
        if (productLinksError) throw productLinksError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setForm(null);
      toast.success("Cliente salvo.");
    },
    onError: () => toast.error("Não foi possível salvar o cliente."),
  });

  useEffect(() => {
    if (!form?.id || !clientProductsEditQuery.data) return;
    const ids = clientProductsEditQuery.data.map((row) => row.product_id);
    const statuses = Object.fromEntries(clientProductsEditQuery.data.map((row) => [row.product_id, row.status]));
    if (JSON.stringify(form.product_ids) !== JSON.stringify(ids) || JSON.stringify(form.product_statuses) !== JSON.stringify(statuses)) {
      setForm({ ...form, product_ids: ids, product_statuses: statuses });
    }
  }, [clientProductsEditQuery.data, form]);

  const clientEmailsQuery = useQuery({
    queryKey: ["client-emails", form?.id],
    enabled: Boolean(form?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("project_emails").select("id,sent_at,recipients,subject,body,attachment_names,status").eq("client_id", form!.id!).order("sent_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const clients = clientsQuery.data ?? [];
  const clienteDetalhe = clients.find((c) => c.id === detalhe);
  const projetosDoCliente = (projectsQuery.data ?? []).filter((p) => {
    if (p.client_id === detalhe) return true;
    return !!clienteDetalhe && p.cliente?.trim().toLowerCase() === clienteDetalhe.razao_social?.trim().toLowerCase();
  });

  return (
    <AppShell userLabel={user.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Informe o CNPJ para trazer os dados da Receita automaticamente.
          </p>
        </div>
        <Button size="sm" onClick={() => setForm({ ...emptyClient })}>
          <Plus className="size-4" /> Novo cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum cliente cadastrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">CNPJ</th>
                <th className="px-4 py-2 text-left">Município</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">Projetos</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => setDetalhe(client.id)}
                    >
                      {client.razao_social}
                    </button>
                    {client.nome_fantasia ? (
                      <p className="text-xs text-muted-foreground">{client.nome_fantasia}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{client.cnpj ?? "—"}</td>
                  <td className="px-4 py-3">
                    {client.municipio ? `${client.municipio}/${client.uf ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">{client.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {(projectsQuery.data ?? []).filter((p) => p.client_id === client.id).length}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar cliente"
                      onClick={() =>
                        setForm({
                          id: client.id,
                          product_id: client.product_id ?? "",
                          product_ids: client.product_id ? [client.product_id] : [],
                          product_statuses: {},
                          cnpj: client.cnpj ?? "",
                          razao_social: client.razao_social,
                          nome_fantasia: client.nome_fantasia ?? "",
                          email: client.email ?? "",
                          telefone: client.telefone ?? "",
                          logradouro: client.logradouro ?? "",
                          numero: client.numero ?? "",
                          complemento: client.complemento ?? "",
                          bairro: client.bairro ?? "",
                          municipio: client.municipio ?? "",
                          uf: client.uf ?? "",
                          cep: client.cep ?? "",
                          situacao_cadastral: client.situacao_cadastral ?? "",
                          atividade_principal: client.atividade_principal ?? "",
                          observacoes: client.observacoes ?? "",
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={detalhe !== null} onOpenChange={(open) => !open && setDetalhe(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clienteDetalhe?.razao_social ?? "Cliente"}</DialogTitle>
            <DialogDescription>Cadastro, contatos, documentos e histórico de projetos deste cliente.</DialogDescription>
          </DialogHeader>
          {clienteDetalhe ? (
            <Tabs defaultValue="cadastro" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
                <TabsTrigger value="contato">Contato</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
                <TabsTrigger value="produtos">Produtos</TabsTrigger>
                <TabsTrigger value="projetos">Projetos/Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="cadastro" className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Razão social</Label><p className="text-sm">{clienteDetalhe.razao_social || "—"}</p></div>
                  <div><Label>Nome fantasia</Label><p className="text-sm">{clienteDetalhe.nome_fantasia || "—"}</p></div>
                  <div><Label>CNPJ</Label><p className="text-sm">{clienteDetalhe.cnpj || "—"}</p></div>
                  <div><Label>Município/UF</Label><p className="text-sm">{clienteDetalhe.municipio ? clienteDetalhe.municipio + "/" + (clienteDetalhe.uf ?? "") : "—"}</p></div>
                  <div><Label>Produto</Label><p className="text-sm">{(productsQuery.data ?? []).find((p) => p.id === clienteDetalhe.product_id)?.name ?? "Não definido"}</p></div>
                  <div><Label>Situação cadastral</Label><p className="text-sm">{clienteDetalhe.situacao_cadastral || "—"}</p></div>
                </div>
              </TabsContent>
              <TabsContent value="contato" className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>E-mail</Label><p className="text-sm">{clienteDetalhe.email || "—"}</p></div>
                  <div><Label>Telefone</Label><p className="text-sm">{clienteDetalhe.telefone || "—"}</p></div>
                  <div><Label>Endereço</Label><p className="text-sm">{[clienteDetalhe.logradouro, clienteDetalhe.numero, clienteDetalhe.complemento].filter(Boolean).join(", ") || "—"}</p></div>
                  <div><Label>Bairro / CEP</Label><p className="text-sm">{[clienteDetalhe.bairro, clienteDetalhe.cep].filter(Boolean).join(" · ") || "—"}</p></div>
                </div>
                {clienteDetalhe.observacoes ? <div><Label>Observações</Label><p className="text-sm whitespace-pre-wrap">{clienteDetalhe.observacoes}</p></div> : null}
              </TabsContent>
              <TabsContent value="documentos" className="mt-4 space-y-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Documentos vinculados aos projetos</p>
                  {(documentsQuery.data ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum documento anexado.</p> : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {(documentsQuery.data ?? []).map((doc) => <li key={doc.id} className="flex items-center justify-between gap-2 rounded-md border p-2"><Link to="/projeto/$projectId/documentos" params={{ projectId: doc.project_id }} className="hover:underline">{doc.nome}</Link><span className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</span></li>)}
                    </ul>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="produtos" className="mt-4 space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Produtos em andamento</p>
                  <p className="mt-1 text-xs text-muted-foreground">Um cliente pode ter vários produtos simultaneamente. Estes produtos ficam disponíveis como origem dos novos projetos.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(productsQuery.data ?? []).map((product) => {
                      const currentProduct = clientProductsQuery.data?.find((row) => row.product_id === product.id);
                      const checked = !!currentProduct;
                      return (
                        <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                          <input type="checkbox" checked={checked} onChange={async (e) => {
                            if (!detalhe) return;
                            const next = e.target.checked
                              ? [...new Set([...(clientProductsQuery.data ?? []).map((row) => row.product_id), product.id])]
                              : (clientProductsQuery.data ?? []).map((row) => row.product_id).filter((id) => id !== product.id);
                            const { error } = e.target.checked
                              ? await supabase.from("client_products").upsert({ client_id: detalhe, product_id: product.id, status: currentProduct?.status ?? "implantacao" }, { onConflict: "client_id,product_id" })
                              : await supabase.from("client_products").delete().eq("client_id", detalhe).eq("product_id", product.id);
                            if (error) { toast.error("Não foi possível atualizar os produtos."); return; }
                            queryClient.setQueryData(["client-products", detalhe], next.map((product_id) => ({ product_id, status: product_id === product.id ? (currentProduct?.status ?? "implantacao") : (clientProductsQuery.data?.find((row) => row.product_id === product_id)?.status ?? "implantacao") })));
                            queryClient.invalidateQueries({ queryKey: ["clients"] });
                          }} />
                          <span className="flex-1">{product.name}</span>
                          {checked ? (
                            <Select
                              value={currentProduct?.status ?? "implantacao"}
                              onValueChange={async (value: "implantacao" | "suporte" | "consultoria") => {
                                if (!detalhe) return;
                                const { error } = await supabase
                                  .from("client_products")
                                  .upsert(
                                    { client_id: detalhe, product_id: product.id, status: value },
                                    { onConflict: "client_id,product_id" },
                                  );
                                if (error) {
                                  toast.error("Não foi possível atualizar a situação do produto.");
                                  return;
                                }
                                queryClient.setQueryData(
                                  ["client-products", detalhe],
                                  (clientProductsQuery.data ?? []).map((row) =>
                                    row.product_id === product.id ? { ...row, status: value } : row,
                                  ),
                                );
                                queryClient.invalidateQueries({ queryKey: ["clients"] });
                              }}
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="implantacao">Em Implantação</SelectItem>
                                <SelectItem value="suporte">Em Suporte</SelectItem>
                                <SelectItem value="consultoria">Consultoria</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="projetos" className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-4">
                  <div><p className="font-medium">Projetos deste cliente</p><p className="text-xs text-muted-foreground">Crie um projeto já vinculado a este cliente e ao produto cadastrado.</p></div>
                  <Button type="button" onClick={() => abrirNovoProjeto(clienteDetalhe.id)}><FolderPlus className="size-4" /> Novo projeto</Button>
                </div>
                {projetosDoCliente.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><p className="text-sm text-muted-foreground">Nenhum projeto vinculado a este cliente.</p><Button type="button" className="mt-3" variant="outline" onClick={() => abrirNovoProjeto(clienteDetalhe.id)}>Criar o primeiro projeto</Button></div> : (
                  <div className="space-y-2">{projetosDoCliente.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><Link to="/projeto/$projectId/cronograma" params={{ projectId: p.id }} className="font-medium hover:underline">{p.cliente}</Link><p className="text-xs text-muted-foreground">{formatDate(p.data_inicio)} → {formatDate(p.previsao_conclusao)}</p></div><Button asChild type="button" variant="outline" size="sm"><Link to="/projeto/$projectId/cronograma" params={{ projectId: p.id }}><ExternalLink className="size-4" /> Abrir projeto</Link></Button></div>)}</div>
                )}
                <section className="rounded-lg border p-4"><div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Histórico de e-mails</h3></div>{(emailsQuery.data ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum e-mail registrado.</p> : <ul className="mt-3 space-y-2 text-sm">{(emailsQuery.data ?? []).map((mail) => <li key={mail.id} className="rounded-md border p-2"><p className="font-medium">{mail.assunto ?? mail.tipo ?? "E-mail"}</p><p className="text-xs text-muted-foreground">{mail.destinatario} · {formatDate(mail.created_at)}</p></li>)}</ul>}</section>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              Digite o CNPJ e use "Buscar na Receita" para preencher automaticamente.
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveClient.mutate(form);
              }}
            >
              <Tabs defaultValue="dados" className="w-full">
                <TabsList>
                  <TabsTrigger value="dados">Dados do cliente</TabsTrigger>
                  <TabsTrigger value="produto">Produto</TabsTrigger>
                  <TabsTrigger value="emails">E-mails</TabsTrigger>
                </TabsList>
                <TabsContent value="emails" className="space-y-3">
                  {clientEmailsQuery.data?.length ? clientEmailsQuery.data.map((email) => (
                    <article key={email.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{email.subject ?? "Sem assunto"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(email.sent_at)} · Para: {email.recipients ?? "—"}</p>
                      {email.body ? <p className="mt-2 whitespace-pre-wrap text-xs">{email.body}</p> : null}
                      {email.attachment_names ? <p className="mt-2 text-xs text-muted-foreground">Anexos: {email.attachment_names}</p> : null}
                    </article>
                  )) : <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nenhum e-mail enviado para este cliente.</div>}
                </TabsContent>
                <TabsContent value="dados" className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={consultar.isPending}
                  onClick={() => consultar.mutate(form.cnpj)}
                >
                  <Search className="size-4" />
                  {consultar.isPending ? "Buscando…" : "Buscar na Receita"}
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="razao">Razão social</Label>
                <Input
                  id="razao"
                  value={form.razao_social}
                  onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fantasia">Nome fantasia</Label>
                  <Input
                    id="fantasia"
                    value={form.nome_fantasia}
                    onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="situacao">Situação cadastral</Label>
                  <Input
                    id="situacao"
                    value={form.situacao_cadastral}
                    onChange={(e) => setForm({ ...form, situacao_cadastral: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cliente-email">E-mail</Label>
                  <Input
                    id="cliente-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="logradouro">Endereço</Label>
                  <Input
                    id="logradouro"
                    value={form.logradouro}
                    onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_80px]">
                <div className="space-y-1.5">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="municipio">Município</Label>
                  <Input
                    id="municipio"
                    value={form.municipio}
                    onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    maxLength={2}
                    value={form.uf}
                    onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="atividade">Atividade principal</Label>
                <Input
                  id="atividade"
                  value={form.atividade_principal}
                  onChange={(e) => setForm({ ...form, atividade_principal: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obs-cliente">Observações</Label>
                <Textarea
                  id="obs-cliente"
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
                </TabsContent>
                <TabsContent value="produto" className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">Produtos do cliente</p>
                    <p className="text-xs text-muted-foreground">Selecione os produtos que este cliente possui e informe a situação de cada um.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(productsQuery.data ?? []).map((product) => {
                        const checked = form.product_ids.includes(product.id);
                        const status = form.product_statuses[product.id] ?? "implantacao";
                        return (
                          <div key={product.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                            <input type="checkbox" checked={checked} onChange={(e) => setForm({
                              ...form,
                              product_ids: e.target.checked
                                ? [...new Set([...form.product_ids, product.id])]
                                : form.product_ids.filter((id) => id !== product.id),
                              product_statuses: e.target.checked
                                ? { ...form.product_statuses, [product.id]: form.product_statuses[product.id] ?? "implantacao" }
                                : Object.fromEntries(Object.entries(form.product_statuses).filter(([id]) => id !== product.id)),
                            })} />
                            <span className="flex-1">{product.name}</span>
                            {checked ? (
                              <Select value={status} onValueChange={(value: "implantacao" | "suporte" | "consultoria") => setForm({ ...form, product_statuses: { ...form.product_statuses, [product.id]: value } })}>
                                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="implantacao">Em Implantação</SelectItem>
                                  <SelectItem value="suporte">Em Suporte</SelectItem>
                                  <SelectItem value="consultoria">Consultoria</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="space-y-1.5">
                      <Label>Produto / sistema principal</Label>
                      <p className="text-xs text-muted-foreground">Este produto será levado automaticamente para novos projetos deste cliente.</p>
                      <Select value={form.product_id || undefined} onValueChange={(value) => setForm({ ...form, product_id: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={productsQuery.isLoading ? "Carregando produtos..." : "Selecione o produto / sistema"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(productsQuery.data ?? []).map((product) => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveClient.isPending}>
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
