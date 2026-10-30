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
    for (const n of [11, 25, 34, 39, 40, 43, 48]) {
      const comp = byOrder(n).answer_key!.relationships.find((r) => r.type === "comparative")!;
      expect(comp.required_parts?.[0].length).toBe(2);
    }
  });

  it("contextual comparisons carry their benchmark", () => {
    for (const n of [10, 29, 31, 35, 36, 47]) expect(byOrder(n).answer_key!.context_benchmark).toBeTruthy();
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
  it("accepts the unquoted causal indicator without treating it as another type label", () => {
    for (const answer of ['Causal, caused', 'Causal, "caused"', 'causal: caused', 'cause and effect, caused'])
      expect(matchesCredited(byOrder(5), answer), answer).toBe(true);
  });
  it("refers whole sentences and shared multi-type spans instead of guessing pair recognition", () => {
    const q28 = byOrder(28);
    expect(matchesCredited(byOrder(5), `causal, ${byOrder(5).prompt}`)).toBe(false);
    expect(matchesCredited(q28, `comparative, ${q28.prompt}; causal, ${q28.prompt}`)).toBe(false);
    expect(matchesCredited(byOrder(34), 'comparative, harder ... than; causal, so masons reserve it for thresholds, but only if; conditional, so masons reserve it for thresholds, but only if')).toBe(false);
    expect(matchesCredited(byOrder(26), 'causal, because the sluice was left open')).toBe(true);
    expect(matchesCredited(q28, 'comparative, more evenly than; causal, since its flue draws efficiently')).toBe(true);
    expect(matchesCredited(byOrder(34), 'comparative, harder stone than; causal, so; conditional, only if')).toBe(true);
  });
  it("preserves comma-delimited separate types and rejects swapped pairs", () => {
    expect(matchesCredited(byOrder(28), 'comparative, more evenly than, causal, since')).toBe(true);
    expect(matchesCredited(byOrder(28), 'comparative, since, causal, more evenly than')).toBe(false);
  });
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


describe("approved contextual corrections", () => {
  it.each([[28, "draws", "since"], [30, "cure", "since"], [33, "lags", "because"],
    [35, "silted", "Because"], [41, "follows", "because"], [42, "inflate", "since"]])(
    "Q%s credits the causal connective, not the standalone event verb", (order, removed, connective) => {
      const item = byOrder(Number(order));
      const causal = item.answer_key!.relationships.find((r) => r.type === "causal")!;
      expect(causal.indicators).toEqual([connective]);
      const answer = (quote: string) => item.answer_key!.relationships.map((r) =>
        `${r.type}, "${r.type === "causal" ? quote : r.indicators[0]}"`).join("; ");
      expect(matchesCredited(item, answer(String(removed)))).toBe(false);
      expect(matchesCredited(item, answer(String(connective)))).toBe(true);
      const tail = item.prompt.slice(item.prompt.toLowerCase().indexOf(String(connective).toLowerCase()));
      // Q35 starts with Because; quoting its entire tail now repeats the prompt.
      const clause = Number(order) === 35 ? tail.split(',')[0] : tail;
      expect(matchesCredited(item, answer(clause))).toBe(true);
    },
  );

  it("keeps the Q35 prompt and all authored causal surfaces on Because", () => {
    expect(byOrder(35).prompt).toMatch(/^Because the mill race silted/);
    expect(JSON.stringify(byOrder(35))).not.toMatch(/since/i);
  });

  it("Q31 accepts each comparison independently without inventing the light bell's mould", () => {
    const item = byOrder(31);
    for (const quote of ["heavier", "farther than", "larger"])
      expect(matchesCredited(item, `comparative, "${quote}"; causal, "which is why"`)).toBe(true);
    expect(item.explanation).toContain("doesn't say which mould was used for the light bell");
    expect(item.answer_key!.context_benchmark).toContain("smaller alternative mould");
  });

  it("Q34 describes the quarry and Q46 attributes an effect within the exception", () => {
    expect(byOrder(34).prompt).toMatch(/^The eastern quarry contains harder stone than the western/);
    const item = byOrder(46);
    expect(matchesCredited(item, 'causal, "offsets"; comparative, "higher than"; conditional, "unless"')).toBe(true);
    expect(item.explanation).toContain("doesn't say subsidence occurred");
    expect(item.explanation).toContain("does not settle the heights");
  });

  it("Q47 teaches its actual pressure threshold and feedback loop", () => {
    const item = byOrder(47);
    expect(JSON.stringify(item)).not.toMatch(/flux/i);
    expect(item.explanation).toContain("feedback loop");
    expect(item.explanation).toContain("does not guarantee fouling");
  });

  it("Q40 teaches provided as sufficient and does not impose necessity", () => {
    const item = byOrder(40);
    expect(item.explanation).toContain("gives a sufficient condition");
    expect(item.explanation).toContain("if the electrolyte is chloride-free, the stated result follows");
    expect(item.explanation).toContain("does not establish that chloride-free electrolyte is necessary");
    expect(item.explanation).not.toContain("electrolyte must be chloride-free");
    expect(content.instructions.rules[1]).toContain("what follows from a condition or what is required");
  });

  it("the instructions teach contextual causation, when, only where and unless with limits", () => {
    const all = [...content.instructions.rules, ...content.instructions.coach.rubric,
      ...content.instructions.coach.grading_rubric].join(" ");
    expect(all).toContain("not automatically causal");
    expect(all).toContain("when merely locates an event in time");
    expect(all).toContain("A dry surface alone does not guarantee adhesion");
    expect(all).toContain("not higher -> cannot work");
    expect(all).toContain("Do not infer a converse or any guarantee from the exception itself");
    expect(content.instructions.coach.drill).toContain("signal it");
    expect(content.instructions.coach.drill).not.toContain("create it");
  });
});
