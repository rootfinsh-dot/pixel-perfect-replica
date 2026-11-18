import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isSignedIn(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || !url || !key) return false;
  // Use admin client for auth verification
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return !error && !!data.user;
}

export const Route = createFileRoute("/api/cahier-decharges/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isSignedIn(request)))
          return Response.json({ error: "Veuillez vous reconnecter." }, { status: 401 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "La demande n'est pas un JSON valide." }, { status: 400 });
        }

        const { projectId, cahierId } = body as { projectId: string; cahierId: string };

        if (!projectId || !cahierId) {
          return Response.json({ error: "projectId et cahierId requis." }, { status: 400 });
        }

        try {
          const admin = supabaseAdmin as any;
          const { data, error } = await admin
            .from("cahiers_decharges")
            .update({
              projectId,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", cahierId)
            .select();

          if (error) {
            console.error("Failed to save cahier de charges:", error.message);
            return Response.json(
              { error: "Impossible de sauvegarder. Réessayez plus tard." },
              { status: 500 },
            );
          }

          if (!data || data.length === 0) {
            return Response.json({ error: "Cahier de charges introuvable." }, { status: 404 });
          }

          if (!data || data.length === 0) {
            return Response.json({ error: "Cahier de charges introuvable." }, { status: 404 });
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = data[0] as any;

          return Response.json({
            id: row.id,
            projectId: row.project_id,
            analysisStatus: row.analysis_status,
            title: row.title,
          });
        } catch (e) {
          console.error("Failed to save cahier de charges:", e);
          return Response.json(
            { error: "Impossible de sauvegarder. Réessayez plus tard." },
            { status: 500 },
          );
        }
      },
    },
  },
});
