import { z } from "zod";

export const CHAT_LIMITS = { documents: 10, dataUrlBytes: 20 * 1024 * 1024 + 1024, requestBytes: 30 * 1024 * 1024 };
export class ChatRequestError extends Error {
  constructor(message: string, public status: 400 | 413) { super(message); }
}
const docSchema = z.object({ name: z.string().max(300), kind: z.string().max(100), mime: z.string().max(100), text: z.string().max(60000).optional(), dataUrl: z.string().optional() });
const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20000) })).min(1).max(60),
  project: z.string().max(200).optional(), docs: z.array(docSchema),
});
export function validateChatBody(value: unknown) {
  const parsed = bodySchema.safeParse(value);
  if (!parsed.success) throw new ChatRequestError("Requête invalide : vérifiez les messages et les documents (texte limité à 60 000 caractères par document).", 400);
  if (parsed.data.docs.length > CHAT_LIMITS.documents) throw new ChatRequestError("Sélectionnez au maximum 10 documents pour une demande à l’assistant.", 400);
  for (const doc of parsed.data.docs) {
    if (!doc.dataUrl) continue;
    if (new TextEncoder().encode(doc.dataUrl).byteLength > CHAT_LIMITS.dataUrlBytes) throw new ChatRequestError(`Le fichier « ${doc.name} » est trop volumineux pour l’assistant (15 Mo maximum avant encodage).`, 413);
    if (!/^data:(application\/pdf|image\/(png|jpeg));base64,[A-Za-z0-9+/]*={0,2}$/.test(doc.dataUrl) || !doc.dataUrl.startsWith(`data:${doc.mime};base64,`)) throw new ChatRequestError(`Le format du fichier « ${doc.name} » est invalide.`, 400);
  }
  return parsed.data;
}
export function serializeChatBody(value: unknown) {
  const body = JSON.stringify(validateChatBody(value));
  if (new TextEncoder().encode(body).byteLength > CHAT_LIMITS.requestBytes) throw new ChatRequestError("La demande dépasse 30 Mo. Décochez certains documents avant de réessayer.", 413);
  return body;
}
// Never materialize an unbounded body, including chunked requests without Content-Length.
export async function readChatBody(request: Request) {
  const length = Number(request.headers.get("content-length"));
  if (length > CHAT_LIMITS.requestBytes) throw new ChatRequestError("La demande dépasse 30 Mo. Décochez certains documents avant de réessayer.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ChatRequestError("La demande est vide.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > CHAT_LIMITS.requestBytes) { await reader.cancel(); throw new ChatRequestError("La demande dépasse 30 Mo. Décochez certains documents avant de réessayer.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ChatRequestError("La demande n’est pas un JSON valide.", 400); }
  return validateChatBody(value);
}