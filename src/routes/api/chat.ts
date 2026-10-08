import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Doc = z.object({
  name: z.string(),
  kind: z.string(),
  mime: z.string(),
  text: z.string().optional(),
  dataUrl: z.string().optional(),
});
const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) })).min(1).max(60),
  project: z.string().max(200).optional(),
  docs: z.array(Doc).max(10),
});

const SYSTEM = `Tu es l'Assistant IA de BATI DOC AI, expert BTP (architecture, génie civil, bureaux d'études, administration de chantier).
Tu analyses plans, PDF, devis, CCTP, métrés, permis, PV. Tu calcules surfaces et quantités en montrant tes calculs, tu extrais les informations clés, compares les documents, détectes incohérences et pièces manquantes, rédiges fiches techniques, lettres administratives et rapports.
Réponds dans la langue de l'utilisateur (français par défaut), en Markdown structuré (titres, tableaux). Cite le document source. Si une information est illisible ou absente, dis-le clairement au lieu d'inventer. Rappelle que les résultats doivent être vérifiés par un professionnel qualifié lorsqu'ils engagent la sécurité ou la réglementation.`;

async function isSignedIn(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || !url || !key) return false;
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  return !error && !!data.user;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isSignedIn(request))) return Response.json({ error: "Veuillez vous reconnecter." }, { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Requête invalide." }, { status: 400 });
        const { messages, docs, project } = parsed.data;
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Service IA non configuré." }, { status: 500 });

        const docParts: Record<string, unknown>[] = [];
        for (const d of docs) {
          if (d.dataUrl && d.mime.startsWith("image/")) {
            docParts.push({ type: "input_text", text: `Document « ${d.name} » (${d.kind}) — image ci-dessous :` });
            docParts.push({ type: "input_image", image_url: d.dataUrl });
          } else if (d.dataUrl && d.mime === "application/pdf") {
            docParts.push({ type: "input_file", filename: d.name, file_data: d.dataUrl });
          } else if (d.text) {
            docParts.push({ type: "input_text", text: `Document « ${d.name} » (${d.kind}) :\n${d.text.slice(0, 60000)}` });
          }
        }

        const input: Record<string, unknown>[] = [
          { role: "system", content: SYSTEM + (project ? `\nProjet actuel : ${project}` : "") },
        ];
        messages.forEach((m, i) => {
          if (m.role === "user") {
            const last = i === messages.length - 1;
            input.push({ role: "user", content: [...(last ? docParts : []), { type: "input_text", text: m.content }] });
          } else {
            input.push({ role: "assistant", content: [{ type: "output_text", text: m.content }] });
          }
        });

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            signal: request.signal,
            headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              input,
              stream: true,
              store: false,
              reasoning: { effort: "low", summary: "auto" },
              include: ["reasoning.encrypted_content"],
            }),
          });
          if (!res.ok || !res.body) {
            const t = await res.text().catch(() => "");
            let msg = "Le service IA a renvoyé une erreur.";
            if (res.status === 429) msg = "Trop de demandes, réessayez dans un instant.";
            else if (res.status === 402) msg = "Crédits IA épuisés pour cet espace de travail.";
            else {
              try {
                const j = JSON.parse(t);
                msg = j?.error?.message ?? j?.message ?? msg;
              } catch {
                /* keep default */
              }
            }
            return Response.json({ error: msg }, { status: res.status || 500 });
          }
          return new Response(res.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
