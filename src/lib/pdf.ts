import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ReportSection = { title: string; question?: string | undefined; content: string; date?: string | undefined };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const CSS = `
.r{font-family:Arial,Helvetica,sans-serif;color:#1f2430;font-size:11pt;line-height:1.5}
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

  // Render in an isolated iframe: the app's stylesheet uses oklch() colors,
  // which the PDF renderer cannot parse.
  const WIDTH = 794; // A4 width at 96 dpi
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;height:1123px;border:0;`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body style="margin:0;background:#fff"><div style="width:${WIDTH}px;padding:40px 36px;box-sizing:border-box">${html}</div></body></html>`);
    doc.close();
    await doc.fonts?.ready;
    const root = doc.body.firstElementChild as HTMLElement;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const canvas = await html2canvas(root, { scale: 2, backgroundColor: "#ffffff", windowWidth: WIDTH, useCORS: true });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = 210, pageH = 297;
    const pxPerMm = canvas.width / pageW;
    const pagePx = Math.floor(pageH * pxPerMm);
    const ctx = canvas.getContext("2d")!;
    for (let y = 0, page = 0; y < canvas.height; y += pagePx, page++) {
      // avoid cutting through a line of text: move the cut up to the nearest blank row
      let h = Math.min(pagePx, canvas.height - y);
      if (y + h < canvas.height) {
        for (let k = 0; k < 120; k++) {
          const row = ctx.getImageData(0, y + h - k, canvas.width, 1).data;
          let blank = true;
          for (let i = 0; i < row.length; i += 16) if (row[i]! < 245) { blank = false; break; }
          if (blank) { h -= k; break; }
        }
      }
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = h;
      slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, h / pxPerMm);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`Page ${page + 1}`, pageW - 20, pageH - 6);
      y = y - pagePx + h;
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
