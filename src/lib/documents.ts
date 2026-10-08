export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls,.txt,.csv";
export const MAX_SIZE = 15 * 1024 * 1024;

export function guessKind(name: string, text = ""): string {
  const s = (name + " " + text.slice(0, 3000)).toLowerCase();
  const rules: [RegExp, string][] = [
    [/plan|façade|facade|coupe|niveau|rdc|étage/, "Plan architectural"],
    [/devis|quotation/, "Devis"],
    [/facture|invoice/, "Facture"],
    [/cctp|cahier des clauses/, "CCTP"],
    [/dpgf|bpu|métré|metre|quantitatif/, "Métré / DPGF"],
    [/permis|autorisation|urbanisme/, "Permis / Urbanisme"],
    [/procès-verbal|proces-verbal|réception|\bpv\b/, "Procès-verbal"],
    [/contrat|marché|convention/, "Contrat"],
    [/note de calcul|béton|ferraillage|structure/, "Note de calcul"],
    [/rapport|compte rendu|compte-rendu/, "Rapport"],
  ];
  for (const [re, k] of rules) if (re.test(s)) return k;
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
    const text = wb.SheetNames.map((n) => `### Feuille ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n]!)}`).join("\n\n");
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
