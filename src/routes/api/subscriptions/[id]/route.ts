import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/subscriptions/id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { id } = params as { id: string };

        if (!id) {
          return Response.json({ error: "ID manquant" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Failed to get subscription:", error);
          return Response.json({ error: "Impossible de récupérer l'abonnement" }, { status: 500 });
        }

        if (!data) {
          return Response.json({ error: "Abonnement non trouvé" }, { status: 404 });
        }

        return Response.json(data);
      },
    },
  },
});
