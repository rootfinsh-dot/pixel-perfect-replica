export type ChatMessage = { role: "user" | "assistant"; content: string; error?: boolean; reportId?: string | undefined; question?: string | undefined };
export function historyKey(userId: string, projectId: string) { return `batidocai:chat:${userId}:${projectId}`; }
export function readHistory(key: string): ChatMessage[] | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Historique illisible.");
  return value.filter((m): m is ChatMessage => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
}