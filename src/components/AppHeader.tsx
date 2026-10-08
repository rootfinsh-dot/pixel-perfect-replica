import { Link, useNavigate } from "@tanstack/react-router";
import { HardHat, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
      <Link to="/projects" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HardHat className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-tight">BATI DOC AI</div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Plateforme IA · BTP</div>
        </div>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
