import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

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

        let checkoutUrl: string;

        if (body.paymentProvider === "paypal") {
          // PayPal Standard (legacy) - redirection vers l'email du business
          const paypalEmail = process.env["PAYPAL_EMAIL"];
          if (!paypalEmail) {
            return Response.json(
              { error: "PAYPAL_EMAIL non configuré. Ajoutez PAYPAL_EMAIL dans .env" },
              { status: 500 },
            );
          }

          // Construction de l'URL PayPal Standard
          const params = new URLSearchParams({
            cmd: "_xclick",
            business: paypalEmail,
            item_name: `Abonnement ${body.plan}`,
            currency_code: "EUR",
            amount: body.plan === "free" ? "0" : String(getPlanAmount(body.plan)),
            no_shipping: "1",
            no_note: "1",
            return: `${process.env["VITE_SUPABASE_URL"] || "http://localhost:5173"}/api/subscriptions/success?subscriptionId=${data.id}`,
            cancel_return: `${process.env["VITE_SUPABASE_URL"] || "http://localhost:5173"}/api/subscriptions/cancel?subscriptionId=${data.id}`,
          });
          checkoutUrl = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
        } else {
          // RedotPay Checkout
          const apiKey = process.env["REDOTPAY_UID"];
          if (!apiKey) {
            return Response.json(
              { error: "REDOTPAY_UID non configuré. Ajoutez REDOTPAY_UID dans .env" },
              { status: 500 },
            );
          }

          // Appel API de RedotPay pour créer une session de paiement
          try {
            const response = await fetch("https://api.redotpay.com/v1/checkout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                plan: body.plan,
                amount: getPlanAmount(body.plan),
                currency: "USD",
                success_url: `${process.env["VITE_SUPABASE_URL"] || "http://localhost:5173"}/api/subscriptions/success?subscriptionId=${data.id}`,
                cancel_url: `${process.env["VITE_SUPABASE_URL"] || "http://localhost:5173"}/pricing?error=payment_cancelled`,
                metadata: {
                  subscription_id: data.id,
                  user_id: userId,
                  provider: "redotpay",
                },
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("RedotPay API error:", errorData);
              return Response.json(
                { error: "Impossible de créer la session de paiement RedotPay" },
                { status: 500 },
              );
            }

            const checkoutData = await response.json();
            checkoutUrl = checkoutData.checkout_url || checkoutData.session_url;
          } catch (err) {
            console.error("RedotPay API error:", err);
            return Response.json({ error: "Impossible de contacter RedotPay" }, { status: 500 });
          }
        }

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

// Fonction pour obtenir le montant selon le plan
function getPlanAmount(plan: string): number {
  const prices: Record<string, number> = {
    free: 0,
    basic: 999,
    pro: 2499,
    enterprise: 4999,
  };
  return prices[plan] || 0;
}
