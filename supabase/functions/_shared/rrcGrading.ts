/**
 * The Read, Recall, Colour grader's judgement, as pure functions.
 *
 * Everything here is deterministic except the one model call the caller makes
 * with `buildJudgePrompt`, and that call's output comes straight back into
 * `parseJudgeVerdicts`. Nothing in this file touches the network, the database
 * or the clock, and it deliberately imports nothing at all: the grader runs in
 * a Deno edge function and the tests run in Vitest, and this is the code both
 * have to agree on.
 *
 * The decisions it implements:
 *
 * - Coverage is per STIMULUS, counted across everything she said about it,
 *   never per Chunk (ADR 0013). She may chunk differently from us and is not
 *   held to our line breaks.
 * - Full Coverage is not 100% (ADR 0018). A census of 71 of Joshua's own runs
 *   puts a correct one at a median of 95% and a 10th percentile of 86%, so the
 *   top band starts at 86 and the score is reported as a band.
 * - A Detail is one of three kinds and each is judged by a different question.
 *   Asking "did she say this?" of a discourse role marks it missed whenever she
 *   carried it structurally, which is a tenth of the key.
 */

export type DetailKind = "content" | "structure" | "modality";

export interface Detail {
  /** 1-based index within the stimulus, stable across the whole judgement. */
  n: number;
  text: string;
  kind: DetailKind;
}

export type Band = "at-the-standard" | "nearly-there" | "thin" | "lost-it";

/**
 * Where the bands cut.
 *
 * Only `atTheStandard` is measured: it is the 10th percentile of the 71-run
 * census, so nine correct runs in ten clear it. It is deliberately not the
 * minimum of that census, which is a stimulus whose recording is broken.
 *
 * The other two are PROVISIONAL and marked so. The corpus holds only correct
 * runs, so it can say where good ends and cannot say where "nearly there"
 * stops being nearly. Those move once student runs exist.
 */
export const BAND_FLOOR = {
  atTheStandard: 86,
  nearlyThere: 72,
  thin: 55,
} as const;

export function bandFor(percent: number): Band {
  if (percent >= BAND_FLOOR.atTheStandard) return "at-the-standard";
  if (percent >= BAND_FLOOR.nearlyThere) return "nearly-there";
  if (percent >= BAND_FLOOR.thin) return "thin";
  return "lost-it";
}

/*
 * Kind, from the authored phrasing.
 *
 * A port of `system/scripts/activity-centre/classify_details.py`, run at grade
 * time rather than baked into the content. Same rules, same closed set; doing
 * it here means no reseed of 1,294 Details and one place to change when the
 * authoring vocabulary grows.
 *
 * The trap this exists to avoid: "This is about Sweden." and "This is the
 * conclusion." share an opening and are opposites. Anything keying on that
 * opening puts a topic fact in with the discourse roles, so the exceptions are
 * checked FIRST and the roles are an enumerated set rather than a pattern.
 */
const CONTENT_DESPITE_OPENING = /^this is (about|what|true of|after|conditional on) /;

const STRUCTURE = [
  /^this is (the|a|an) (conclusion|contrast|reason|reason given|result|example|additional point|additional reason|additional fact|additional premise|premise|second premise|first reason given|conditional claim|correction|other case|puzzle|definition|consequent|editorial)\.$/,
  /^this is (his|her|their) (conclusion|reason|recommendation|example)\.$/,
  /^this is further support for the claim\.$/,
  /^this is (an example|the contrast)\.$/,
  /^this is a contrast with .*\.$/,
  /^this is despite something\.$/,
  /^(a|an|the) [a-z ]+ is speaking\.$/,
  /^(he|she|they) asks? a question\.$/,
  /^a definition of that follows\.$/,
  /^the word \w+ introduces it\.$/,
];

const MODALITY = [
  /^this is (hedged|marked|stated) as .*\.$/,
  /^this is stated with certainty\.$/,
  /^this is (usually|often|ultimately) (so|the case)\.$/,
  /^this is always true.*\.$/,
  /^this is (typically|almost always) so\.$/,
  /^this is true in most cases\.$/,
  /^this is treated as clear\.$/,
  /^this is an (average|estimate|overall figure)\.$/,
];

export function classifyDetail(text: string): DetailKind {
  const t = text.trim().toLowerCase();
  if (CONTENT_DESPITE_OPENING.test(t)) return "content";
  if (STRUCTURE.some((r) => r.test(t))) return "structure";
  if (MODALITY.some((r) => r.test(t))) return "modality";
  return "content";
}

/**
 * A Detail that opens like a discourse role and fell through to content.
 *
 * The classifier defaults to content, so an unrecognised structural phrasing is
 * mis-kinded silently. This is the only thing that surfaces it. Four of the
 * 1,294 authored Details trip it and all four are correctly content; a section
 * whose residue is growing has drifted from the authoring vocabulary.
 */
export function isKindResidue(text: string, kind: DetailKind): boolean {
  const t = text.trim().toLowerCase();
  return kind === "content" && t.startsWith("this is") && !CONTENT_DESPITE_OPENING.test(t);
}

export function toDetails(texts: string[]): Detail[] {
  return texts.map((text, i) => ({ n: i + 1, text, kind: classifyDetail(text) }));
}

// --- The one model call ------------------------------------------------------

export interface JudgeEntry {
  id: number;
  text: string;
  kind: DetailKind;
  /** Not sent to the model. A decoy must come back missed. */
  decoy: boolean;
}

/**
 * The list the judge is shown: the stimulus's own Details plus decoys.
 *
 * Decoys are Details belonging to a DIFFERENT stimulus in the same section, and
 * the only correct verdict on one is "missed". They are the per-run check on the
 * failure mode that matters, which is the judge reasoning "the stimulus says
 * this, so she must have meant it" and crediting her for words she never said.
 * That failure is invisible in the output -- it just looks like a good score --
 * so something has to be able to catch it in the run itself rather than in
 * aggregate.
 *
 * Interleaved deterministically rather than shuffled, so the same inputs give
 * the same prompt and a disagreement between two runs is the model's, not ours.
 */
export function buildJudgeEntries(details: Detail[], decoyTexts: string[]): JudgeEntry[] {
  const real = details.map((d) => ({ text: d.text, kind: d.kind, decoy: false }));
  const decoys = decoyTexts.map((text) => ({ text, kind: classifyDetail(text), decoy: true }));
  if (decoys.length === 0) return real.map((e, i) => ({ id: i + 1, ...e }));

  // Spread them through the list instead of appending: a judge that sees two
  // odd items at the end can treat the tail as a different question.
  const step = Math.max(1, Math.floor(real.length / (decoys.length + 1)));
  const out: Omit<JudgeEntry, "id">[] = [];
  let next = 0;
  real.forEach((entry, i) => {
    out.push(entry);
    if (next < decoys.length && (i + 1) % step === 0) out.push(decoys[next++]);
  });
  while (next < decoys.length) out.push(decoys[next++]);
  return out.map((e, i) => ({ id: i + 1, ...e }));
}

const KIND_RULE: Record<DetailKind, string> = {
  content:
    'CONTENT — a fact. Carried if she stated it, in any words, in any order. ' +
    'Synonyms and paraphrase count fully. A dropped proper noun, number or ' +
    'quantifier is NOT carried: "all employees" is missed if she said "the staff".',
  structure:
    'STRUCTURE — a discourse role, not words. Carried if the relationship is ' +
    'present in HOW she told it; she never has to name it. "This is a contrast." ' +
    'is carried by a "but", a "though", or "X is different from Y". "This is the ' +
    'conclusion." is carried by a "so" or "therefore" introducing that claim.',
  modality:
    'MODALITY — the strength of the claim. Carried if her qualifier survived. ' +
    'A flat assertion where the source hedged is NOT carried.',
};

export function buildJudgePrompt(input: {
  stimulus: string;
  entries: JudgeEntry[];
  spoken: string;
}): string {
  const kinds = [...new Set(input.entries.map((e) => e.kind))]
    .map((k) => `- ${KIND_RULE[k]}`)
    .join("\n");
  const list = input.entries
    .map((e) => `${e.id}. [${e.kind}] ${e.text}`)
    .join("\n");

  return `You are grading one stimulus of a memory drill.

A student read the stimulus below, then said it back out loud in her own words
from memory. Your job is to decide, for each numbered Detail, whether she
carried it.

THE STIMULUS (context only — see the rule below):
"""
${input.stimulus}
"""

WHAT SHE SAID (this is your ONLY evidence):
"""
${input.spoken}
"""

HOW TO JUDGE EACH KIND:
${kinds}

RULES:
- Judge ONLY from what she said. NEVER mark a Detail carried because the
  stimulus contains it. The stimulus is there so you know what a Detail refers
  to, not as evidence that she said it. This is the most important rule here.
- Some of the Details below belong to a DIFFERENT stimulus and she cannot have
  carried them. Mark those not carried. Do not try to guess which.
- When you are genuinely torn, mark it NOT carried.
- Her transcript may contain mangled or clipped words. Judge the substance.

THE DETAILS:
${list}

Also judge the run as a whole:
- reciting: did she say the stimulus back close to word-for-word rather than
  retelling it? Full coverage reached by reciting is a failure.
- listing: did she deliver it as a flat run of facts rather than as a connected
  argument?
- coloured: did she react to the stimulus at all — a thought, doubt, example or
  joke — beyond retelling it?
- colour_specific: was that reaction specific to THIS stimulus rather than
  something that would fit any stimulus?

Reply with JSON only, no prose and no code fence:
{"verdicts":[{"id":1,"carried":true}],"reciting":false,"reciting_reason":"",
"listing":false,"listing_reason":"","coloured":true,"colour_specific":true}

Return exactly one verdict for every id from 1 to ${input.entries.length}.`;
}

// --- Reading the answer ------------------------------------------------------

export interface JudgeReply {
  verdicts: Record<number, boolean>;
  reciting: boolean;
  recitingReason: string;
  listing: boolean;
  listingReason: string;
  coloured: boolean;
  colourSpecific: boolean;
  /** Ids expected but absent from the reply. Counted as not carried. */
  missingIds: number[];
}

export class JudgeReplyError extends Error {}

/**
 * Pull the JSON out of whatever the model actually sent.
 *
 * Told not to use a code fence, models use one anyway, and some prepend a
 * sentence. Rather than trusting the instruction this finds the outermost
 * balanced object. A reply that is not parseable is an error and never a zero:
 * a grade of 0% and a grade we failed to read are different facts, and only one
 * of them is about her.
 */
export function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  if (start === -1) throw new JudgeReplyError("no JSON object in the reply");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch (e) {
        throw new JudgeReplyError(`unparseable JSON: ${(e as Error).message}`);
      }
    }
  }
  throw new JudgeReplyError("JSON object never closed");
}

export function parseJudgeReply(raw: string, expectedIds: number[]): JudgeReply {
  const obj = extractJson(raw) as Record<string, unknown>;
  const rows = obj.verdicts;
  if (!Array.isArray(rows)) throw new JudgeReplyError("reply has no verdicts array");

  const verdicts: Record<number, boolean> = {};
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "number" ? r.id : Number(r.id);
    if (!Number.isFinite(id)) continue;
    verdicts[id] = r.carried === true;
  }
  const missingIds = expectedIds.filter((id) => !(id in verdicts));
  const flag = (k: string) => obj[k] === true;
  const reason = (k: string) => (typeof obj[k] === "string" ? (obj[k] as string) : "");

  return {
    verdicts,
    reciting: flag("reciting"),
    recitingReason: reason("reciting_reason"),
    listing: flag("listing"),
    listingReason: reason("listing_reason"),
    // Absent is treated as "no colour" rather than as colour, so a judge that
    // forgets the field cannot silently award it.
    coloured: flag("coloured"),
    colourSpecific: flag("colour_specific"),
    missingIds,
  };
}

// --- The score ---------------------------------------------------------------

export interface StimulusGrade {
  carried: number;
  total: number;
  /** Whole-number percent over the stimulus's OWN Details. */
  percent: number;
  band: Band;
  missed: string[];
  /** Decoys the judge said she carried. Any at all discredits the run. */
  decoysCarried: string[];
  /** Details the judge never returned a verdict for. Counted as not carried. */
  unjudged: string[];
  reciting: boolean;
  listing: boolean;
  coloured: boolean;
  colourSpecific: boolean;
}

export function gradeStimulus(entries: JudgeEntry[], reply: JudgeReply): StimulusGrade {
  const own = entries.filter((e) => !e.decoy);
  const carriedEntries = own.filter((e) => reply.verdicts[e.id] === true);
  const total = own.length;
  // Guard the empty stimulus rather than dividing by zero into NaN, which
  // renders as a blank band and looks like a rendering bug.
  const percent = total === 0 ? 0 : Math.round((carriedEntries.length / total) * 100);

  return {
    carried: carriedEntries.length,
    total,
    percent,
    band: bandFor(percent),
    missed: own.filter((e) => reply.verdicts[e.id] !== true).map((e) => e.text),
    decoysCarried: entries.filter((e) => e.decoy && reply.verdicts[e.id] === true).map((e) => e.text),
    unjudged: own.filter((e) => reply.missingIds.includes(e.id)).map((e) => e.text),
    reciting: reply.reciting,
    listing: reply.listing,
    coloured: reply.coloured,
    colourSpecific: reply.colourSpecific,
  };
}

/**
 * Run `worker` over every item, at most `limit` of them in flight.
 *
 * A section is 22 stimuli and each one costs a judge call. Run end to end that
 * is 22 round trips in series, which on the trial run exceeded the edge
 * function's wall clock and returned 504 -- so the student's whole run produced
 * no Report Card, having already been recorded, uploaded and transcribed
 * correctly. Run at once it is one round trip's worth of waiting.
 *
 * Bounded rather than unbounded because the judge is a rate-limited API and a
 * section is not the only thing that might be grading; 429s at the provider
 * would trade one failure mode for another.
 *
 * Results come back in the order of `items`, not the order they finished. The
 * caller writes them into a Report Card the student reads top to bottom, and a
 * section whose stimuli arrive shuffled is worse than a slow one.
 *
 * Nothing here touches the network itself -- the worker does -- so this stays
 * on the pure side of the file.
 */
export async function mapWithConcurrency<In, Out>(
  items: In[],
  limit: number,
  worker: (item: In, index: number) => Promise<Out>,
): Promise<Out[]> {
  const results = new Array<Out>(items.length);
  let next = 0;

  const runner = async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  };

  // `limit` runners share one cursor, so a slow item holds up only its own
  // runner rather than a whole batch. Never more runners than items.
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runner),
  );
  return results;
}
