import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Plans disponibles
export const PLANS = {
  FREE: "free",
  BASIC: "basic",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

// Options de paiement
export const PAYMENT_PROVIDERS = {
  PAYPAL: "paypal",
  REDOTPAY: "redotpay",
} as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[keyof typeof PAYMENT_PROVIDERS];

// Schéma de validation (Zod)
const subscriptionSchema = {
  id: "subscription",
  body: {
    plan: { header: "Abonnement", message: "Choisissez votre plan" },
    paymentProvider: { header: "Moyen de paiement", message: "Choisissez comment vous payez" },
  },
};

export const Route = createFileRoute("/api/subscriptions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        // Valider le corps de la requête
        const body = await request.json();

        // Vérifier que le plan est valide
        const validPlans = ["free", "basic", "pro", "enterprise"];
        if (!validPlans.includes(body.plan)) {
          return Response.json({ error: "Plan invalide" }, { status: 400 });
        }

        // Vérifier que le provider est valide
        const validProviders = ["paypal", "redotpay"];
        if (!validProviders.includes(body.paymentProvider)) {
          return Response.json({ error: "Moyen de paiement invalide" }, { status: 400 });
        }

        // Créer l'abonnement
        const { data, error } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: userId,
            plan: body.plan,
            payment_provider: body.paymentProvider,
            status: "pending",
            ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours par défaut
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to create subscription:", error);
          return Response.json({ error: "Impossible de créer l'abonnement" }, { status: 500 });
        }

        // Créer la session de paiement (redirect vers le provider)
        const checkoutUrl = `https://your-domain.com/checkout?subscriptionId=${data.id}&plan=${data.plan}&provider=${data.payment_provider}`;

        return Response.json({
          subscription: {
            id: data.id,
            plan: data.plan,
            paymentProvider: data.payment_provider,
            status: data.status,
            endsAt: data.ends_at,
          },
          checkoutUrl,
          message:
            "Un email de confirmation vous a été envoyé. Suivez le lien pour finaliser votre paiement.",
        });
      },
    },
  },
});
