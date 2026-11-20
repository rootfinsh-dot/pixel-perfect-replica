import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HardHat,
  FileSearch,
  Ruler,
  FileText,
  FolderKanban,
  CreditCard,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BATI DOC AI — Assistant IA pour documents BTP" },
      {
        name: "description",
        content:
          "Analysez plans, PDF, devis et métrés avec l'Assistant IA de BATI DOC AI pour architectes, ingénieurs et professionnels du BTP.",
      },
      { property: "og:title", content: "BATI DOC AI — Assistant IA pour documents BTP" },
      {
        property: "og:description",
        content: "Projets, documents, analyses IA et rapports PDF pour les professionnels du BTP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    icon: FolderKanban,
    t: "Projets sauvegardés",
    d: "Vos projets, documents et rapports restent disponibles sur tous vos appareils.",
  },
  {
    icon: FileSearch,
    t: "Analyse de documents",
    d: "Plans, PDF, devis, CCTP, métrés : type détecté, informations extraites.",
  },
  {
    icon: Ruler,
    t: "Calculs et contrôles",
    d: "Surfaces, quantités, incohérences et pièces manquantes.",
  },
  {
    icon: FileText,
    t: "Rapports PDF",
    d: "Exportez chaque analyse ou tout le projet dans un rapport en français.",
  },
];

function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HardHat className="h-5 w-5" />
        </div>
        <div className="font-display text-lg font-bold">BATI DOC AI</div>
        <Link
          to="/auth"
          className="ml-auto rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
        >
          Connexion
        </Link>
      </header>
      <section className="blueprint border-y border-border">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Architectes · Ingénieurs · Bureaux d'études · BTP
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            L'Assistant IA qui lit vos documents de chantier.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Déposez plans, devis et pièces écrites : BATI DOC AI calcule, compare, détecte les
            incohérences et rédige vos rapports.
          </p>
          <Link
            to="/projects"
            className="mt-8 inline-flex rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Accéder à mes projets
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 pb-14 sm:px-6">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">S'abonner et payer</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Choisissez votre plan et payez en toute transparence. Deux méthodes de paiement
            disponibles : PayPal et RodotPay.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-3 rounded-md border border-input bg-background px-4 py-3 hover:bg-accent transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>Voir les plans et s'abonner</span>
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-3 rounded-md border border-input bg-background px-4 py-3 hover:bg-accent transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              <span>Payer avec PayPal ou RodotPay</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
