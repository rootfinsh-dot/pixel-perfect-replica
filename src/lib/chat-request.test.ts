// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CHAT_LIMITS, ChatRequestError, readChatBody, serializeChatBody, validateChatBody } from "./chat-request";
const doc = { name: "plan.pdf", kind: "Plan architectural", mime: "application/pdf" };
const body = { messages: [{ role: "user", content: "Analyse" }], docs: [doc] };
describe("Chat limits", () => {
  it("accepts 10 documents", () => expect(validateChatBody({ ...body, docs: Array(10).fill(doc) }).docs).toHaveLength(10));
  it("rejects 11 documents with 400", () => { try { validateChatBody({ ...body, docs: Array(11).fill(doc) }); throw Error("accepted"); } catch(e) { expect(e).toBeInstanceOf(ChatRequestError); expect((e as ChatRequestError).status).toBe(400); } });
  it("rejects oversized individual encoded files with 413", () => { try { validateChatBody({ ...body, docs: [{ ...doc, dataUrl: "x".repeat(CHAT_LIMITS.dataUrlBytes + 1) }] }); throw Error("accepted"); } catch(e) { expect((e as ChatRequestError).status).toBe(413); } });
  it("rejects total request over 30 MiB", () => expect(() => serializeChatBody({ ...body, docs: Array(2).fill({ ...doc, dataUrl: "data:application/pdf;base64," + "A".repeat(16 * 1024 * 1024) }) })).toThrow("30 Mo"));
  it("rejects an oversized declared body before reading", async () => { await expect(readChatBody(new Request("https://app.test/api/chat", { method: "POST", headers: { "content-length": String(CHAT_LIMITS.requestBytes + 1) }, body: "{}" }))).rejects.toMatchObject({ status: 413 }); });
  it("rejects invalid JSON with 400", async () => { await expect(readChatBody(new Request("https://app.test/api/chat", { method: "POST", body: "{" }))).rejects.toMatchObject({ status: 400 }); });
  it("rejects chunked oversized bodies", async () => { const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(CHAT_LIMITS.requestBytes + 1)); c.close(); } }); await expect(readChatBody(new Request("https://app.test/api/chat", { method: "POST", body: stream, duplex: "half" } as RequestInit))).rejects.toMatchObject({ status: 413 }); });
});