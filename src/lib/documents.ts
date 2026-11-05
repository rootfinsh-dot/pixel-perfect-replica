export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls,.txt,.csv";
export const MAX_SIZE = 15 * 1024 * 1024;

export function guessKind(name: string, text = ""): string {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // Specific document labels outrank incidental construction vocabulary.
  const categories: [string, [string, number][]][] = [
    ["CCTP", [["cctp", 12], ["cahier des clauses techniques particulieres", 12], ["cahier des clauses", 8]]],
    ["Devis", [["devis", 10], ["quotation", 10]]],
    ["Facture", [["facture", 10], ["invoice", 10]]],
    ["Métré / DPGF", [["dpgf", 12], ["bpu", 12], ["metre", 8], ["quantitatif", 6]]],
    ["Permis / Urbanisme", [["permis", 10], ["autorisation", 8], ["urbanisme", 5]]],
    ["Procès-verbal", [["proces verbal", 12], ["pv", 10], ["reception", 3]]],
    ["Contrat", [["contrat", 10], ["marche", 6], ["convention", 8]]],
    ["Note de calcul", [["note de calcul", 12], ["beton", 2], ["ferraillage", 3], ["structure", 2]]],
    ["Rapport", [["rapport", 10], ["compte rendu", 12]]],
    ["Plan architectural", [["plan architectural", 12], ["plan", 4], ["facade", 3], ["coupe", 3], ["niveau", 1], ["rdc", 2], ["etage", 1]]],
  ];
  function classify(value: string) {
    const normalized = ` ${normalize(value)} `;
    const ranked = categories.map(([kind, terms]) => ({ kind, score: terms.reduce((sum, [term, weight]) => sum + (normalized.includes(` ${term} `) ? weight : 0), 0) }));
    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0];
    return best && best.score >= 3 ? best.kind : undefined;
  }
  const kind = classify(name.replace(/\.[^.]+$/, "")) ?? classify(text.slice(0, 3000));
  if (kind) return kind;
  if (/\.(png|jpe?g)$/i.test(name)) return "Image / Plan";
  if (/\.xlsx?$/i.test(name)) return "Tableur";
  return "Document";
}

export function mimeFor(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/.test(n)) return "image/jpeg";
  return file.type || "application/octet-stream";
}

/** Reads a file in the browser; returns its detected type and any extracted text. */
export async function analyseFile(file: File): Promise<{ kind: string; text: string | null }> {
  if (file.size > MAX_SIZE) throw new Error("Fichier trop volumineux (max 15 Mo).");
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || /\.(png|jpe?g)$/.test(lower)) return { kind: guessKind(file.name), text: null };
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value.trim()) throw new Error("Aucun texte lisible dans ce document.");
    return { kind: guessKind(file.name, value), text: value };
  }
  if (/\.xlsx?$/.test(lower)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const text = wb.SheetNames.map((n) => { const sheet = wb.Sheets[n]; return `### Feuille ${n}\n${sheet ? XLSX.utils.sheet_to_csv(sheet) : ""}`; }).join("\n\n");
    return { kind: guessKind(file.name, text), text };
  }
  if (/\.(txt|csv)$/.test(lower)) {
    const text = await file.text();
    return { kind: guessKind(file.name, text), text };
  }
  throw new Error("Format non pris en charge.");
}

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.onerror = () => ko(r.error);
    r.readAsDataURL(b);
  });

export function formatSize(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

export function safeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}
