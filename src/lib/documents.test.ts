import { describe, expect, it } from "vitest";
import { guessKind } from "./documents";
describe("Document classification", () => {
  it("prioritizes a CCTP filename over plan and niveau in text", () => expect(guessKind("CCTP_lot_02.pdf", "plan niveau façade coupe étage")).toBe("CCTP"));
  it("prioritizes a devis filename over a text label", () => expect(guessKind("devis.pdf", "CCTP")).toBe("Devis"));
  it("scores specific text labels above incidental plan vocabulary", () => expect(guessKind("document.pdf", "CCTP avec un plan au niveau de la façade")).toBe("CCTP"));
  it("does not match partial words", () => expect(guessKind("plantation.pdf", "surfacture nivellement")).toBe("Document"));
  it("identifies accented filenames", () => expect(guessKind("procès-verbal.pdf")).toBe("Procès-verbal"));
  it("recognizes a plan filename", () => expect(guessKind("plan_RDC.pdf", "rapport")).toBe("Plan architectural"));
});