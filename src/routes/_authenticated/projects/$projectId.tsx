import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText, Image as ImageIcon, FileSpreadsheet, Upload, Trash2, Send, Square, HardHat, AlertTriangle, Search, Eye, X,
  RotateCcw, Copy, FileDown, ArrowLeft, FileBarChart, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ACCEPT, analyseFile, blobToDataUrl, formatSize, mimeFor, safeFileName } from "@/lib/documents";
import { exportReportPdf, pdfName } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Projet — BATI DOC AI" },
      { name: "description", content: "Documents, Assistant IA et rapports PDF du projet." },
      { property: "og:title", content: "Projet — BATI DOC AI" },
      { property: "og:description", content: "Documents, Assistant IA et rapports PDF du projet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectPage,
});

type Doc = { id: string; name: string; mime: string; size: number; kind: string; storage_path: string; extracted_text: string | null; created_at: string };
type Report = { id: string; title: string; question: string; content: string; created_at: string };
type Msg = { role: "user" | "assistant"; content: string; error?: boolean; reportId?: string; question?: string };

const QUICK = [
  "Analyse ce plan architectural", "Calcule les surfaces", "Extrais les informations clés", "Compare ces documents",
  "Trouve les incohérences", "Prépare une fiche technique", "Rédige une lettre administrative", "Génère un rapport de projet",
  "Résume ce projet", "Vérifie les pièces manquantes",
];

function DocIcon({ d }: { d: Doc }) {
  if (d.mime.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (/\.xlsx?$/i.test(d.name)) return <FileSpreadsheet className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

const fmtDate = (s: string) => new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function ProjectPage() {
  const { projectId } = Route.useParams();
  const qc = useQueryClient();

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, description").eq("id", projectId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const docsQ = useQuery({
    queryKey: ["documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("project_id", projectId).order("created_at");
      if (error) throw error;
      return data as Doc[];
    },
  });
  const reportsQ = useQuery({
    queryKey: ["reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("id, title, question, content, created_at").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });

  const docs = docsQ.data ?? [];
  const reports = reportsQ.data ?? [];
  const projectName = project.data?.name ?? "Projet";

  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [uploads, setUploads] = useState<{ name: string; error?: string }[]>([]);
  const [filter, setFilter] = useState("");
  const [preview, setPreview] = useState<{ doc: Doc; url?: string } | null>(null);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [drag, setDrag] = useState(false);
  const [tab, setTab] = useState<"chat" | "reports">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dataUrlCache = useRef(new Map<string, string>());

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);
  useEffect(() => { if (!streaming && tab === "chat") taRef.current?.focus(); }, [streaming, tab]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 3500); return () => clearTimeout(t); }, [notice]);

  const selected = docs.filter((d) => !excluded.has(d.id));

  async function addFiles(list: File[]) {
    if (!list.length) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    for (const file of list) {
      setUploads((p) => [...p, { name: file.name }]);
      const setErr = (error: string) => setUploads((p) => p.map((x) => (x.name === file.name && !x.error ? { ...x, error } : x)));
      try {
        const { kind, text } = await analyseFile(file);
        const path = `${u.user.id}/${projectId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const mime = mimeFor(file);
        const up = await supabase.storage.from("documents").upload(path, file, { contentType: mime });
        if (up.error) throw new Error("Envoi du fichier impossible.");
        const ins = await supabase.from("documents").insert({ project_id: projectId, name: file.name, mime, size: file.size, kind, storage_path: path, extracted_text: text });
        if (ins.error) { await supabase.storage.from("documents").remove([path]); throw new Error("Enregistrement impossible."); }
        setUploads((p) => p.filter((x) => x.name !== file.name || x.error));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Lecture impossible.");
      }
    }
    qc.invalidateQueries({ queryKey: ["documents", projectId] });
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  async function deleteDoc(d: Doc) {
    if (!confirm(`Supprimer « ${d.name} » ?`)) return;
    await supabase.storage.from("documents").remove([d.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) setNotice("Suppression impossible.");
    qc.invalidateQueries({ queryKey: ["documents", projectId] });
  }

  async function openPreview(d: Doc) {
    if (d.extracted_text) return setPreview({ doc: d });
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 600);
    if (error) return setNotice("Aperçu indisponible.");
    setPreview({ doc: d, url: data.signedUrl });
  }

  async function docPayload(d: Doc) {
    if (d.extracted_text) return { name: d.name, kind: d.kind, mime: d.mime, text: d.extracted_text };
    let dataUrl = dataUrlCache.current.get(d.id);
    if (!dataUrl) {
      const { data, error } = await supabase.storage.from("documents").download(d.storage_path);
      if (error || !data) throw new Error(`Impossible de lire « ${d.name} ».`);
      dataUrl = await blobToDataUrl(new Blob([data], { type: d.mime }));
      dataUrlCache.current.set(d.id, dataUrl);
    }
    return { name: d.name, kind: d.kind, mime: d.mime, dataUrl };
  }

  async function saveReport(question: string, content: string) {
    const title = question.length > 80 ? question.slice(0, 77) + "…" : question;
    const { data, error } = await supabase.from("reports").insert({ project_id: projectId, title, question, content }).select("id").single();
    if (error) { setNotice("L'analyse n'a pas pu être enregistrée."); return undefined; }
    await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
    qc.invalidateQueries({ queryKey: ["reports", projectId] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    return data.id;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    const history: Msg[] = [...messages.filter((m) => !m.error), { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "", question: content }]);
    setInput("");
    setStreaming(true);
    const ac = new AbortController();
    abortRef.current = ac;
    const setLast = (fn: (m: Msg) => Msg) => setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1]!)]);
    let answer = "";
    try {
      const payloadDocs = await Promise.all(selected.slice(0, 10).map(docPayload));
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ac.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ project: projectName, messages: history.map(({ role, content }) => ({ role, content })), docs: payloadDocs }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erreur ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const f of frames) {
          const line = f.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          let ev: { type?: string; delta?: string; response?: { error?: { message?: string } }; message?: string };
          try { ev = JSON.parse(raw); } catch { continue; }
          if (ev.type === "response.output_text.delta" && ev.delta) {
            answer += ev.delta;
            const delta = ev.delta;
            setLast((m) => ({ ...m, content: m.content + delta }));
          } else if (ev.type === "response.failed" || ev.type === "error") {
            throw new Error(ev.response?.error?.message || ev.message || "La réponse a échoué.");
          }
        }
      }
      if (!answer) setLast((m) => ({ ...m, content: "Aucune réponse n'a été produite. Reformulez ou vérifiez vos documents.", error: true }));
      else {
        const id = await saveReport(content, answer);
        setLast((m) => ({ ...m, reportId: id }));
      }
    } catch (e) {
      if (ac.signal.aborted) setLast((m) => ({ ...m, content: (m.content || "") + "\n\n_— Arrêté._" }));
      else setLast((m) => ({ ...m, content: e instanceof Error ? e.message : "Erreur inconnue.", error: true }));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function pdf(sections: { title: string; question?: string; content: string; date?: string }[], suffix: string) {
    setExporting(true);
    try {
      await exportReportPdf({ project: projectName, docs: docs.map((d) => d.name), sections, fileName: pdfName(projectName, suffix) });
    } catch {
      setNotice("Export PDF impossible.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteReport(r: Report) {
    if (!confirm(`Supprimer le rapport « ${r.title} » ?`)) return;
    await supabase.from("reports").delete().eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["reports", projectId] });
  }

  if (project.isSuccess && !project.data) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader />
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Projet introuvable.</p>
          <Link to="/projects" className="mt-3 inline-block text-primary underline">Retour aux projets</Link>
        </div>
      </div>
    );
  }

  const shown = docs.filter((d) => (d.name + d.kind).toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <AppHeader>
        <button
          disabled={exporting || reports.length === 0}
          onClick={() => pdf([...reports].reverse().map((r) => ({ title: r.title, question: r.question, content: r.content, date: fmtDate(r.created_at) })), "rapport-complet")}
          className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground disabled:opacity-40"
        >
          <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">{exporting ? "Export…" : "Rapport PDF complet"}</span>
        </button>
      </AppHeader>

      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Projets</Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="truncate font-display font-bold">{projectName}</h1>
        <div className="ml-auto flex rounded-md border border-input p-0.5 text-sm">
          <button onClick={() => setTab("chat")} className={`inline-flex items-center gap-1 rounded px-2.5 py-1 ${tab === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><MessageSquare className="h-3.5 w-3.5" /> Assistant</button>
          <button onClick={() => setTab("reports")} className={`inline-flex items-center gap-1 rounded px-2.5 py-1 ${tab === "reports" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><FileBarChart className="h-3.5 w-3.5" /> Rapports ({reports.length})</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex max-h-[38vh] flex-col border-b border-border bg-sidebar md:max-h-none md:w-80 md:border-b-0 md:border-r">
          <div className="p-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => fileRef.current?.click()}
              role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              className={`blueprint cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${drag ? "border-primary bg-accent" : "border-border hover:border-primary"}`}
            >
              <Upload className="mx-auto h-5 w-5 text-primary" />
              <div className="mt-1 text-sm font-medium">Déposer des documents</div>
              <div className="font-mono text-[11px] text-muted-foreground">PDF · PNG · JPG · DOCX · XLSX — 15 Mo max</div>
            </div>
            <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }} />
            {uploads.map((u, i) => (
              <div key={i} className={`mt-2 flex items-center gap-2 text-xs ${u.error ? "text-destructive" : "text-primary"}`}>
                <span className="truncate">{u.name} — {u.error ?? "envoi…"}</span>
                {u.error && <button aria-label="Masquer" onClick={() => setUploads((p) => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>}
              </div>
            ))}
            {docs.length > 0 && (
              <div className="relative mt-3">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrer…" className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-2 text-sm" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-3 pb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{docs.length} document(s)</span><span>{selected.length} lu(s) par l'IA</span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
            {docsQ.isLoading && <li className="px-2 py-4 text-xs text-muted-foreground">Chargement…</li>}
            {shown.map((d) => (
              <li key={d.id} className="flex items-start gap-2 rounded-md bg-card p-2 text-sm">
                <input type="checkbox" aria-label={`Inclure ${d.name}`} checked={!excluded.has(d.id)}
                  onChange={() => setExcluded((p) => { const n = new Set(p); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; })}
                  className="mt-1 accent-[var(--primary)]" />
                <div className="mt-0.5 text-primary"><DocIcon d={d} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium" title={d.name}>{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.kind} · {formatSize(d.size)}</div>
                </div>
                <button aria-label="Aperçu" onClick={() => openPreview(d)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Eye className="h-4 w-4" /></button>
                <button aria-label="Supprimer" onClick={() => deleteDoc(d)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!docsQ.isLoading && docs.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">Aucun document. Ajoutez plans, devis, CCTP, métrés…</li>}
          </ul>
        </aside>

        {tab === "reports" ? (
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-2 px-4 py-6">
              <h2 className="font-display text-2xl font-bold">Rapports et analyses</h2>
              <p className="text-sm text-muted-foreground">Chaque réponse de l'Assistant IA est enregistrée ici automatiquement.</p>
              {reports.length === 0 && <p className="py-6 text-sm text-muted-foreground">Aucun rapport. Posez une question à l'Assistant.</p>}
              {reports.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <FileBarChart className="h-5 w-5 shrink-0 text-primary" />
                  <button onClick={() => setViewReport(r)} className="min-w-0 flex-1 text-left">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="font-mono text-xs text-muted-foreground">{fmtDate(r.created_at)}</div>
                  </button>
                  <button aria-label="Exporter en PDF" disabled={exporting} onClick={() => pdf([{ title: r.title, question: r.question, content: r.content, date: fmtDate(r.created_at) }], "analyse")}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"><FileDown className="h-3.5 w-3.5" /> PDF</button>
                  <button aria-label="Supprimer le rapport" onClick={() => deleteReport(r)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-4 py-6">
                {messages.length === 0 ? (
                  <div className="py-6">
                    <h2 className="font-display text-3xl font-bold tracking-tight">Assistant IA du projet</h2>
                    <p className="mt-2 text-muted-foreground">Les documents cochés sont lus par l'assistant. Chaque réponse est enregistrée dans « Rapports ».</p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {QUICK.map((q) => (
                        <button key={q} onClick={() => send(q)} className="rounded-md border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-accent">{q}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((m, i) => (
                      <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                        {m.role === "user" ? (
                          <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
                        ) : (
                          <div className="flex gap-3">
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"><HardHat className="h-4 w-4" /></div>
                            <div className="min-w-0 flex-1">
                              {m.error ? (
                                <div className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {m.content}</div>
                              ) : m.content ? (
                                <div className="md text-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                              ) : (
                                <div className="flex gap-1 py-2" aria-label="L'assistant réfléchit">
                                  {[0, 1, 2].map((k) => <span key={k} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${k * 120}ms` }} />)}
                                </div>
                              )}
                              {!(streaming && i === messages.length - 1) && m.content && !m.error && (
                                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                                  <button onClick={() => { navigator.clipboard?.writeText(m.content); setNotice("Copié."); }} className="inline-flex items-center gap-1 hover:text-foreground"><Copy className="h-3 w-3" /> Copier</button>
                                  <button disabled={exporting} onClick={() => pdf([{ title: m.question ?? "Analyse", question: m.question, content: m.content }], "analyse")} className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-40"><FileDown className="h-3 w-3" /> Exporter en PDF</button>
                                  {m.reportId && <span className="text-primary">Enregistré dans Rapports</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-border bg-card p-3">
              <form className="mx-auto flex max-w-3xl items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                {messages.length > 0 && !streaming && (
                  <button type="button" aria-label="Nouvelle conversation" onClick={() => setMessages([])} className="flex h-10 w-10 items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground"><RotateCcw className="h-4 w-4" /></button>
                )}
                <textarea ref={taRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  rows={1} placeholder={selected.length ? `Question sur ${selected.length} document(s)…` : "Posez une question BTP…"}
                  className="max-h-40 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" />
                {streaming ? (
                  <button type="button" aria-label="Arrêter" onClick={() => abortRef.current?.abort()} className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive text-destructive-foreground"><Square className="h-4 w-4" /></button>
                ) : (
                  <button type="submit" aria-label="Envoyer" disabled={!input.trim()} className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
                )}
              </form>
              <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-muted-foreground">Les résultats de l'IA doivent être vérifiés par un professionnel qualifié.</p>
            </div>
          </main>
        )}
      </div>

      {notice && <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground shadow">{notice}</div>}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setPreview(null)}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border p-3">
              <div className="min-w-0 flex-1 truncate font-medium">{preview.doc.name}</div>
              <span className="font-mono text-xs text-muted-foreground">{preview.doc.kind}</span>
              <button aria-label="Fermer" onClick={() => setPreview(null)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {preview.url && preview.doc.mime.startsWith("image/") ? <img src={preview.url} alt={preview.doc.name} className="mx-auto max-h-[80vh]" />
                : preview.url ? <iframe title={preview.doc.name} src={preview.url} className="h-[80vh] w-full" />
                : <pre className="whitespace-pre-wrap p-4 font-mono text-xs">{preview.doc.extracted_text}</pre>}
            </div>
          </div>
        </div>
      )}

      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setViewReport(null)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border p-3">
              <div className="min-w-0 flex-1 truncate font-medium">{viewReport.title}</div>
              <button disabled={exporting} onClick={() => pdf([{ title: viewReport.title, question: viewReport.question, content: viewReport.content, date: fmtDate(viewReport.created_at) }], "analyse")}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-40"><FileDown className="h-3.5 w-3.5" /> PDF</button>
              <button aria-label="Fermer" onClick={() => setViewReport(null)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="md min-h-0 flex-1 overflow-auto p-5 text-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{viewReport.content}</ReactMarkdown></div>
          </div>
        </div>
      )}
    </div>
  );
}
