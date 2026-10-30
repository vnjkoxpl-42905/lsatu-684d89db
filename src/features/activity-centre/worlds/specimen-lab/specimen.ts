// The Specimen Lab reacts to the student's REASONING, not to their answer
// string. That is the drill's whole claim: in Vocab Rehab the why is the answer,
// so the bench has to be able to tell which evidence a student actually used.
//
// Everything here derives that from the two texts it has — the field note and
// what the student wrote — and returns nothing when it cannot tell. An
// instrument that lights on evidence the student did not cite would be worse
// than an instrument that never lights, because the unlit ones are the whole
// feedback: they are the growth edge, shown without a word of scolding.

import type { ActivityItem } from "../../api/types";

export type Charge = "neg" | "neutral" | "pos";
export type Instrument = "charge" | "contrast" | "relation";

export interface Specimen {
  order: number;
  /** The target word, without its authored asterisks. */
  word: string;
  /** The paragraph it was collected from, marks intact for the prompt renderer. */
  fieldNote: string;
  /** The credited candidate meanings, as authored. */
  candidates: string[];
  /** The authored clue line, when the item names one. */
  clue?: string;
  /**
   * The near-miss this item polices, when the bank authored one. Only the five
   * precision-trap items do, so the boundary renders on those and nowhere else.
   */
  trap?: string;
  /**
   * The credited charge, ONLY when the item's own text states it. Four of the
   * fifty-one do. For the rest this is null and the gauge registers the
   * student's call without adjudicating it, because a valence the bank never
   * authored would be my judgment presented to a student as his.
   */
  charge: Charge | null;
}

export interface CitedSpan {
  /** The field-note text the student reused. */
  text: string;
  /** Which instrument this evidence drives, when it drives one. */
  instrument: Instrument | null;
}

export interface Reading {
  /** Instruments the student's own reasoning activated. */
  lit: Instrument[];
  /** The rest. These are the point of the display. */
  dark: Instrument[];
  /** The valence the student called, or null when they made no call. */
  charge: Charge | null;
  /**
   * Whether that call can be scored. "unscored" is the honest common case: the
   * student made a call and the bank never authored one to check it against.
   */
  chargeVerdict: "matches" | "differs" | "unscored" | null;
  spans: CitedSpan[];
}

export const INSTRUMENTS: Instrument[] = ["charge", "contrast", "relation"];

const MARKED = /\*([^*]+)\*/;

/**
 * Contrastive constructions. A cited span sitting in one of these is the
 * student reading the word off an opposition, which is the Tier 2 and Tier 4
 * skill.
 */
const CONTRAST_CUES = [
  "but",
  "however",
  "rather than",
  "unlike",
  "whereas",
  "although",
  "though",
  "normally",
  "not merely",
  "not simply",
  "instead of",
  "yet",
  "while",
  "despite",
  "in contrast",
  "far from",
  "no longer",
];

// Function words carry no evidence, so an overlap made only of these is not a
// citation. Without this, "the moment the" would read as the student quoting.
const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "as", "from", "into", "than", "then", "so", "i", "think", "because",
  "probably", "means", "mean", "meaning", "word", "sentence", "paragraph", "could",
  "would", "they", "them", "he", "she", "his", "her", "their",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Crude suffix stripping so a paraphrase still matches the paragraph it is
 * paraphrasing: the note says "outlast", the student says "outlasting", and
 * that is the same citation. Only strips when a real stem is left, so short
 * words are untouched.
 */
function stem(word: string): string {
  for (const suffix of ["ingly", "edly", "ing", "ness", "ed", "es", "ly", "s"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function stems(text: string): Set<string> {
  return new Set(words(text).map(stem));
}

/** Strip the authored marks so the field note can be matched as plain prose. */
function plain(text: string): string {
  return text.replace(/\*+/g, "");
}

/** The target word the vitrine holds. */
export function targetWord(prompt: string): string | null {
  const m = prompt.match(MARKED);
  return m ? m[1].trim() : null;
}

/**
 * The credited candidates, taken from the authored answer's first sentence.
 * The bank writes them two ways, "essential, necessary, crucial" and
 * "aggressive or hostile", so both separators split.
 */
export function creditedCandidates(answer: string): string[] {
  const m = plain(answer).match(/\bmeans?\b\s+([^.]+)/i);
  if (!m) return [];
  return m[1]
    .split(/,| or /i)
    .map((c) => c.trim())
    .filter((c) => c.length > 1);
}

const CHARGE_WORDS: [RegExp, Charge][] = [
  [/\bnegative\b|\bpejorative\b|\bdisapproving\b/i, "neg"],
  [/\bpositive\b|\bapproving\b/i, "pos"],
  [/\bneutral\b/i, "neutral"],
];

/** The valence a piece of text explicitly names, or null when it names none. */
export function statedCharge(text: string): Charge | null {
  for (const [re, charge] of CHARGE_WORDS) if (re.test(text)) return charge;
  return null;
}

export function parseSpecimen(item: ActivityItem): Specimen | null {
  const word = targetWord(item.prompt);
  if (!word) return null;
  const candidates = creditedCandidates(item.credited_answers[0] ?? "");
  if (!candidates.length) return null;

  const explanation = item.explanation ?? "";
  const clue =
    explanation.match(/(?:Clue|Reusable pattern):\s*([^.]+(?:\.[^ ]|[^.])*?)(?:\.\s|\.$|$)/)?.[1]?.trim();
  const trapMatch = explanation.match(/The trap:\s*\*([^*]+)\*/);

  return {
    order: item.order,
    word,
    fieldNote: item.prompt,
    candidates,
    clue: clue || undefined,
    trap: trapMatch ? trapMatch[1].trim() : undefined,
    // Only the item's own text may set this.
    charge: statedCharge(`${item.credited_answers.join(" ")} ${explanation}`),
  };
}

/**
 * The distinctive field-note wording the student reused.
 *
 * This counts shared content words rather than quoted runs, because the drill's
 * own credited answers cite by paraphrase far more often than by quotation:
 * "the praise causes the reader to doubt the book" is citing, and it quotes no
 * consecutive phrase. Requiring a run would have read the model answers as
 * evidence-free.
 *
 * The target word and the credited candidates are excluded, so restating the
 * answer is not mistaken for citing the paragraph. Two distinct words is the
 * bar: one shared noun is a coincidence, two is a student pointing at
 * something.
 */
export function citedWords(response: string, specimen: Pick<Specimen, "fieldNote" | "word" | "candidates">): string[] {
  const excluded = new Set(
    [...words(specimen.word), ...specimen.candidates.flatMap((c) => words(c))].map(stem),
  );
  const said = stems(response);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words(plain(specimen.fieldNote))) {
    const s = stem(w);
    if (STOP.has(w) || STOP.has(s) || excluded.has(s) || seen.has(s)) continue;
    seen.add(s);
    if (said.has(s)) out.push(w);
  }
  return out;
}

/** Whether a cue appears in the field note within reach of the cited run. */
function cueNear(fieldNote: string, run: string, cues: string[]): boolean {
  const note = plain(fieldNote).toLowerCase();
  const at = note.indexOf(run.split(" ")[0]);
  const window = at < 0 ? note : note.slice(Math.max(0, at - 70), at + run.length + 70);
  return cues.some((c) => window.includes(c));
}

/**
 * Contrast is the marked case and has to be shown by a contrastive
 * construction. Relation is the unmarked one: a student who quoted the field
 * note and is not reading an opposition is relating the word to what the
 * sentence does with it, which is restatement, definition, example or
 * consequence. Treating quoted evidence as unclassifiable would leave the bench
 * dark for a student who did cite, which is the one reading it must never give.
 */
function classify(fieldNote: string, run: string): Instrument {
  if (cueNear(fieldNote, run, CONTRAST_CUES)) return "contrast";
  return "relation";
}

/**
 * Naming the mechanism counts as citing it. Joshua's own credited answers do
 * exactly that ("because of the rising-to-peak signal", "because of the real vs
 * dramatized contrast") rather than quoting the paragraph, so a bench that only
 * recognised quotation would stay dark on the drill's own model answers.
 *
 * The match is against the item's OWN authored clue line rather than a lexicon
 * of clue words. That keeps this honest per item and means it generalises with
 * the bank instead of being tuned to today's fifty-one.
 */
function clueEcho(response: string, clue?: string): Instrument | null {
  if (!clue) return null;
  const said = stems(response);
  // Clue lines are short ("post-word example list"), so a paraphrase can only
  // ever echo one or two of their words. Requiring two would read the drill's
  // own model answers as having named nothing.
  const shared = [...new Set(words(clue))].filter(
    (w) => !STOP.has(w) && w.length >= 4 && said.has(stem(w)),
  );
  if (!shared.length) return null;
  return CONTRAST_CUES.some((c) => clue.toLowerCase().includes(c)) ||
    /contrast|opposition|opposed|antonym|versus|\bvs\b/i.test(clue)
    ? "contrast"
    : "relation";
}

/**
 * Read the bench off the student's own examination.
 *
 * The charge gauge registers a call the student explicitly made. It is not
 * inferred from their candidate words: guessing that "hostile" means they
 * called the word negative would light an instrument they did not earn, and the
 * unlit instruments are what the display is for.
 */
export function readExamination(response: string, specimen: Specimen): Reading {
  // One shared word is enough, because the target word, every credited
  // candidate and every function word have already been taken out. What is left
  // is the paragraph's own distinctive wording, and reusing any of it is a
  // student pointing at something. "Placed directly against established" cites
  // one word and is one of the most precise citations in the bank.
  const spans: CitedSpan[] = citedWords(response, specimen).map((text) => ({
    text,
    instrument: classify(specimen.fieldNote, text),
  }));

  const charge = statedCharge(response);
  const lit: Instrument[] = [];
  if (charge) lit.push("charge");
  for (const s of spans) {
    if (s.instrument && !lit.includes(s.instrument)) lit.push(s.instrument);
  }

  const named = clueEcho(response, specimen.clue);
  if (named && !lit.includes(named)) lit.push(named);

  return {
    lit,
    dark: INSTRUMENTS.filter((i) => !lit.includes(i)),
    charge,
    chargeVerdict: !charge
      ? null
      : specimen.charge === null
        ? "unscored"
        : specimen.charge === charge
          ? "matches"
          : "differs",
    spans,
  };
}
