import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

type DocType = "mapa" | "cronograma" | "diario";
const DOC_LABEL: Record<DocType, string> = { mapa: "Mapa de treinamentos", cronograma: "Cronograma", diario: "Diário de bordo" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function wrap(text: string, max = 92) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = []; let line = "";
  for (const word of words) { if (!line) line = word; else if ((line + " " + word).length <= max) line += " " + word; else { lines.push(line); line = word; } }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
function base64(bytes: Uint8Array) {
  let binary = ""; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
async function makePdf(title: string, projectName: string, sections: Array<[string, string[]]>) {
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 800;
  const newPage = () => { page = pdf.addPage([595, 842]); y = 800; };
  const line = (text: string, size = 10, isBold = false) => {
    for (const row of wrap(text, 88)) { if (y < 48) newPage(); page.drawText(row, { x: 42, y, size, font: isBold ? bold : font, color: rgb(0.12, 0.16, 0.22) }); y -= size + 5; }
  };
  line("HPro — Diário de Bordo", 11, true); y -= 4; line(title, 17, true); line(projectName, 10); y -= 12;
  for (const [heading, rows] of sections) { if (y < 90) newPage(); line(heading, 11, true); y -= 2; for (const row of rows) line("• " + row, 9); y -= 7; }
  return await pdf.save();
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  const auth = req.headers.get("Authorization"); if (!auth) return json({ ok: false, message: "Sessão não informada." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: authData, error: authError } = await supabase.auth.getUser(); if (authError || !authData.user) return json({ ok: false, message: "Sessão inválida." }, 401);

  const input = await req.json().catch(() => ({}));
  const projectId = String(input.projectId || "");
  const documentTypes = (Array.isArray(input.documentTypes) ? input.documentTypes : []) as DocType[];
  const contactIds = Array.isArray(input.contactIds) ? input.contactIds.map(String) : [];
  const subject = String(input.subject || "").trim(); const textBody = String(input.body || "").trim();
  if (!projectId || !documentTypes.length || !contactIds.length) return json({ ok: false, message: "Projeto, documentos e contatos são obrigatórios." }, 400);
  if (documentTypes.some((x) => !["mapa", "cronograma", "diario"].includes(x))) return json({ ok: false, message: "Documentação inválida." }, 400);

  const { data: project, error: projectError } = await supabase.from("projects").select("id,name,cliente,client_id,descricao,analista").eq("id", projectId).single();
  if (projectError || !project) return json({ ok: false, message: "Projeto não encontrado ou sem acesso." }, 404);
  const { data: contacts, error: contactsError } = await supabase.from("client_contacts").select("id,name,email").eq("client_id", project.client_id).in("id", contactIds).not("email", "is", null);
  if (contactsError || !contacts?.length) return json({ ok: false, message: "Nenhum contato válido com e-mail foi selecionado." }, 400);

  const attachments: Array<{ filename: string; content: string }> = []; const metadata: Array<{ type: DocType; filename: string }> = [];
  for (const type of [...new Set(documentTypes)]) {
    let pdf: Uint8Array;
    if (type === "mapa") {
      const { data } = await supabase.from("trainings").select("planned_date,training_start_date,training_completion_date,homologation_date,homologation_responsible,status,modules(name),submodules(name)").eq("project_id", projectId).order("planned_date");
      const rows = (data ?? []).map((r: any) => [r.modules?.name ?? "Módulo", r.submodules?.name ? " / " + r.submodules.name : "", "previsto: " + (r.planned_date ?? "—"), "início: " + (r.training_start_date ?? "—"), "conclusão: " + (r.training_completion_date ?? "—"), "homologação: " + (r.homologation_date ?? "—"), r.status ?? "Pendente"].join(""));
      pdf = await makePdf(DOC_LABEL[type], project.cliente ?? project.name, [["Treinamentos", rows.length ? rows : ["Nenhum treinamento registrado."]]]);
    } else if (type === "cronograma") {
      const { data } = await supabase.from("project_stages").select("nome,modulo,data_inicio,data_prevista,data_conclusao,status,pauta_semana").eq("project_id", projectId).order("data_prevista");
      const rows = (data ?? []).map((r: any) => (r.modulo ? r.modulo + " — " : "") + r.nome + " — previsto: " + (r.data_prevista ?? "—") + " — conclusão: " + (r.data_conclusao ?? "—") + " — status: " + (r.status ?? "—") + (r.pauta_semana ? " — pauta da semana" : ""));
      pdf = await makePdf(DOC_LABEL[type], project.cliente ?? project.name, [["Etapas", rows.length ? rows : ["Nenhuma etapa registrada."]]]);
    } else {
      const { data } = await supabase.from("log_entries").select("data_reuniao,hora_reuniao,participantes,pauta,tarefa_cliente,tarefa_hpro,proximo_treinamento,observacoes").eq("project_id", projectId).order("data_reuniao", { ascending: false });
      const rows = (data ?? []).flatMap((r: any) => [
        (r.data_reuniao ?? "—") + " " + (r.hora_reuniao ?? "") + " — participantes: " + (r.participantes ?? "—"),
        "Pauta: " + (r.pauta ?? "—"),
        "Tarefa cliente: " + (r.tarefa_cliente ?? "—") + " | Tarefa HPro: " + (r.tarefa_hpro ?? "—"),
        "Próximo treinamento: " + (r.proximo_treinamento ?? "—"),
        "Observações: " + (r.observacoes ?? "—"),
      ]);
      pdf = await makePdf(DOC_LABEL[type], project.cliente ?? project.name, [["Registros", rows.length ? rows : ["Nenhum registro de diário."]]]);
    }
    const filename = type + "-" + String(project.cliente ?? project.name).replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".pdf";
    attachments.push({ filename, content: base64(pdf) }); metadata.push({ type, filename });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY"); const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !from) return json({ ok: false, message: "Envio ainda não configurado. Cadastre RESEND_API_KEY e RESEND_FROM_EMAIL nos secrets do Supabase." }, 503);
  const to = contacts.map((c) => c.email).filter(Boolean);
  const finalSubject = subject || "Documentação da implantação — " + (project.cliente ?? project.name);
  const html = "<div style=\"font-family:Arial,sans-serif;color:#182236\"><p>" + (textBody || "Olá! Segue a documentação atualizada da implantação para acompanhamento.").replace(/\n/g, "<br>") + "</p><p><strong>Documentações anexadas:</strong> " + metadata.map((x) => DOC_LABEL[x.type]).join(", ") + "</p></div>";
  const resendResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject: finalSubject, html, attachments, tags: [{ name: "project_id", value: projectId }, { name: "type", value: "implantacao_documentacao" }] }) });
  const resendData = await resendResponse.json().catch(() => ({})); const now = new Date().toISOString();

  const { data: emailRow } = await supabase.from("project_emails").insert({
    project_id: projectId, client_id: project.client_id, sent_at: now, recipients: to.join(", "), subject: finalSubject,
    body: textBody || "Olá! Segue a documentação atualizada da implantação para acompanhamento.",
    attachment_names: metadata.map((x) => x.filename).join(", "), attachment_metadata: metadata, document_types: metadata.map((x) => x.type),
    sent_by: authData.user.id, status: resendResponse.ok ? "enviado" : "falhou", provider_message_id: resendData?.id ?? null,
    error_message: resendResponse.ok ? null : String(resendData?.message || "Falha no provedor de e-mail."),
  }).select("id").single();

  if (!resendResponse.ok) return json({ ok: false, message: String(resendData?.message || "O provedor recusou o envio."), emailId: emailRow?.id ?? null }, 502);
  for (const type of [...new Set(documentTypes)]) await supabase.from("project_documentation_status").update({ sent_at: now, sent_email_id: emailRow?.id ?? null }).eq("project_id", projectId).eq("document_type", type);
  return json({ ok: true, emailId: emailRow?.id ?? null, recipients: to, attachments: metadata.map((x) => x.filename) });
});
