import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — BATI DOC AI" },
      { name: "description", content: "Connectez-vous à BATI DOC AI pour retrouver vos projets, documents et rapports BTP." },
      { property: "og:title", content: "Connexion — BATI DOC AI" },
      { property: "og:description", content: "Accédez à vos projets BTP et à l'Assistant IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/projects" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/projects" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: error.message.includes("Invalid") ? "E-mail ou mot de passe incorrect." : error.message });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/projects" } });
      if (error) setMsg({ ok: false, text: error.message });
      else setMsg({ ok: true, text: "Compte créé. Vérifiez votre e-mail pour confirmer votre adresse, puis connectez-vous." });
    }
    setBusy(false);
  }

  async function google() {
    setMsg(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg({ ok: false, text: "Connexion Google impossible. Réessayez." });
  }

  return (
    <div className="blueprint flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><HardHat className="h-5 w-5" /></div>
          <div>
            <div className="font-display text-xl font-bold">BATI DOC AI</div>
            <div className="text-xs text-muted-foreground">{mode === "in" ? "Connexion à votre espace" : "Créer un compte"}</div>
          </div>
        </div>
        <button onClick={google} className="w-full rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-accent">Continuer avec Google</button>
        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="email" className="text-sm font-medium">E-mail</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="pw" className="text-sm font-medium">Mot de passe</label>
            <input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-foreground" : "text-destructive"}`}>{msg.text}</p>}
          <button disabled={busy} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy ? "Patientez…" : mode === "in" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
