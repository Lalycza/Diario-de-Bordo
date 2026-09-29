import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Pencil, Plus, Search } from "lucide-react";
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
    mutationFn: async (cnpj: string) => buscarCnpj({ data: { cnpj } }),
    onSuccess: (dados) => {
      setForm((current) => (current ? { ...current, ...dados } : current));
      toast.success("Dados da Receita carregados.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveClient = useMutation({
    mutationFn: async (values: ClientForm) => {
      const payload = {
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
        const { error } = await supabase.from("clients").update(payload).eq("id", values.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("clients").insert({ ...payload, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setForm(null);
      toast.success("Cliente salvo.");
    },
    onError: () => toast.error("Não foi possível salvar o cliente."),
  });

  const clients = clientsQuery.data ?? [];
  const clienteDetalhe = clients.find((c) => c.id === detalhe);
  const projetosDoCliente = (projectsQuery.data ?? []).filter((p) => p.client_id === detalhe);

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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{clienteDetalhe?.razao_social ?? "Cliente"}</DialogTitle>
            <DialogDescription>
              Projetos, documentos e e-mails registrados para este cliente.
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Projetos</h3>
            {projetosDoCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto vinculado.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {projetosDoCliente.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link
                      to="/projeto/$projectId/cronograma"
                      params={{ projectId: p.id }}
                      className="hover:underline"
                    >
                      {p.cliente}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(p.data_inicio)} → {formatDate(p.previsao_conclusao)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Documentos</h3>
            {(documentsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(documentsQuery.data ?? []).map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2">
                    <Link
                      to="/projeto/$projectId/documentos"
                      params={{ projectId: doc.project_id }}
                      className="hover:underline"
                    >
                      {doc.nome}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">E-mails registrados</h3>
            {(emailsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum e-mail registrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(emailsQuery.data ?? []).map((mail) => (
                  <li key={mail.id} className="rounded-md border p-2">
                    <p className="flex items-center gap-2 font-medium">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {mail.assunto ?? mail.tipo ?? "E-mail"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mail.destinatario} · {formatDate(mail.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </DialogContent>
      </Dialog>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
