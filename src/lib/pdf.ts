import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ReportSection = { title: string; question?: string; content: string; date?: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const CSS = `
.r{font-family:"IBM Plex Sans",Arial,sans-serif;color:#1f2430;font-size:11pt;line-height:1.5;padding:0 4mm}
.r .hd{border-bottom:3px solid #e2611b;padding-bottom:8px;margin-bottom:14px}
.r .brand{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:18pt;color:#e2611b}
.r .meta{color:#5b6070;font-size:9.5pt}
.r h1,.r h2,.r h3{font-family:Archivo,Arial,sans-serif;margin:12px 0 6px;page-break-after:avoid}
.r h1{font-size:15pt}.r h2{font-size:13pt}.r h3{font-size:11.5pt}
.r .sec{margin-top:18px}
.r .sec-t{font-family:Archivo,Arial,sans-serif;font-size:14pt;font-weight:700;border-left:4px solid #e2611b;padding-left:8px}
.r .q{color:#5b6070;font-style:italic;margin:4px 0 8px}
.r table{border-collapse:collapse;width:100%;margin:8px 0;font-size:9.5pt;page-break-inside:avoid}
.r th,.r td{border:1px solid #c9cbd2;padding:4px 6px;text-align:left;vertical-align:top}
.r th{background:#f1efe9}
.r ul,.r ol{padding-left:18px}
.r code{background:#f1efe9;padding:0 3px}
.r .docs{font-size:9.5pt;color:#3a3f4c}
.r .ft{margin-top:20px;border-top:1px solid #c9cbd2;padding-top:6px;color:#7a7f8c;font-size:8.5pt}
`;

export async function exportReportPdf(opts: {
  project: string;
  docs?: string[];
  sections: ReportSection[];
  fileName: string;
}) {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const body = opts.sections
    .map((s) => {
      const md = renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, s.content));
      return `<div class="sec"><div class="sec-t">${esc(s.title)}</div>${s.question ? `<div class="q">Demande : ${esc(s.question)}</div>` : ""}${s.date ? `<div class="meta">${esc(s.date)}</div>` : ""}${md}</div>`;
    })
    .join("");
  const docs = opts.docs?.length
    ? `<div class="docs"><strong>Documents analysés :</strong> ${opts.docs.map(esc).join(" · ")}</div>`
    : "";
  const html = `<style>${CSS}</style><div class="r"><div class="hd"><div class="brand">BATI DOC AI</div><div class="meta">Rapport — Projet : <strong>${esc(opts.project)}</strong> — ${date}</div></div>${docs}${body}<div class="ft">Rapport généré par l'Assistant IA de BATI DOC AI. Les résultats doivent être vérifiés par un professionnel qualifié.</div></div>`;

  const el = document.createElement("div");
  el.innerHTML = html;
  const html2pdf = (await import("html2pdf.js")).default;
  await html2pdf()
    .set({
      margin: [12, 10, 14, 10],
      filename: opts.fileName,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(el)
    .save();
}

export function pdfName(project: string, suffix: string) {
  const base = `${project}-${suffix}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 80);
  return `${base}-${new Date().toISOString().slice(0, 10)}.pdf`;
}
