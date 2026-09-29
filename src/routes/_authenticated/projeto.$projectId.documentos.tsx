import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/status";
import { useProject } from "@/lib/useProject";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/projeto/$projectId/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos do projeto" },
      {
        name: "description",
        content:
          "Anexe e baixe os documentos da implantação: contratos, atas, planilhas e evidências de homologação.",
      },
      { property: "og:title", content: "Documentos do projeto" },
      {
        property: "og:description",
        content: "Documentação do projeto disponível para o analista responsável e a gerência.",
      },
    ],
  }),
  component: DocumentosPage,
});

function tamanho(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentosPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const project = useProject(projectId);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [descricao, setDescricao] = useState("");

  const documentsQuery = useQuery({
    queryKey: ["documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const path = `${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upError } = await supabase.storage
        .from("project-documents")
        .upload(path, file, { upsert: false });
      if (upError) throw upError;

      const { error } = await supabase.from("project_documents").insert({
        project_id: projectId,
        nome: file.name,
        descricao: descricao || null,
        storage_path: path,
        mime_type: file.type || null,
        tamanho: file.size,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
      setDescricao("");
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Documento anexado.");
    },
    onError: () => toast.error("Não foi possível anexar o documento."),
  });

  const remover = useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("project-documents").remove([doc.storage_path]);
      const { error } = await supabase.from("project_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", projectId] }),
    onError: () => toast.error("Não foi possível excluir o documento."),
  });

  async function baixar(storagePath: string) {
    const { data, error } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      toast.error("Não foi possível gerar o link de download.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const docs = documentsQuery.data ?? [];

  return (
    <AppShell userLabel={user.email}>
      <ProjectHeader
        projectId={projectId}
        cliente={project.data?.cliente ?? "Projeto"}
        subtitle={project.data?.descricao}
      />

      <div className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Anexar documento</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="arquivo">Arquivo</Label>
            <Input id="arquivo" type="file" ref={inputRef} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descricao-doc">Descrição (opcional)</Label>
            <Input
              id="descricao-doc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ata de reunião, contrato, evidência…"
            />
          </div>
          <Button
            disabled={upload.isPending}
            onClick={() => {
              const file = inputRef.current?.files?.[0];
              if (!file) {
                toast.error("Escolha um arquivo.");
                return;
              }
              upload.mutate(file);
            }}
          >
            <Upload className="size-4" />
            {upload.isPending ? "Enviando…" : "Anexar"}
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum documento anexado a este projeto.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Documento</th>
                <th className="px-4 py-2 text-left">Tamanho</th>
                <th className="px-4 py-2 text-left">Anexado em</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-medium">
                      <FileText className="size-4 text-muted-foreground" />
                      {doc.nome}
                    </p>
                    {doc.descricao ? (
                      <p className="text-xs text-muted-foreground">{doc.descricao}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{tamanho(doc.tamanho)}</td>
                  <td className="px-4 py-3">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Baixar documento"
                      onClick={() => baixar(doc.storage_path)}
                    >
                      <Download className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir documento"
                      onClick={() =>
                        remover.mutate({ id: doc.id, storage_path: doc.storage_path })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
