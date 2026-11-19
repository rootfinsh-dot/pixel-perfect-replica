import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DONATE_ACCOUNTS } from "@/lib/site";

export const Route = createFileRoute("/api/subscriptions/success")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const subscriptionId = url.searchParams.get("subscriptionId");
        const paymentId = url.searchParams.get("paymentId") || url.searchParams.get("token") || "";

        if (!subscriptionId) {
          return Response.json({ error: "ID de l'abonnement manquant" }, { status: 400 });
        }

        // Trouver l'abonnement
        const { data: subscription, error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "active",
            payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId)
          .select()
          .single();

        if (error || !subscription) {
          console.error("Error updating subscription:", error);
          return Response.json(
            { error: "Impossible de mettre à jour l'abonnement" },
            { status: 500 },
          );
        }

        // Enregistrer l'ID de paiement
        await supabaseAdmin
          .from("subscriptions")
          .update({
            payment_id: paymentId,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId);

        // Rediriger vers la page de succès
        return Response.redirect(
          `${process.env["VITE_SUPABASE_URL"] || "http://localhost:5173"}/pricing?success=1`,
          302,
        );
      },
    },
  },
});
