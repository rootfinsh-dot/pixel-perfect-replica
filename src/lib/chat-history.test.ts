import { expect, it } from "vitest";
import { historyKey, readHistory } from "./chat-history";
it("keeps chat history isolated by project and owner", () => {
  localStorage.clear();
  localStorage.setItem(historyKey("owner", "one"), JSON.stringify([{ role: "user", content: "Question" }, { role: "assistant", content: "Réponse" }]));
  expect(readHistory(historyKey("owner", "one"))).toHaveLength(2);
  expect(readHistory(historyKey("owner", "two"))).toBeNull();
  expect(readHistory(historyKey("other", "one"))).toBeNull();
});