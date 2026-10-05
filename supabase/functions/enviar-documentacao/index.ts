import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PDFTextField } from "npm:pdf-lib@1.17.1";

type DocType = "mapa" | "cronograma" | "diario";
const TEMPLATE_URL: Record<DocType, string> = {
  cronograma: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Cronograma%20.pdf",
  mapa: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Mapa.pdf",
  diario: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Diario.pdf",
};
const DOC_LABEL: Record<DocType, string> = {
  mapa: "Mapa de treinamentos",
  cronograma: "Cronograma",
  diario: "Diário de bordo",
};
const STATUS_STYLE: Record<string, { fill: ReturnType<typeof rgb>; text: ReturnType<typeof rgb> }> = {
  Pendente: { fill: rgb(0.96,0.86,0.86), text: rgb(0.72,0.10,0.10) },
  "Em andamento": { fill: rgb(1,0.94,0.75), text: rgb(0.55,0.38,0.00) },
  Replanejada: { fill: rgb(0.85,0.92,1), text: rgb(0.05,0.35,0.70) },
  Replanejado: { fill: rgb(0.85,0.92,1), text: rgb(0.05,0.35,0.70) },
  Concluída: { fill: rgb(0.85,0.95,0.87), text: rgb(0.10,0.50,0.20) },
  Concluído: { fill: rgb(0.85,0.95,0.87), text: rgb(0.10,0.50,0.20) },
  Homologada: { fill: rgb(0.92,0.87,0.98), text: rgb(0.45,0.20,0.65) },
  Homologado: { fill: rgb(0.92,0.87,0.98), text: rgb(0.45,0.20,0.65) },
  Atrasada: { fill: rgb(0.96,0.82,0.82), text: rgb(0.72,0.08,0.08) },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const dateBR = (v: unknown) => {
  if (!v) return "—";
  const s = String(v).slice(0,10);
  const [y,m,d] = s.split("-");
  return y && m && d ? \`\${d}/\${m}/\${y}\` : String(v);
};
const statusLabel = (v: unknown) => {
  const s = clean(v);
  const map: Record<string,string> = {
    nao_iniciada:"Pendente", em_andamento:"Em andamento", concluida:"Concluída",
    homologada:"Homologada", replanejada:"Replanejada", atrasada:"Atrasada",
    em_risco:"Atrasada", pendente:"Pendente"
  };
  return map[s] ?? s ?? "Pendente";
};
const wrap = (text: string, max = 88) => {
  const words = clean(text).split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if ((line + " " + w).length <= max) line += " " + w;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
};
const b64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i=0; i<bytes.length; i+=0x8000) s += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(s);
};

async function loadTemplate(type: DocType) {
  const r = await fetch(TEMPLATE_URL[type]);
  if (!r.ok) throw new Error(\`Não foi possível carregar o modelo de \${DOC_LABEL[type]} (\${r.status}).\`);
  return PDFDocument.load(new Uint8Array(await r.arrayBuffer()));
}

function normalizeFieldName(v: string) {
  return v.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
}

function tryFillForm(doc: PDFDocument, values: Record<string,string>) {
  try {
    const form = doc.getForm();
    const fields = form.getFields();
    if (!fields.length) return 0;
    let filled = 0;
    for (const field of fields) {
      if (!(field instanceof PDFTextField)) continue;
      const name = normalizeFieldName(field.getName());
      const hit = Object.entries(values).find(([key]) => name.includes(normalizeFieldName(key)));
      if (!hit) continue;
      try { field.setText(hit[1]); filled++; } catch {}
    }
    if (filled) form.updateFieldAppearances();
    return filled;
  } catch { return 0; }
}

async function makePdf(type: DocType, project: any, rows: any[]) {
  const template = await loadTemplate(type);
  const output = await PDFDocument.create();
  const templateIndices = template.getPageIndices();
  const copied = await output.copyPages(template, templateIndices);
  copied.forEach(p => output.addPage(p));
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);

  const formValues: Record<string,string> = {
    projeto: clean(project.name || project.cliente),
    cliente: clean(project.cliente),
    analista: clean(project.analista),
  };
  rows.slice(0,30).forEach((r,i) => {
    formValues[\`registro\${i+1}\`] = clean(r.text || r.name || "");
  });
  tryFillForm(output, formValues);

  let pageIndex = 0;
  let page = output.getPage(pageIndex);
  const { width, height } = page.getSize();
  let y = Math.min(height - 155, 690);
  const left = 38;
  const right = width - 38;
  const rowH = type === "diario" ? 70 : 25;

  const newTemplatePage = () => {
    const p = templateIndices.length ? templateIndices[0] : 0;
    const [newPage] = [output.addPage()];
    const sourcePage = template.getPage(p);
    // Copying the source page into the output preserves the model artwork/colors.
    // pdf-lib cannot directly paint a page onto another page, so use the copied page
    // already present when possible; overflow uses a copied template page.
    return newPage;
  };

  // If the template contains actual form fields, the original appearance remains
  // the source of truth. We still overlay dynamic rows only when there are rows.
  const drawText = (txt:string, x:number, yy:number, size=8, isBold=false, color=rgb(0.12,0.16,0.22)) => {
    page.drawText(clean(txt), { x, y:yy, size, font:isBold?bold:font, color });
  };
  const drawStatus = (txt:string, x:number, yy:number, maxW=82) => {
    const st = STATUS_STYLE[txt] || { fill: rgb(0.93,0.93,0.93), text: rgb(0.20,0.20,0.20) };
    const w = Math.min(maxW, Math.max(48, txt.length * 4.3 + 14));
    page.drawRectangle({ x, y:yy-4, width:w, height:16, color:st.fill, borderColor:st.text, borderWidth:0.5 });
    drawText(txt, x+5, yy, 6.5, true, st.text);
    return w;
  };

  if (type === "diario") {
    // Keep the model's header/artwork untouched. Entries start below it and use
    // the model's editorial wording as the field labels.
    const labels = ["DATA DA REUNIÃO","HORÁRIO","ANALISTA IMPLANTADOR","PARTICIPANTES","PAUTA DO DIA","TAREFA CLIENTE","TAREFA HPRO","PRÓXIMO TREINAMENTO","OBSERVAÇÕES / OCORRÊNCIAS"];
    for (const r of rows) {
      if (y < 95) {
        page = output.addPage([width,height]);
        y = height - 155;
      }
      page.drawRectangle({ x:left, y:y-rowH+8, width:right-left, height:rowH, color:rgb(1,1,1), opacity:0.90, borderColor:rgb(0.75,0.78,0.82), borderWidth:0.6 });
      drawText(labels[0], left+8, y-6, 6.5, true);
      drawText(dateBR(r.data_reuniao), left+8, y-17, 8);
      drawText(labels[1], left+88, y-6, 6.5, true);
      drawText(clean(r.hora_reuniao || "—"), left+88, y-17, 8);
      drawText(labels[2], left+155, y-6, 6.5, true);
      drawText(clean(r.analista || project.analista || "—"), left+155, y-17, 8);
      drawText(labels[3], left+8, y-34, 6.5, true);
      drawText(wrap(clean(r.participantes || "—"), 105)[0], left+8, y-45, 7.5);
      drawText(labels[4], left+8, y-57, 6.5, true);
      drawText(wrap(clean(r.pauta || "—"), 105)[0], left+8, y-68, 7.5);
      y -= rowH + 10;
    }
  } else {
    // Mapa/Cronograma: retain the template as the page background and use the
    // application's predefined status palette for every dynamic status.
    drawText(clean(project.cliente || project.name || "Projeto"), left, y+24, 10, true);
    drawText(clean(project.name || ""), left, y+10, 8);
    y -= 4;
    const headers = type === "mapa"
      ? ["MÓDULO / SUBMÓDULO","PREVISÃO","INÍCIO","CONCLUSÃO","HOMOLOGAÇÃO","STATUS"]
      : ["ETAPA / MÓDULO","INÍCIO","PREVISTO","CONCLUSÃO","STATUS"];
    drawText(headers.join("    "), left, y, 6.5, true);
    y -= 17;
    for (const r of rows) {
      if (y < 60) {
        page = output.addPage([width,height]);
        y = height - 155;
      }
      const cols = type === "mapa"
        ? [clean(r.name), dateBR(r.planned_date), dateBR(r.start), dateBR(r.completion), dateBR(r.homologation)]
        : [clean(r.name), dateBR(r.start), dateBR(r.planned_date), dateBR(r.completion)];
      drawText(wrap(cols[0], 34)[0], left, y, 7);
      let x = type === "mapa" ? left+190 : left+265;
      for (let i=1;i<cols.length;i++) { drawText(cols[i], x, y, 6.5); x += type === "mapa" ? 65 : 72; }
      drawStatus(statusLabel(r.status), type === "mapa" ? right-80 : right-82, y-1, 78);
      y -= 23;
    }
  }

  return await output.save();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok:false, message:"Método não permitido." },405);
  try {
    const body = await req.json();
    const projectId = clean(body.projectId);
    const documentTypes = (Array.isArray(body.documentTypes) ? body.documentTypes : []).filter((x:string): x is DocType => ["mapa","cronograma","diario"].includes(x));
    const contactIds = Array.isArray(body.contactIds) ? body.contactIds.map(clean).filter(Boolean) : [];
    if (!projectId || !documentTypes.length || !contactIds.length) return json({ok:false,message:"Projeto, documentos e contatos são obrigatórios."},400);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization:authHeader } }});
    const { data:{ user }, error:userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ok:false,message:"Sessão inválida."},401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: project, error: projectError } = await admin.from("projects").select("*").eq("id",projectId).single();
    if (projectError || !project) return json({ok:false,message:"Projeto não encontrado."},404);

    const { data: contacts, error: contactsError } = await admin.from("client_contacts").select("id,name,email,is_project_responsible,client_id").in("id",contactIds).eq("client_id",project.client_id).not("email","is",null);
    if (contactsError || !contacts?.length) return json({ok:false,message:"Nenhum contato válido foi encontrado para o cliente."},400);
    const recipients = contacts.map(c=>c.email).filter(Boolean);

    const { data: trainings } = await admin.from("trainings").select("*,module:modules!trainings_module_id_fkey(name),submodule:submodules!trainings_submodule_id_fkey(name)").eq("project_id",projectId).order("planned_date",{ascending:true});
    const { data: stages } = await admin.from("project_stages").select("*").eq("project_id",projectId).order("data_prevista",{ascending:true});
    const { data: logs } = await admin.from("log_entries").select("*").eq("project_id",projectId).order("data_reuniao",{ascending:false});

    const attachments:any[] = [];
    for (const type of documentTypes) {
      const sourceRows = type === "diario" ? (logs||[]) :
        type === "cronograma" ? (stages||[]).map(s=>({ ...s, status: statusLabel(s.status), name:s.nome, planned_date:s.data_prevista, start:s.data_inicio, completion:s.data_conclusao })) :
        (trainings||[]).map(t=>({ ...t, name: clean(t.submodule?.name || t.module?.name), status: statusLabel(t.status), start:t.training_start_date||t.realization_date, completion:t.training_completion_date, homologation:t.homologation_date }));
      const pdf = await makePdf(type, project, sourceRows);
      attachments.push({ filename:\`\${type}-\${project.name || "projeto"}.pdf\`, content:b64(pdf) });
    }

    const subject = clean(body.subject) || \`Atualização da implantação — \${project.cliente || project.name || "Projeto"}\`;
    const emailBody = clean(body.body) || "Olá!\\n\\nSegue a documentação atualizada da implantação para acompanhamento.\\n\\nAtenciosamente,\\nEquipe HPro";
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    if (!apiKey || !from) return json({ok:false,message:"Configuração de e-mail incompleta: RESEND_API_KEY/RESEND_FROM_EMAIL."},500);

    const now = new Date().toISOString();
    const { data: emailRow, error: emailInsertError } = await admin.from("project_emails").insert({
      project_id:projectId, client_id:project.client_id, sent_at:now, recipients:recipients.join(", "), subject,
      body:emailBody, attachment_names:attachments.map(a=>a.filename).join(", "), sent_by:user.id,
      status:"sending", document_types:documentTypes, attachment_metadata:attachments.map(a=>({filename:a.filename}))
    }).select("id").single();
    if (emailInsertError) throw emailInsertError;

    const resend = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{"Authorization":\`Bearer \${apiKey}\`,"Content-Type":"application/json"},
      body:JSON.stringify({from,to:recipients,subject, text:emailBody, attachments})
    });
    const resendJson = await resend.json().catch(()=>({}));
    if (!resend.ok) {
      await admin.from("project_emails").update({status:"error",error_message:JSON.stringify(resendJson),sent_at:new Date().toISOString()}).eq("id",emailRow.id);
      return json({ok:false,message:"O provedor de e-mail recusou o envio.",error:resendJson},502);
    }

    await admin.from("project_emails").update({status:"sent",provider_message_id:resendJson?.id ?? null}).eq("id",emailRow.id);
    for (const type of documentTypes) {
      await admin.from("project_documentation_status").update({sent_at:now,sent_email_id:emailRow.id}).eq("project_id",projectId).eq("document_type",type);
    }
    return json({ok:true,emailId:emailRow.id,attachments:attachments.map(a=>a.filename)});
  } catch (e) {
    return json({ok:false,message:e instanceof Error ? e.message : "Falha ao gerar/enviar a documentação."},500);
  }
});
