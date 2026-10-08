import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, FolderOpen, Trash2, FileText, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Mes projets — BATI DOC AI" },
      { name: "description", content: "Gérez vos projets BTP, leurs documents et leurs rapports PDF." },
      { property: "og:title", content: "Mes projets — BATI DOC AI" },
      { property: "og:description", content: "Liste des projets, documents et rapports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_at, documents(count), reports(count)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("projects").insert({ name: name.trim(), description: desc.trim() }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects/$projectId", params: { projectId: id } });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: docs } = await supabase.from("documents").select("storage_path").eq("project_id", id);
      if (docs?.length) await supabase.storage.from("documents").remove(docs.map((d) => d.storage_path));
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Mes projets</h1>
        <p className="mt-1 text-muted-foreground">Chaque projet regroupe ses documents, les analyses de l'Assistant IA et les rapports PDF.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); setErr(null); if (name.trim()) create.mutate(); }}
          className="mt-6 flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required placeholder="Nom du projet (ex. Villa R+1 Oran)" aria-label="Nom du projet"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} placeholder="Description (facultatif)" aria-label="Description"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button disabled={create.isPending || !name.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" /> Nouveau projet
          </button>
        </form>
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {error && <p className="text-sm text-destructive">Impossible de charger les projets.</p>}
          {data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet pour l'instant. Créez-en un ci-dessus.</p>}
          {data?.map((p) => (
            <div key={p.id} className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary">
              <Link to="/projects/$projectId" params={{ projectId: p.id }} className="flex-1">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <h2 className="font-display font-bold">{p.name}</h2>
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                <div className="mt-3 flex gap-4 font-mono text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {p.documents?.[0]?.count ?? 0} documents</span>
                  <span className="inline-flex items-center gap-1"><FileBarChart className="h-3.5 w-3.5" /> {p.reports?.[0]?.count ?? 0} rapports</span>
                  <span>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </Link>
              <button
                onClick={() => { if (confirm(`Supprimer le projet « ${p.name} » et tous ses documents ?`)) remove.mutate(p.id); }}
                className="mt-3 inline-flex items-center gap-1 self-end text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
