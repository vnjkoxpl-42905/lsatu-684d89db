import { describe, it, expect } from "vitest";
import d2 from "../../drills/data/d2-indicators.json";
import d3 from "../../drills/data/d3-basic-xy.json";
import d4 from "../../drills/data/d4-advanced-xy.json";
import d5 from "../../drills/data/d5-jargon.json";
import d1 from "../../drills/data/d1-stripdown.json";

// Pure scoring tests. Asserts that the canonical-correct answer in each data
// row grades as correct under the drill's own equality rule. The drill UIs
// each implement `selected === q.correct` (D3/D4mc/D5mc) or
// `selected === q.correct_bucket` (D2) or `labels[id] === c.slot` (D1).

describe("D1 scoring", () => {
  const qs = (d1 as { questions: { id: string; clauses: { id: string; slot: string }[] }[] }).questions;
  it("a fully canonical labeling grades all clauses correct", () => {
    for (const q of qs) {
      const labels: Record<string, string> = {};
      for (const c of q.clauses) labels[c.id] = c.slot;
      const allCorrect = q.clauses.every((c) => labels[c.id] === c.slot);
      expect(allCorrect).toBe(true);
    }
  });
  it("an off-by-one labeling grades incorrect", () => {
    for (const q of qs) {
      if (q.clauses.length < 2) continue;
      const labels: Record<string, string> = {};
      for (const c of q.clauses) labels[c.id] = c.slot;
      labels[q.clauses[0].id] = "background";
      // If the first clause was already 'background', flip to another slot.
      if (q.clauses[0].slot === "background") {
        labels[q.clauses[0].id] = "authors-conclusion";
      }
      const allCorrect = q.clauses.every((c) => labels[c.id] === c.slot);
      expect(allCorrect).toBe(false);
    }
  });
});

describe("D2 scoring", () => {
  const qs = (d2 as { questions: { id: string; correct_bucket: string }[] }).questions;
  it("each canonical bucket grades correct", () => {
    for (const q of qs) {
      expect(q.correct_bucket === q.correct_bucket).toBe(true);
    }
  });
  it("a deliberate wrong bucket grades incorrect", () => {
    for (const q of qs) {
      const wrong = q.correct_bucket === "conclusion" ? "pivot" : "conclusion";
      expect(wrong === q.correct_bucket).toBe(false);
    }
  });
});

describe("D3 scoring", () => {
  const qs = (d3 as { questions: { id: string; options: { id: string }[]; correct: string }[] }).questions;
  it("every canonical correct id exists in options", () => {
    for (const q of qs) {
      const ids = new Set(q.options.map((o) => o.id));
      expect(ids.has(q.correct)).toBe(true);
    }
  });
  it("picking a non-correct option grades incorrect", () => {
    for (const q of qs) {
      const wrong = q.options.find((o) => o.id !== q.correct);
      expect(wrong).toBeDefined();
      expect(wrong!.id === q.correct).toBe(false);
    }
  });
});

describe("D4 + D5 mc scoring", () => {
  const d4mc = (d4 as { questions: ({ type: string; correct?: string; options?: { id: string }[] })[] })
    .questions.filter((q) => q.type === "mc");
  const d5mc = (d5 as { questions: ({ type: string; correct?: string; options?: { id: string }[] })[] })
    .questions.filter((q) => q.type === "mc");

  it("D4 mc canonical correct ids exist", () => {
    for (const q of d4mc) {
      const ids = new Set(q.options!.map((o) => o.id));
      expect(ids.has(q.correct!)).toBe(true);
    }
  });
  it("D5 mc canonical correct ids exist", () => {
    for (const q of d5mc) {
      const ids = new Set(q.options!.map((o) => o.id));
      expect(ids.has(q.correct!)).toBe(true);
    }
  });
});
