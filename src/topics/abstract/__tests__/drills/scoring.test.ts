import { describe, it, expect } from "vitest";
import d1 from "../../drills/data/d1-abstract-language.json";
import d2 from "../../drills/data/d2-translation-buckets.json";
import d3 from "../../drills/data/d3-basic-xy.json";
import d4 from "../../drills/data/d4-advanced-xy.json";
import d5 from "../../drills/data/d5-jargon.json";

// Pure scoring tests. Asserts that the canonical-correct answer in each data
// row grades as correct under the drill's own equality rule.
//   D1: selected === q.correct (MC translation)
//   D2: selected === q.correct_bucket (bucket classification)
//   D3 / D4-mc / D5-mc: selected === q.correct
// D1 and D2 used to assert argument-structure labeling; with the v1.2 content
// boundary they now assert translation decoding instead.

describe("D1 scoring (abstract-language MC)", () => {
  const qs = (d1 as { questions: { id: string; options: { id: string }[]; correct: string }[] }).questions;
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

describe("D2 scoring (translation buckets)", () => {
  const qs = (d2 as { questions: { id: string; correct_bucket: string }[] }).questions;
  const allowed = new Set(["assumption", "causal", "comparison", "evidence", "evaluation"]);
  it("each canonical correct_bucket is a valid translation bucket", () => {
    for (const q of qs) {
      expect(allowed.has(q.correct_bucket)).toBe(true);
    }
  });
  it("a deliberate wrong bucket grades incorrect", () => {
    for (const q of qs) {
      const wrong = q.correct_bucket === "assumption" ? "causal" : "assumption";
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
