import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { ChatRequestError, readChatBody } from "@/lib/chat-request";
import { z } from "zod";

const SYSTEM = `Tu es l'Analyseur de Cahiers de Charges de BATI DOC AI, expert BTP (architecture, génie civil, bureaux d'études, administration de chantier).

Ton but : analyser un cahier de charges (CCTP, spécifications, brief client) et le structurer en sections hiérarchisées et exploitables.

Règles importantes :
1. Réponds en français par défaut.
2. Extraits les informations FIABLES uniquement depuis le document. Si une information est illisible, absente ou contradictoire, dis-le clairement — n'invente jamais.
3. Structure la réponse en JSON STRICT avec les clés suivantes (en minuscules, avec underscores) :
   - general_information : { project_name, client, location, project_date, budget, description }
   - objectives : ["objet1", "objet2", ...]
   - scope : { in_scope : [...], out_of_scope : [...], description }
   - functional_requirements : [{ id, title, description, priority (élevé/moyen/faible) }]
   - technical_requirements : [{ id, title, description, category (structure/mécanique/électricité/géo/équipement/ambiance) }]
   - constraints : [{ id, title, description, type (réglementaire/financière/temporaire/technique/materiel/societe) }]
   - timeline : { phases : [{ phase, start, end, duration, deliverables }], overall_duration_months }
   - deliverables : [{ id, title, description, acceptance_criteria, format }]
   - risks : [{ id, title, description, severity (critique/moderate/faible) }]
4. Chaque section doit être complète et détaillée, en montrant tes calculs ou justifications quand tu cites des surfaces, quantités, coûts ou durées.
5. Si le document ne contient pas d'information sur un point, laisse le champ vide ou met "NON PRÉSENT" — ne devine pas.
6. Ne retourne QUE le JSON (pas de markdown, pas de texte explicatif ni de code block). L'analyseur client s'attend à recevoir un JSON brut pour injection directe.

Exemple de structure de réponse (JSON) :
{
  "general_information": { "project_name": "...", "client": "...", "location": "...", "project_date": "...", "budget": "...", "description": "..." },
  "objectives": ["...", "..."],
  "scope": { "in_scope": ["..."], "out_of_scope": ["..."], "description": "..." },
  "functional_requirements": [{ "id": "FR-001", "title": "...", "description": "...", "priority": "élevé" }],
  "technical_requirements": [{ "id": "TR-001", "title": "...", "description": "...", "category": "structure" }],
  "constraints": [{ "id": "C-001", "title": "...", "description": "...", "type": "réglementaire" }],
  "timeline": { "phases": [{"phase": "...", "start": "...", "end": "...", "duration": "...", "deliverables": "..." }], "overall_duration_months": 12 },
  "deliverables": [{ "id": "D-001", "title": "...", "description": "...", "acceptance_criteria": "...", "format": "..." }],
  "risks": [{ "id": "R-001", "title": "...", "description": "...", "severity": "critique" }]
}

Tu travailles dans le contexte d'un projet de construction (BTP). Utilise les standards français (DTU, normes, réglementation). Si le cahier de charges évoque des plans ou des documents annexes, référence-les.

NE RETOURNE JAMAIS DE TEXTE EXPLICATIF EN DEHORS DU JSON. Seul le JSON est autorisé.`;

async function isSignedIn(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || !url || !key) return false;
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  return !error && !!data.user;
}

const bodySchema = {
  projectId: null,
  documentId: null,
  sourceText: null,
  documentData: null,
  title: null,
};

export const Route = createFileRoute("/api/cahier-decharges")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isSignedIn(request)))
          return Response.json({ error: "Veuillez vous reconnecter." }, { status: 401 });

        const bodySchema = z.object({
          projectId: z.string(),
          documentId: z.string().optional(),
          sourceText: z.string().optional(),
          documentData: z.string().optional(),
          title: z.string().optional(),
        });

        const body = await readChatBody(request);
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Données invalides." }, { status: 400 });
        }
        const { projectId, documentId, sourceText, documentData, title } = parsed.data;

        if (!projectId) {
          return Response.json({ error: "ID projet manquant." }, { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "Service IA non configuré." }, { status: 500 });
        }

        const input: Record<string, unknown>[] = [
          { role: "system", content: SYSTEM },
        ];

        if (sourceText) {
          input.push({
            role: "user",
            content: `Voici le contenu du cahier de charges :\n\n${sourceText.slice(0, 200000)}`,
          });
        } else if (documentData) {
          input.push({
            role: "user",
            content: [
              { type: "input_text", text: `Document « ${title} » à analyser et structurer.` },
              { type: "input_file", filename: title, file_data: documentData },
            ],
          });
        } else {
          return Response.json(
            { error: "Aucun texte ou document fourni pour l'analyse." },
            { status: 400 },
          );
        }

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            signal: request.signal,
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              input,
              stream: false,
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

          let data: unknown;
          try {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulated += decoder.decode(value, { stream: true });
            }
            data = JSON.parse(accumulated);
          } catch (e) {
            return Response.json(
              { error: "Impossible de lire la réponse de l'IA (format incorrect)." },
              { status: 500 },
            );
          }

          return Response.json(data);
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
