import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, DollarSign, Globe } from "lucide-react";
import { useState } from "react";
import { PLANS } from "@/components/subscriptions/Plans";

// Configuration PayPal (depuis miftah-quran)
export const PAYPAL_EMAIL = "dabalarbi@gmail.com";

// Configuration RedotPay (depuis miftah-quran)
export const REDOTPAY_CONFIG = {
  uid: "1471439889",
  surname: "larbiou",
};

// Plans disponibles
const PLANS_LIST = PLANS;

// Paiement types pour PayPal SDK
interface PayPalCreateOrderData {
  subscriptionId: string;
}

interface PayPalCreateOrderActions {
  order: {
    create: (data: PayPalCreateOrderRequest) => Promise<PayPalCreateOrderResponse>;
  };
}

interface PayPalCreateOrderRequest {
  purchase_units: Array<{
    amount: {
      value: string;
      currency: string;
    };
  }>;
  custom_id: string;
  description: string;
}

interface PayPalCreateOrderResponse {
  id: string;
}

interface PayPalOnApproveData {
  subscriptionId: string;
  orderID: string;
}

interface PayPalOnApproveActions {
  order: {
    capture: () => Promise<PayPalCaptureResponse>;
  };
}

interface PayPalCaptureResponse {
  id: string;
}

interface PayPalButtonOptions {
  createOrder?: (
    data: PayPalCreateOrderData,
    actions: PayPalCreateOrderActions,
  ) => Promise<PayPalCreateOrderResponse>;
  onApprove?: (data: PayPalOnApproveData, actions: PayPalOnApproveActions) => Promise<void>;
  onError?: (error: Error) => void;
}

interface Window {
  paypal?: {
    Button: {
      render: (container: string, options: PayPalButtonOptions) => Promise<void>;
    };
    ready: () => Promise<void>;
  };
}

export const Route = createFileRoute("/_authenticated/pricing")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({
    title: "Tarifs et Abonnements — BATI DOC AI",
    meta: [
      { name: "description", content: "Choisissez votre abonnement et payez par PayPal ou RodotPay." },
    ],
  }),
});

export function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubscribe = async (plan: string, provider: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, paymentProvider: provider }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur lors de la création de l'abonnement");
        return;
      }

      // Rediriger vers le paiement selon le provider
      if (provider === "paypal") {
        // PayPal Standard (legacy) - redirection vers l'email du business
        const paypalEmail = "dabalarbi@gmail.com";
        const params = new URLSearchParams();
        params.append("cmd", "_xclick");
        params.append("business", paypalEmail);
        params.append("item_name", `Abonnement ${plan}`);
        params.append("currency_code", "EUR");
        params.append("amount", plan === "free" ? "0" : String(getPlanAmount(plan)));
        params.append("no_shipping", "1");
        params.append("no_note", "1");
        params.append(
          "return",
          `${window.location.origin}/api/subscriptions/success?subscriptionId=${data.subscription.id}`,
        );
        params.append("cancel_return", `${window.location.origin}/pricing?error=payment_cancelled`);
        window.open(`https://www.paypal.com/cgi-bin/webscr?${params.toString()}`, "_blank");
      } else {
        // RedotPay
        try {
          const response = await fetch("https://api.redotpay.com/v1/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${REDOTPAY_CONFIG.uid}`,
            },
            body: JSON.stringify({
              plan: plan,
              amount: getPlanAmount(plan),
              currency: "USD",
              success_url: `${window.location.origin}/api/subscriptions/success?subscriptionId=${data.subscription.id}`,
              cancel_url: `${window.location.origin}/pricing?error=payment_cancelled`,
              metadata: {
                subscription_id: data.subscription.id,
                user_id: "current-user-id",
                provider: "redotpay",
              },
            }),
          });
          const checkoutData = await response.json();
          if (checkoutData.checkout_url) {
            window.open(checkoutData.checkout_url, "_blank");
          }
        } catch (error) {
          console.error("RedotPay error:", error);
          alert("Erreur lors de la connexion à RodotPay");
        }
      }
    } catch (error) {
      console.error("Failed to create subscription:", error);
      alert("Erreur lors de la création de l'abonnement");
    } finally {
      setLoading(false);
    }
  };

  function getPlanAmount(plan: string): number {
    const prices: Record<string, number> = {
      free: 0,
      basic: 999,
      pro: 2499,
      enterprise: 4999,
    };
    return prices[plan] || 0;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Choisissez votre abonnement</h1>
        <p className="text-muted-foreground mt-2">
          Découvrez les fonctionnalités disponibles pour chaque plan
        </p>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS_LIST.map((plan) => (
          <Card
            key={plan.id}
            className={`cursor-pointer transition hover:shadow-md ${
              selectedPlan === plan.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{plan.name}</span>
                <Badge variant={selectedPlan === plan.id ? "default" : "secondary"}>
                  {plan.price === 0 ? "Gratuit" : `$${plan.price}`}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Méthode de paiement */}
      {selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Choisissez votre méthode de paiement</CardTitle>
            <CardDescription>
              {selectedPlan === "free"
                ? "L'abonnement gratuit est maintenant actif."
                : "Choisissez comment vous souhaitez payer pour ce plan."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: "paypal",
                name: "PayPal",
                icon: "🅿️",
                description: "Paiement sécurisé via PayPal Checkout",
              },
              {
                id: "redotpay",
                name: "RodotPay",
                icon: "💳",
                description: "Paiement via RodotPay",
                account: "1471439889 / larbiou",
              },
            ].map((provider) => (
              <Button
                key={provider.id}
                className="w-full"
                onClick={() =>
                  setPaymentProvider(paymentProvider === provider.id ? null : provider.id)
                }
                variant={paymentProvider === provider.id ? "default" : "outline"}
              >
                <span className="mr-2">{provider.icon}</span>
                {provider.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Zone pour le bouton PayPal */}
      {paymentProvider === "paypal" && selectedPlan && (
        <Card>
          <CardContent className="p-6 text-center">
            <div id="paypal-button-container" className="min-h-[80px]"></div>
            <p className="text-xs text-muted-foreground mt-2">
              Vous allez être redirigé vers PayPal pour finaliser le paiement.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instructions de paiement */}
      {selectedPlan && paymentProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions de paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentProvider === "paypal" && (
              <div className="p-4 border rounded space-y-2">
                <p className="font-medium">💳 PayPal Standard</p>
                <p className="text-sm text-muted-foreground">
                  Vous serez redirigé vers PayPal pour finaliser le paiement de{" "}
                  <strong>
                    {selectedPlan === "free"
                      ? "votre abonnement gratuit"
                      : `l'abonnement ${selectedPlan}`}
                  </strong>
                  .
                </p>
                <div className="bg-muted p-3 rounded text-xs">
                  <p>
                    <strong>Email du bénéficiaire :</strong> {PAYPAL_EMAIL}
                  </p>
                </div>
              </div>
            )}

            {paymentProvider === "redotpay" && (
              <div className="p-4 border rounded space-y-2">
                <p className="font-medium">💳 RodotPay</p>
                <p className="text-sm text-muted-foreground">
                  Vous serez redirigé vers RodotPay pour finaliser le paiement.
                </p>
                <div className="bg-muted p-3 rounded text-xs">
                  <p>
                    <strong>UID :</strong> {REDOTPAY_CONFIG.uid}
                  </p>
                  <p>
                    <strong>Surnom :</strong> {REDOTPAY_CONFIG.surname}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
