import { describe, expect, it } from "vitest";
import content from "./spot-the-relationship.json";
import { matchesCredited } from "../worlds/observatory/observatory";
import type { ActivityItem } from "../api/types";

const items = content.items as unknown as ActivityItem[];
const byOrder = (n: number) => items.find((i) => i.order === n)!;
const correct = (i: ActivityItem) =>
  i.answer_key!.relationships.map((r) => `${r.type}, ${r.indicators.map((x) => `"${x}"`).join(" and ")}`).join("; ");

describe("Spot the Relationship answer key", () => {
  it("every question has both a grading key and a separate explanation", () => {
    expect(items).toHaveLength(48);
    for (const i of items) {
      expect(i.explanation.trim().length).toBeGreaterThan(0);
      const key = i.answer_key!;
      expect(key.relationships.length).toBeGreaterThan(0);
      for (const r of key.relationships) {
        expect(["conditional", "causal", "comparative"]).toContain(r.type);
        expect(r.indicators.length).toBeGreaterThan(0);
        expect(r.connects.trim()).not.toBe("");
        expect(r.why.trim()).not.toBe("");
      }
      expect(Array.isArray(key.traps)).toBe(true);
      // The key pairs exactly what the reviewed credited answer pairs.
      expect(correct(i)).toBe(i.credited_answers[0]);
    }
  });

  it("separated comparatives record both required halves", () => {
    for (const n of [25, 34, 39, 40, 43, 48]) {
      const comp = byOrder(n).answer_key!.relationships.find((r) => r.type === "comparative")!;
      expect(comp.required_parts?.[0].length).toBe(2);
    }
  });

  it("contextual comparisons carry their benchmark", () => {
    for (const n of [10, 29, 35, 36, 47]) expect(byOrder(n).answer_key!.context_benchmark).toBeTruthy();
  });

  it("every connection is complete and every indicator is in the sentence", () => {
    const flat = (t: string) => t.toLowerCase().replace(/\s*(\.\.\.|…)\s*/g, " ");
    for (const i of items) for (const r of i.answer_key!.relationships) {
      expect(r.connects, `item ${i.order}`).toMatch(/\S+.*->.*\S+/);
      for (const ind of r.required_parts ? [] : r.indicators) for (const part of ind.split(/\s*(?:\.\.\.|…)\s*/))
        expect(i.prompt.toLowerCase(), `item ${i.order} ${part}`).toContain(part.toLowerCase());
      for (const parts of r.required_parts ?? []) for (const p of parts) expect(flat(i.prompt)).toContain(p.toLowerCase());
    }
  });

  it("every explanation teaches each type with its indicator, plainly", () => {
    const flat = (t: string) => t.toLowerCase().replace(/\s*(\.\.\.|…)\s*/g, " ");
    for (const i of items) {
      const rels = i.answer_key!.relationships;
      expect(i.explanation, `item ${i.order}`).not.toMatch(/—/);
      expect(i.explanation.split(/\s+/).length / rels.length, `item ${i.order} is too thin`).toBeGreaterThanOrEqual(12);
      for (const r of rels) expect(flat(i.explanation), `item ${i.order}`).toContain(flat(r.indicators[0]));
    }
    // Item 29 used to be a count and a difficulty remark only.
    expect(byOrder(29).explanation).toMatch(/trapped water/);
    expect(byOrder(29).explanation).not.toMatch(/first sentence that carries all three/);
  });

  it("item 36 accepts one valid comparative indicator and explains longer as optional", () => {
    const i = byOrder(36);
    expect(matchesCredited(i, 'conditional, "when"; comparative, "softer than"; causal, "drives"')).toBe(true);
    expect(i.answer_key!.traps.join(" ")).not.toMatch(/only 'softer than'/i);
    expect(i.explanation).toMatch(/Longer\* is another valid comparison/);
  });

  it("the active rubric separates sufficient from necessary language", () => {
    const all = [...content.instructions.coach.rubric, ...content.instructions.coach.grading_rubric].join(" ");
    expect(all).not.toMatch(/contingent on and provided/);
    expect(all).toMatch(/if, provided and whenever/);
    expect(all).toMatch(/only if, (only when, )?requires, depends on and contingent on/);
  });

  it("the rubric covers pair grading", () => {
    const rubric = content.instructions.coach.grading_rubric as string[];
    expect(rubric.join(" ")).toMatch(/Partial/);
    expect(rubric.join(" ")).toMatch(/both halves/);
  });
});

describe("instant grading stays confident-only", () => {
  it.each(items.map((i) => [i.order, i]))("credits the keyed answer for item %s instantly", (_n, i) => {
    expect(matchesCredited(i as ActivityItem, correct(i as ActivityItem))).toBe(true);
  });
  const i27 = byOrder(27);
  it.each([
    ["type only", "conditional; causal"],
    ["indicator only", '"only if", "because", "accelerates"'],
    ["missing type", 'conditional, "only if"'],
    ["invented type", 'conditional, "only if"; causal, "because"; comparative, "four degrees"'],
    ["swapped pair", 'causal, "only if"; conditional, "because"'],
  ])("sends a %s answer to the AI grader", (_label, answer) => {
    expect(matchesCredited(i27, answer)).toBe(false);
  });
  it("needs both halves of a split comparative", () => {
    expect(matchesCredited(byOrder(43), 'causal, "lowers"; comparative, "faster"')).toBe(false);
    expect(matchesCredited(byOrder(25), 'comparative, "stronger"')).toBe(false);
    expect(matchesCredited(byOrder(25), 'Comparison: "stronger ... than"')).toBe(true);
    expect(matchesCredited(byOrder(34), 'comparative, harder; causal, so; conditional, only if')).toBe(false);
    expect(matchesCredited(byOrder(40), "causal 'so'; comparative 'thicker … than'; conditional 'provided'")).toBe(true);
  });
  it("sends a conflicting extra pair to the AI grader", () => {
    expect(matchesCredited(i27, 'conditional, "only if"; causal, "because"; causal, "only if"')).toBe(false);
  });
  it("credits a contextual comparison with no second named object", () => {
    expect(matchesCredited(byOrder(47), 'conditional, only when; comparative, higher still; causal, drives')).toBe(true);
    expect(matchesCredited(byOrder(31), 'comparative, "heavier"; causal, "which is why"')).toBe(true);
  });
  it("never instant-credits when the key drifts from the credited answer", () => {
    const drifted = { ...i27, answer_key: { ...i27.answer_key!, relationships: i27.answer_key!.relationships.slice(0, 1) } };
    expect(matchesCredited(drifted, correct(i27))).toBe(false);
  });
});
