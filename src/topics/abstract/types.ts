// Canonical type contracts for the Abstract topic.
//
// Abstract is the LSAT-ese to plain-English decoding bootcamp. Argument-part
// labeling (premise/conclusion, opposing-view, concession, slot tagging) lives
// in Intro to LR, not here. The types in this file describe translation,
// keyword decoding, X/Y mapping, and method-pattern recognition only.

// TranslationBucket: the five language categories the bootcamp teaches a
// student to spot inside an abstract answer choice or stimulus.
// "neutral" is the no-op bucket for inline text that isn't doing any of
// the five jobs.
export type TranslationBucket =
  | "assumption"
  | "causal"
  | "comparison"
  | "evidence"
  | "evaluation"
  | "neutral";

export const TRANSLATION_BUCKETS: TranslationBucket[] = [
  "assumption",
  "causal",
  "comparison",
  "evidence",
  "evaluation",
  "neutral",
];

export interface TaggedToken {
  text: string;
  bucket: TranslationBucket;
}

export interface TaggedStimulus {
  id: string;
  tokens: TaggedToken[];
}

export interface DecoderCard {
  id: string;
  abstract_phrase: string;
  plain_english: string;
  example_stimulus: string;
  x_concrete: string;
  y_concrete: string;
}

export interface FlashcardEntry {
  id: string;
  front: string;
  back: string;
  example?: string;
  concept_tag: "glossary" | "translation-language" | "verb-taxonomy";
  difficulty_tag: "foundation" | "core" | "advanced";
  topic_tag: "abstract";
}

export interface FlashcardSet {
  topic: "abstract";
  cards: FlashcardEntry[];
}

// D1 Abstract Language Warm-Up: MC translation. Show an abstract phrase,
// pick the plain-English option that matches.
export interface D1Option {
  id: string;
  text: string;
}

export interface D1Question {
  id: string;
  phrase: string;
  options: D1Option[];
  correct: string;
  explanation: string;
}

export interface MCOption {
  id: string;
  text: string;
}

// MCQuestion: shared shape for D2/D3-style auto-graded bucket / option drills.
// `correct_bucket` is consumed by D2 (Translation Buckets). `correct` is the
// option id for option-style drills.
export interface MCQuestion {
  id: string;
  type?: "mc";
  word_or_phrase?: string;
  phrase?: string;
  prompt?: string;
  options: MCOption[];
  buckets?: TranslationBucket[];
  correct: string;
  correct_bucket?: TranslationBucket;
  explanation: string;
}

export interface ReverseEngineerQuestion {
  id: string;
  type: "reverse-engineer";
  flaw_description: string;
  model_answer: {
    logic_summary: string;
    example: string;
  };
}

export interface DefinitionQuestion {
  id: string;
  type: "definition";
  prompt: string;
  model_answer: string;
}

export type DrillQuestion =
  | MCQuestion
  | ReverseEngineerQuestion
  | DefinitionQuestion;

export type AttemptResult<T = void> =
  | { ok: true; value?: T }
  | { ok: false; error: unknown };
