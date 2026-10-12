import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { paginateReport, PDF_LAYOUT } from "./pdf-layout";

export type ReportSection = { title: string; question?: string | undefined; content: string; date?: string | undefined };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const CSS = `
/* Print-only tokens: this document cannot inherit the app's oklch palette. */
:root{--ink:#1f2430;--muted:#5b6070;--accent:#e2611b;--rule:#c9cbd2;--surface:#f3f4f6;--paper:#ffffff}
*{box-sizing:border-box}
body{margin:0;background:var(--paper)}
.r{font-family:Arial,Helvetica,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.5;width:${PDF_LAYOUT.widthPx}px;display:flow-root;overflow-wrap:anywhere}
.r p{margin:0 0 10px}
.r .meta{color:var(--muted);font-size:9pt}
.r h1,.r h2,.r h3,.r h4{margin:14px 0 7px;line-height:1.3;font-weight:700}
.r h1{font-size:15pt}.r h2{font-size:13pt}.r h3,.r h4{font-size:11.5pt}
.r .section-heading{margin:18px 0 12px;padding:0 0 0 10px;border-left:3px solid var(--accent)}
.r .sec-t{font-size:14pt;line-height:1.3;font-weight:700;margin-bottom:5px}
.r .q{color:var(--muted);font-size:9pt;margin:5px 0}
.r table{border-collapse:collapse;table-layout:fixed;width:100%;margin:8px 0 12px;font-size:9pt}
.r th,.r td{border:1px solid var(--rule);padding:6px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.r th{background:var(--surface);font-weight:700}
.r ul,.r ol{padding-left:22px;margin:0 0 5px}
.r li{padding-left:2px}.r li p{margin-bottom:4px}
.r code{background:var(--surface);padding:0 3px;font-size:9pt}
.r pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--surface);padding:10px;margin:8px 0}
.r blockquote{border-left:2px solid var(--rule);margin:8px 0;padding-left:12px;color:var(--muted)}
.r img{max-width:100%;height:auto;max-height:800px;object-fit:contain}
.r a{color:var(--ink);text-decoration:underline}
.r .docs{font-size:9pt;color:var(--muted);margin:0 0 16px}
.r .ft{margin-top:20px;border-top:1px solid var(--rule);padding-top:8px;color:var(--muted);font-size:8pt}
.pdf-page>:first-child{margin-top:0}.pdf-page>:last-child{margin-bottom:0}
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
      return `<div class="section-heading"><div class="sec-t">${esc(s.title)}</div>${s.question && s.question.trim() !== s.title.trim() ? `<div class="q">Demande : ${esc(s.question)}</div>` : ""}${s.date ? `<div class="meta">${esc(s.date)}</div>` : ""}</div>${md}`;
    })
    .join("");
  const docs = opts.docs?.length
    ? `<div class="docs"><strong>Documents analysés :</strong> ${opts.docs.map(esc).join(" · ")}</div>`
    : "";
   const html = `<style>${CSS}</style><div class="r" id="source"><h1>Rapport — ${esc(opts.project)}</h1><p class="meta">${date}</p>${docs}${body}<div class="ft">Rapport généré par l'Assistant IA de BATI DOC AI. Les résultats doivent être vérifiés par un professionnel qualifié.</div></div>`;

  // Render in an isolated iframe: the app's stylesheet uses oklch() colors,
  // which the PDF renderer cannot parse.
  const WIDTH = PDF_LAYOUT.widthPx;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;height:1123px;border:0;`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error("Le document PDF n'a pas pu être préparé.");
    doc.open();
    doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body>${html}</body></html>`);
    doc.close();
    await doc.fonts?.ready;
    const source = doc.getElementById("source");
    if (!source) throw new Error("Le contenu du rapport est introuvable.");
    const contentWidth = PDF_LAYOUT.pageWidthMm - PDF_LAYOUT.marginMm * 2;
    const contentHeight = PDF_LAYOUT.contentBottomMm - PDF_LAYOUT.contentTopMm;
    const pages = paginateReport(source, contentHeight * WIDTH / contentWidth);
    source.remove();
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    for (const [index, root] of pages.entries()) {
      const canvas = await html2canvas(root, { scale: 2, backgroundColor: "#ffffff", windowWidth: WIDTH, useCORS: true });
      if (index > 0) pdf.addPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(226, 97, 27);
      pdf.text("BATI DOC AI", PDF_LAYOUT.marginMm, 18);
      pdf.setDrawColor(201, 203, 210);
      pdf.line(PDF_LAYOUT.marginMm, 22, PDF_LAYOUT.pageWidthMm - PDF_LAYOUT.marginMm, 22);
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", PDF_LAYOUT.marginMm, PDF_LAYOUT.contentTopMm, contentWidth, Math.min(contentHeight, canvas.height / canvas.width * contentWidth));
      pdf.line(PDF_LAYOUT.marginMm, 283, PDF_LAYOUT.pageWidthMm - PDF_LAYOUT.marginMm, 283);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text("BATI DOC AI — Rapport de projet", PDF_LAYOUT.marginMm, 289);
      pdf.text(`Page ${index + 1} / ${pages.length}`, PDF_LAYOUT.pageWidthMm - PDF_LAYOUT.marginMm, 289, { align: "right" });
    }
    pdf.save(opts.fileName);
  } finally {
    frame.remove();
  }
}

export function pdfName(project: string, suffix: string) {
  const base = `${project}-${suffix}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 80);
  return `${base}-${new Date().toISOString().slice(0, 10)}.pdf`;
}
