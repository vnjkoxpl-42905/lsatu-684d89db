import { describe, it, expect } from "vitest";
import {
  SLOT_IDS,
  INDICATOR_BUCKETS,
  type PlaygroundStimulus,
  type TaggedStimulus,
  type DecoderCard,
  type FlashcardSet,
} from "../../types";
import playgroundData from "../../content/stimuli/playground-stimuli.json";
import taggedData from "../../content/stimuli/tagged-stimuli.json";
import decoderData from "../../content/stimuli/decoder-cards.json";
import flashcardsData from "../../content/flashcards.json";
import d1 from "../../drills/data/d1-stripdown.json";
import d2 from "../../drills/data/d2-indicators.json";
import d3 from "../../drills/data/d3-basic-xy.json";
import d4 from "../../drills/data/d4-advanced-xy.json";
import d5 from "../../drills/data/d5-jargon.json";

const SLOT_SET = new Set<string>(SLOT_IDS);
const BUCKET_SET = new Set<string>(INDICATOR_BUCKETS);

describe("playground-stimuli schema", () => {
  const stimuli = (playgroundData as { stimuli: PlaygroundStimulus[] }).stimuli;

  it("has at least 12 stimuli", () => {
    expect(stimuli.length).toBeGreaterThanOrEqual(12);
  });

  it("every clause has a valid slot", () => {
    for (const s of stimuli) {
      for (const c of s.clauses) {
        expect(SLOT_SET.has(c.slot)).toBe(true);
      }
    }
  });

  it("every indicator word maps to a known bucket", () => {
    for (const s of stimuli) {
      for (const w of s.indicator_words) {
        expect(BUCKET_SET.has(w.bucket)).toBe(true);
      }
    }
  });
});

describe("tagged-stimuli schema", () => {
  const stimuli = (taggedData as { stimuli: TaggedStimulus[] }).stimuli;

  it("contains the chapter mount-point stimuli", () => {
    const ids = new Set(stimuli.map((s) => s.id));
    expect(ids.has("ts-tomatoes")).toBe(true);
    expect(ids.has("ts-apatosaurus")).toBe(true);
    expect(ids.has("ts-marketing")).toBe(true);
  });

  it("every token has a valid bucket", () => {
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

  it("has exactly 68 cards", () => {
    expect(fc.cards.length).toBe(68);
  });

  it("all three concept tags present", () => {
    const concepts = new Set(fc.cards.map((c) => c.concept_tag));
    expect(concepts.has("glossary")).toBe(true);
    expect(concepts.has("indicator")).toBe(true);
    expect(concepts.has("verb-taxonomy")).toBe(true);
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
});

describe("drill data contracts", () => {
  it("D1 has at least 5 questions, each with clauses bound to valid slots", () => {
    const qs = (d1 as { questions: { id: string; clauses: { slot: string }[] }[] })
      .questions;
    expect(qs.length).toBeGreaterThanOrEqual(5);
    for (const q of qs) {
      for (const c of q.clauses) expect(SLOT_SET.has(c.slot)).toBe(true);
    }
  });

  it("D2 has 18 questions and every correct_bucket is valid", () => {
    const qs = (d2 as { questions: { correct_bucket: string }[] }).questions;
    expect(qs.length).toBe(18);
    for (const q of qs) {
      expect(BUCKET_SET.has(q.correct_bucket)).toBe(true);
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
