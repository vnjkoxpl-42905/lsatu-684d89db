// Canonical type contracts for the Abstract topic. Schemas align with the
// build brief §6, §7, §8, §10.

export type SlotId =
  | "background"
  | "opposing-conclusion"
  | "opposing-evidence"
  | "concession"
  | "authors-conclusion"
  | "intermediate-conclusion"
  | "authors-evidence";

export const SLOT_IDS: SlotId[] = [
  "background",
  "opposing-conclusion",
  "opposing-evidence",
  "concession",
  "authors-conclusion",
  "intermediate-conclusion",
  "authors-evidence",
];

export const SLOT_LABELS: Record<SlotId, string> = {
  background: "Background",
  "opposing-conclusion": "Opposing Conclusion",
  "opposing-evidence": "Opposing Evidence",
  concession: "Concession",
  "authors-conclusion": "Author's Conclusion",
  "intermediate-conclusion": "Intermediate Conclusion",
  "authors-evidence": "Author's Evidence",
};

export type IndicatorBucket =
  | "conclusion"
  | "pivot"
  | "support"
  | "opposing-view"
  | "concession"
  | "neutral";

export const INDICATOR_BUCKETS: IndicatorBucket[] = [
  "conclusion",
  "pivot",
  "support",
  "opposing-view",
  "concession",
  "neutral",
];

export interface PlaygroundClause {
  id: string;
  text: string;
  slot: SlotId;
  tip_on_mismatch?: Partial<Record<SlotId, string>>;
}

export interface PlaygroundIndicatorWord {
  text: string;
  bucket: IndicatorBucket;
  start_index: number;
}

export interface PlaygroundStimulus {
  id: string;
  stimulus_text: string;
  clauses: PlaygroundClause[];
  indicator_words: PlaygroundIndicatorWord[];
}

export interface TaggedToken {
  text: string;
  bucket: IndicatorBucket;
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
  concept_tag: "glossary" | "indicator" | "verb-taxonomy";
  difficulty_tag: "foundation" | "core" | "advanced";
  topic_tag: "abstract";
}

export interface FlashcardSet {
  topic: "abstract";
  cards: FlashcardEntry[];
}

export interface D1Clause {
  id: string;
  text: string;
  slot: SlotId;
}

export interface D1Question {
  id: string;
  stimulus: string;
  clauses: D1Clause[];
  explanation: string;
}

export interface MCOption {
  id: string;
  text: string;
}

export interface MCQuestion {
  id: string;
  type?: "mc";
  word_or_phrase?: string;
  phrase?: string;
  prompt?: string;
  options: MCOption[];
  buckets?: IndicatorBucket[];
  correct: string;
  correct_bucket?: IndicatorBucket;
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
