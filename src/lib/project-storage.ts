import { supabase } from "@/integrations/supabase/client";

export async function deleteProjectFiles(projectId: string) {
  const { data: user, error: authError } = await supabase.auth.getUser();
  if (authError || !user.user) throw new Error("Veuillez vous reconnecter pour supprimer le projet.");
  const { data: docs, error: docsError } = await supabase.from("documents").select("storage_path").eq("project_id", projectId);
  if (docsError) throw new Error("Impossible de vérifier les documents. Le projet n’a pas été supprimé.");
  const bucket = supabase.storage.from("documents");
  const prefix = `${user.user.id}/${projectId}`;
  const paths = new Set((docs ?? []).map(d => d.storage_path));
  // List all pages before removing files, so deleting cannot shift pagination.
  async function collect(folder: string) {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(folder, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error("Impossible de vérifier les fichiers du projet. Réessayez la suppression.");
      for (const file of data ?? []) {
        const path = `${folder}/${file.name}`;
        if (file.id) paths.add(path); else await collect(path);
      }
      if (!data || data.length < 100) break;
    }
  }
  await collect(prefix);
  const all = [...paths];
  for (let i = 0; i < all.length; i += 100) {
    const { error } = await bucket.remove(all.slice(i, i + 100));
    if (error) throw new Error("Certains fichiers n’ont pas pu être supprimés. Le projet est conservé ; réessayez.");
  }
}