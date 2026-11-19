import { SubscriptionManager } from "@/components/subscriptions/SubscriptionManager";

export default function SubscriptionPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Abonnements</h1>
      <SubscriptionManager />
    </div>
  );
}
