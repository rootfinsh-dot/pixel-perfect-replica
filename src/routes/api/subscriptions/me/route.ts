import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/subscriptions/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Vérifier l'authentification
        const authHeader = request.headers.get("authorization");
        if (!authHeader) {
          return Response.json({ error: "Non authentifié" }, { status: 401 });
        }

        const token = authHeader.replace(/^Bearer\s+/i, "");
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authData.user) {
          return Response.json({ error: "Utilisateur non authentifié" }, { status: 401 });
        }

        const userId = authData.user.id;

        // Récupérer les abonnements de l'utilisateur
        const { data, error } = await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to get subscriptions:", error);
          return Response.json(
            { error: "Impossible de récupérer les abonnements" },
            { status: 500 },
          );
        }

        return Response.json(data || []);
      },
    },
  },
});
