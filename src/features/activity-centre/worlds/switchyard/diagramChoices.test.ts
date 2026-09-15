import { describe, expect, it } from "vitest";
import bank from "../../content/conditional-rephrase.json";
import { buildPaperDiagramChoices } from "./diagramChoices";

describe("Conditional Rephrase paper choices", () => {
  it("builds five deterministic choices for every authored item", () => {
    for (const item of bank.items) {
      const first = buildPaperDiagramChoices(item.credited_answers, item.order);
      const second = buildPaperDiagramChoices(item.credited_answers, item.order);

      expect(first, `item ${item.order}`).toHaveLength(5);
      expect(first.map((choice) => choice.id)).toEqual(second.map((choice) => choice.id));
      expect(new Set(first.map((choice) => choice.id)).size, `item ${item.order}`).toBe(5);
      expect(first.filter((choice) => choice.verdict === "correct").map((choice) => choice.id).sort()).toEqual([
        "contrapositive",
        "direct",
      ]);
    }
  });

  it("renders both routes for the final two-conditional item", () => {
    const finalItem = bank.items.at(-1)!;
    const choices = buildPaperDiagramChoices(finalItem.credited_answers, finalItem.order);

    expect(choices.every((choice) => choice.routes.length === 2)).toBe(true);
    expect(choices.find((choice) => choice.id === "direct")?.responseText).toContain(" And If ");
  });

  it("does not leave the credited positions fixed between questions", () => {
    const positions = bank.items.slice(0, 12).map((item) =>
      buildPaperDiagramChoices(item.credited_answers, item.order)
        .map((choice, index) => (choice.verdict === "correct" ? index : -1))
        .filter((index) => index >= 0)
        .join(","),
    );

    expect(new Set(positions).size).toBeGreaterThan(3);
  });
});
