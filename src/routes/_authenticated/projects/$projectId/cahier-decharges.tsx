import { createFileRoute } from "@tanstack/react-router";
import { CahierDeCharges } from "@/components/cahier-decharges/CahierDeCharges";

export const Route = createFileRoute("/cahier-decharges")({
  component: CahierDeCharges,
});
