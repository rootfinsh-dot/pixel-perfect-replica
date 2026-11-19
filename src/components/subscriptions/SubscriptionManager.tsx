import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "./Plans";

// Type for a plan
export type Plan = (typeof PLANS)[number];

export function SubscriptionManager() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      // Rediriger vers la session de paiement
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Failed to create subscription:", error);
      alert("Erreur lors de la création de l'abonnement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Votre abonnement</CardTitle>
          <CardDescription>
            Gérez vos abonnements et accédez à vos fonctionnalités premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {PLANS.map((plan) => (
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
        </CardContent>
      </Card>

      {selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Méthode de paiement</CardTitle>
            <CardDescription>
              Choisissez comment vous payez pour le plan {selectedPlan}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                id: "paypal",
                name: "PayPal",
                icon: "🅿️",
                color: "blue",
                description: "Paiement sécurisé via PayPal",
              },
              {
                id: "redotpay",
                name: "RodotPay",
                icon: "💳",
                color: "green",
                description: "Paiement via RodotPay",
              },
            ].map((provider) => (
              <Button
                key={provider.id}
                className="w-full"
                onClick={() => setPaymentProvider(paymentProvider === provider.id ? null : provider.id)}
                variant={paymentProvider === provider.id ? "default" : "outline"}
              >
                <span className="mr-2">{provider.icon}</span>
                {provider.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedPlan && paymentProvider && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Confirmation</h3>
                <p className="text-sm text-muted-foreground">
                  Vous allez être redirigé vers {paymentProvider} pour finaliser le paiement de{" "}
                  <strong>{selectedPlan}</strong>.
                </p>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  handleSubscribe(selectedPlan, paymentProvider);
                }}
                disabled={loading}
              >
                {loading ? "Traitement..." : "Payer maintenant"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
