import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, User, DollarSign, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Plans disponibles
export const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    description: "Pour découvrir l'IA",
    price: 0,
    period: "offert",
    features: ["1 analyse par mois", "Documents limités", "Support par email"],
    icon: CheckCircle,
    color: "green",
    highlighted: false,
  },
  {
    id: "basic",
    name: "Basic",
    description: "Pour l'utilisation professionnelle",
    price: 9.99,
    period: "/mois",
    features: [
      "25 analyses par mois",
      "Fichiers jusqu'à 10 Mo",
      "Résultats rapides",
      "Support prioritaire",
    ],
    icon: Zap,
    color: "blue",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Pour les équipes exigeantes",
    price: 24.99,
    period: "/mois",
    features: [
      "100 analyses par mois",
      "Fichiers jusqu'à 50 Mo",
      "Analyses illimitées",
      "Support dédié 24/7",
      "Intégrations API",
    ],
    icon: DollarSign,
    color: "purple",
    highlighted: false,
  },
  {
    id: "enterprise",
    name: "Entreprise",
    description: "Pour les grandes organisations",
    price: 49.99,
    period: "/mois",
    features: [
      "Tout le contenu",
      "Accès illimité",
      "SLA garanti",
      "Sécurité avancée",
      "Gestion des rôles",
    ],
    icon: User,
    color: "gray",
    highlighted: false,
  },
];

interface PlanProps {
  plan: (typeof PLANS)[0];
}

export function PlanCard({ plan }: PlanProps) {
  const Icon = plan.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <CardDescription>{plan.description}</CardDescription>
        </div>
        <div
          className={`p-2 rounded-lg ${plan.highlighted ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}
        >
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline">
          <span className="text-3xl font-bold">{plan.price.toFixed(2)}</span>
          <span className="text-muted-foreground ml-1">{plan.period}</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className={`w-full mt-6 ${plan.highlighted ? "bg-primary hover:bg-primary/90" : ""}`}
          disabled={!plan.highlighted}
        >
          {plan.price === 0 ? "S'abonner gratuitement" : `Passer à ${plan.name}`}
        </Button>
      </CardContent>
    </Card>
  );
}
