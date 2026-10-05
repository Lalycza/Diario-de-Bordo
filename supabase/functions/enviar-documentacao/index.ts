import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const TEMPLATE_URL: Record<DocType, string> = {
  cronograma: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Cronograma%20.pdf",
  mapa: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Mapa.pdf",
  diario: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Diario.pdf",
};

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
async function makePdf(type: DocType, projectName: string, sections: Array<[string, string[]]>) {
  const templateResponse = await fetch(TEMPLATE_URL[type]);
  if (!templateResponse.ok) throw new Error(`Não foi possível carregar o modelo de ${DOC_LABEL[type]} (${templateResponse.status}).`);
  const templateBytes = new Uint8Array(await templateResponse.arrayBuffer());
  const template = await PDFDocument.load(templateBytes);
  const output = await PDFDocument.create();
  const copiedPages = await output.copyPages(template, template.getPageIndices());
  for (const page of copiedPages) output.addPage(page);

  // Mantém o PDF original como base visual. Os dados dinâmicos ficam em páginas
  // adicionais até que as coordenadas dos campos do modelo sejam calibradas.
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  let page = output.addPage([595, 842]);
  let y = 800;
  const newPage = () => { page = output.addPage([595, 842]); y = 800; };
  const line = (text: string, size = 10, isBold = false) => {
    for (const row of wrap(text, 88)) {
      if (y < 48) newPage();
      page.drawText(row, { x: 42, y, size, font: isBold ? bold : font, color: rgb(0.12, 0.16, 0.22) });
      y -= size + 5;
    }
  };
  line(DOC_LABEL[type], 17, true);
  line(projectName, 10);
  y -= 12;
  for (const [heading, rows] of sections) {
    if (y < 90) newPage();
    line(heading, 11, true);
    y -= 2;
    for (const row of rows) line("• " + row, 9);
    y -= 7;
  }
  return await output.save();
}
