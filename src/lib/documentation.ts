import { supabase } from "@/integrations/supabase/client";

export type DocumentationType = "mapa" | "cronograma" | "diario";

export async function registerDocumentationUpdate(projectId: string, documentType: DocumentationType) {
  const { data: current, error: readError } = await supabase
    .from("project_documentation_status")
    .select("version")
    .eq("project_id", projectId)
    .eq("document_type", documentType)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = await supabase.from("project_documentation_status").upsert(
    {
      project_id: projectId,
      document_type: documentType,
      version: (current?.version ?? 0) + 1,
      updated_at: new Date().toISOString(),
      sent_at: null,
      sent_email_id: null,
    },
    { onConflict: "project_id,document_type" },
  );
  if (error) throw error;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("documentation:updated", { detail: { projectId, documentType } }));
  }
}
