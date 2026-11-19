import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/subscriptions/cancel")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const subscriptionId = url.searchParams.get("subscriptionId");

        if (!subscriptionId) {
          return Response.redirect(
            `${process.env["VITE_SUPABASE_URL"] || "http://localhost:5173"}/pricing?error=payment_cancelled`,
            302,
          );
        }

        // Marquer l'abonnement comme annulé
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId);

        // Rediriger vers la page de prix
        return Response.redirect(
          `${process.env["VITE_SUPABASE_URL"] || "http://localhost:5173"}/pricing?error=payment_cancelled`,
          302,
        );
      },
    },
  },
});
