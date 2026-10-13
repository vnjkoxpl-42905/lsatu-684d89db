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
    for (const n of [39, 43, 48]) {
      const comp = byOrder(n).answer_key!.relationships.find((r) => r.type === "comparative")!;
      expect(comp.required_parts?.[0].length).toBe(2);
    }
  });

  it("contextual comparisons carry their benchmark", () => {
    for (const n of [10, 29, 35, 36, 47]) expect(byOrder(n).answer_key!.context_benchmark).toBeTruthy();
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
  });
});
