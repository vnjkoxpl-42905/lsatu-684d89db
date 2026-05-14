import { describe, it, expect } from "vitest";
import {
  TRANSLATION_BUCKETS,
  type TaggedStimulus,
  type DecoderCard,
  type FlashcardSet,
} from "../../types";
import taggedData from "../../content/stimuli/tagged-stimuli.json";
import decoderData from "../../content/stimuli/decoder-cards.json";
import flashcardsData from "../../content/flashcards.json";
import d1 from "../../drills/data/d1-abstract-language.json";
import d2 from "../../drills/data/d2-translation-buckets.json";
import d3 from "../../drills/data/d3-basic-xy.json";
import d4 from "../../drills/data/d4-advanced-xy.json";
import d5 from "../../drills/data/d5-jargon.json";

const BUCKET_SET = new Set<string>(TRANSLATION_BUCKETS);

describe("tagged-stimuli schema", () => {
  const stimuli = (taggedData as { stimuli: TaggedStimulus[] }).stimuli;

  it("has at least one tagged stimulus", () => {
    expect(stimuli.length).toBeGreaterThanOrEqual(1);
  });

  it("every token has a valid translation bucket", () => {
    for (const s of stimuli) {
      for (const t of s.tokens) {
        expect(BUCKET_SET.has(t.bucket)).toBe(true);
      }
    }
  });
});

describe("decoder-cards schema", () => {
  const cards = (decoderData as { cards: DecoderCard[] }).cards;

  it("has at least 15 cards", () => {
    expect(cards.length).toBeGreaterThanOrEqual(15);
  });

  it("every card has all 5 required fields", () => {
    for (const c of cards) {
      expect(c.id).toBeTruthy();
      expect(c.abstract_phrase).toBeTruthy();
      expect(c.plain_english).toBeTruthy();
      expect(c.example_stimulus).toBeTruthy();
      expect(c.x_concrete).toBeTruthy();
      expect(c.y_concrete).toBeTruthy();
    }
  });
});

describe("flashcards schema", () => {
  const fc = flashcardsData as FlashcardSet;

  it("has at least one card", () => {
    expect(fc.cards.length).toBeGreaterThanOrEqual(1);
  });

  it("every card has a valid difficulty tag", () => {
    const allowed = new Set(["foundation", "core", "advanced"]);
    for (const c of fc.cards) {
      expect(allowed.has(c.difficulty_tag)).toBe(true);
    }
  });

  it("every card has topic_tag abstract", () => {
    for (const c of fc.cards) {
      expect(c.topic_tag).toBe("abstract");
    }
  });

  it("every concept_tag is one of glossary / translation-language / verb-taxonomy", () => {
    const allowed = new Set(["glossary", "translation-language", "verb-taxonomy"]);
    for (const c of fc.cards) {
      expect(allowed.has(c.concept_tag)).toBe(true);
    }
  });
});

describe("drill data contracts", () => {
  it("D1 has at least 10 abstract-phrase translation questions", () => {
    const qs = (d1 as {
      questions: { id: string; phrase: string; options: { id: string; text: string }[]; correct: string }[];
    }).questions;
    expect(qs.length).toBeGreaterThanOrEqual(10);
    for (const q of qs) {
      expect(q.phrase).toBeTruthy();
      expect(q.options.length).toBe(4);
      expect(q.options.some((o) => o.id === q.correct)).toBe(true);
    }
  });

  it("D2 has 18 questions and every correct_bucket is a valid translation bucket (not neutral)", () => {
    const qs = (d2 as { questions: { correct_bucket: string }[] }).questions;
    expect(qs.length).toBe(18);
    const nonNeutral = new Set(["assumption", "causal", "comparison", "evidence", "evaluation"]);
    for (const q of qs) {
      expect(nonNeutral.has(q.correct_bucket)).toBe(true);
    }
  });

  it("D3 has 8 questions plus a bonus", () => {
    const qs = (d3 as { questions: unknown[] }).questions;
    expect(qs.length).toBeGreaterThanOrEqual(9);
  });

  it("D4 has 10 questions mixing MC and reverse-engineer types", () => {
    const qs = (d4 as { questions: { type: string }[] }).questions;
    expect(qs.length).toBe(10);
    const types = new Set(qs.map((q) => q.type));
    expect(types.has("mc")).toBe(true);
    expect(types.has("reverse-engineer")).toBe(true);
  });

  it("D5 has 9 questions, mix of mc and definition", () => {
    const qs = (d5 as { questions: { type: string }[] }).questions;
    expect(qs.length).toBe(9);
    const types = new Set(qs.map((q) => q.type));
    expect(types.has("mc")).toBe(true);
    expect(types.has("definition")).toBe(true);
  });
});
