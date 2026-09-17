import { describe, expect, it } from "vitest";
import bank from "../../content/conditional-rephrase.json";
import { buildLegacyPaperDiagramChoices, buildPaperDiagramChoices, diagramSignature, flip } from "./diagramChoices";

describe("historical Conditional Rephrase paper choices", () => {
  it("builds five deterministic choices for every authored item", () => {
    for (const item of bank.items) {
      const first = buildLegacyPaperDiagramChoices(item.credited_answers, item.order);
      const second = buildLegacyPaperDiagramChoices(item.credited_answers, item.order);

      expect(first, `item ${item.order}`).toHaveLength(5);
      expect(first.map((choice) => choice.id)).toEqual(second.map((choice) => choice.id));
      expect(new Set(first.map((choice) => choice.id)).size, `item ${item.order}`).toBe(5);
      expect(first.filter((choice) => choice.verdict === "correct").map((choice) => choice.id)).toEqual(["direct"]);
      const atoms = [...new Set(first.flatMap((choice) => choice.routes.flatMap((route) => [route.ifSide.text, route.thenSide.text])))];
      expect(new Set(first.map((choice) => diagramSignature(choice.routes, atoms))).size, `equivalent choices in item ${item.order}`).toBe(5);
    }
  });

  it("renders both routes for the final two-conditional item", () => {
    const finalItem = bank.items.at(-1)!;
    const choices = buildLegacyPaperDiagramChoices(finalItem.credited_answers, finalItem.order);

    expect(choices.find((choice) => choice.id === "direct")?.routes).toHaveLength(2);
    expect(choices.find((choice) => choice.id === "direct")?.responseText).toContain(" And If ");
  });

  it("requires both directions of the biconditional without rejecting an equivalent complete form", () => {
    const item = bank.items[47];
    const choices = buildLegacyPaperDiagramChoices(item.credited_answers, item.order);
    const correct = choices.find((choice) => choice.verdict === "correct")!;
    expect(correct.routes).toHaveLength(2);
    const atoms = [...new Set(correct.routes.flatMap((route) => [route.ifSide.text, route.thenSide.text]))];
    expect(diagramSignature(correct.routes, atoms)).toBe("1001");
    expect(diagramSignature(correct.routes, atoms)).toBe(diagramSignature(flip(correct.routes), atoms));
    expect(choices.filter((choice) => choice.routes.length === 1)).toHaveLength(2);
  });

  it("does not leave the credited positions fixed between questions", () => {
    const positions = bank.items.slice(0, 12).map((item) =>
      buildLegacyPaperDiagramChoices(item.credited_answers, item.order)
        .map((choice, index) => (choice.verdict === "correct" ? index : -1))
        .filter((index) => index >= 0)
        .join(","),
    );

    expect(new Set(positions).size).toBeGreaterThan(3);
  });
});


describe("paired conditional answers", () => {
  it("covers all 62 items with four distinct labelled pairs and exactly one fully correct answer", () => {
    expect(bank.items).toHaveLength(62);
    for (const item of bank.items) {
      const choices = buildPaperDiagramChoices(item.credited_answers, item.order);
      expect(choices, `item ${item.order}`).toHaveLength(4);
      expect(choices).toEqual(buildPaperDiagramChoices(item.credited_answers, item.order));
      const correct = choices.find(choice => choice.id === "paired-correct")!;
      const atoms = [...new Set(correct.routes.flatMap(route => [route.ifSide.text, route.thenSide.text]))];
      const signature = (routes: typeof correct.routes) => diagramSignature(routes, atoms);
      const credited = signature(correct.routes);
      expect(new Set(choices.map(choice => `${signature(choice.routes)}:${signature(choice.contrapositiveRoutes!)}`)).size).toBe(4);
      expect(choices.filter(choice => choice.verdict === "correct").map(choice => choice.id)).toEqual(["paired-correct"]);
      expect(new Set(choices.map(choice => `${choice.translationCorrect}:${choice.contrapositiveCorrect}`))).toEqual(new Set(["true:true", "true:false", "false:true", "false:false"]));
      for (const choice of choices) {
        expect(choice.translationCorrect).toBe(signature(choice.routes) === credited);
        expect(choice.contrapositiveCorrect).toBe(signature(choice.contrapositiveRoutes!) === signature(flip(choice.routes)));
        expect(choice.routes).toHaveLength(correct.routes.length);
        expect(choice.contrapositiveRoutes).toHaveLength(correct.routes.length);
        expect(choice.responseText).toContain("Diagram: ");
        expect(choice.responseText).toContain(" Contrapositive: ");
      }
    }
  });

  it("distinguishes a good contrapositive of a bad translation from a fully correct pair", () => {
    const choices = buildPaperDiagramChoices(["If P, then Q."], 1);
    const wrongTranslation = choices.find(choice => choice.id === "paired-contrapositive-only")!;
    expect(wrongTranslation.routes[0].ifSide.text).toBe("Q");
    expect(wrongTranslation.contrapositiveRoutes).toEqual(flip(wrongTranslation.routes));
    expect(wrongTranslation.verdict).toBe("partial");
    const neither = choices.find(choice => choice.id === "paired-neither")!;
    expect(neither.translationCorrect).toBe(false);
    expect(neither.contrapositiveCorrect).toBe(false);
  });

  it("keeps both directions and premises in every pair for the biconditional and chain", () => {
    for (const order of [48, 62]) {
      const item = bank.items[order - 1];
      const choices = buildPaperDiagramChoices(item.credited_answers, order);
      for (const choice of choices) {
        expect(choice.routes).toHaveLength(2);
        expect(choice.contrapositiveRoutes).toHaveLength(2);
      }
    }
  });

  it("negates each complete compound condition without dropping either conjunct", () => {
    for (const order of [56, 57, 58]) {
      const item = bank.items[order - 1];
      const correct = buildPaperDiagramChoices(item.credited_answers, order).find(choice => choice.verdict === "correct")!;
      expect(correct.routes[0].thenSide.text).toMatch(/ and /);
      expect(correct.contrapositiveRoutes![0].ifSide).toEqual({ ...correct.routes[0].thenSide, inverted: true });
    }
  });
});
