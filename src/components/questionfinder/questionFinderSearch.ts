/**
 * The Question finder's pure layer: address parsing, and one search across both
 * banks whose results stay grouped by bank.
 *
 * No React, no fetching, no routing — everything here is a function of its
 * arguments so the semantics can be tested without a DOM. See
 * `docs/adr/0008-question-finder-lands-differently-by-bank.md` for why an LR hit
 * and an RC hit are not the same shape.
 */

export type QuestionFinderBank = "lr" | "rc";

export interface FinderSnippet {
  before: string;
  match: string;
  after: string;
}

/**
 * A question address is what a student can say out loud: PrepTest, and
 * optionally the section and the question within it. Partial on purpose — "PT
 * 90" is a legitimate thing to type, and it narrows without resolving.
 */
export interface QuestionAddress {
  pt: number;
  section?: number;
  qnum?: number;
}

/* ------------------------------------------------------------------ sources */

/** The LR fields the finder reads. A subset of `LRQuestion`, so the bank can
 *  shrink to an index (ADR 0007) without touching this file. */
export interface FinderLrSource {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  stimulus?: string | null;
  questionStem: string;
}

/** The RC fields the finder reads, flattened from the passage index and the
 *  question index so this module never learns either file's shape. */
export interface FinderRcQuestionSource {
  passageId: number;
  preptest: number;
  section: number;
  prompt: string | null;
}

export interface FinderRcPassageSource {
  passageId: number;
  preptest: number;
  section: number;
  /** The passage's position in its section — RC's **Position**, not a Set. */
  setNumber: number;
  title: string | null;
  topic: string | null;
  questionCount: number;
  firstWords: string;
}

/* ------------------------------------------------------------------ results */

export interface FinderLrHit {
  bank: "lr";
  /** Stable list key. */
  key: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  /** Shown when there is no snippet to show — an address query matches no text,
   *  and repeating the type that is already tagged on the row says nothing. */
  stem: string;
  snippet: FinderSnippet | null;
}

export interface FinderRcHit {
  bank: "rc";
  key: string;
  passageId: number;
  preptest: number;
  section: number;
  setNumber: number;
  title: string | null;
  topic: string | null;
  /** Every question on the passage — what actually opens. */
  questionCount: number;
  /** How many of them matched the query. Never the scope of the work. */
  matchedCount: number;
  snippet: FinderSnippet | null;
}

export type FinderHit = FinderLrHit | FinderRcHit;

export interface FinderResults {
  lr: FinderLrHit[];
  rc: FinderRcHit[];
  /** Set when the query parsed as an address, whether or not it resolved. */
  address: QuestionAddress | null;
  /** True when the address names one exact LR question that exists. */
  exact: FinderLrHit | null;
}

/* ------------------------------------------------------------------ helpers */

const SNIPPET_RADIUS = 52;

export function normalizeFinderText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildFinderSnippet(text: string, query: string): FinderSnippet | null {
  const haystack = normalizeFinderText(text);
  const needle = normalizeFinderText(query);
  if (!haystack || !needle) return null;

  const index = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return null;

  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(haystack.length, index + needle.length + SNIPPET_RADIUS);

  return {
    before: `${start > 0 ? "… " : ""}${haystack.slice(start, index)}`,
    match: haystack.slice(index, index + needle.length),
    after: `${haystack.slice(index + needle.length, end)}${end < haystack.length ? " …" : ""}`,
  };
}

/* ------------------------------------------------------------ address parse */

/* Four spellings, because a student types whichever one is in their head and
   being wrong about the punctuation is not a thing they should be corrected on:

     PT90 S1 Q12   PT 90 Section 1 Question 12   (labelled, any spacing)
     PT90-S1-Q12                                  (the qid, pasted)
     90.1.12       90-1-12                        (dotted / dashed numeric)
     90                                           (a PrepTest on its own)

   Anything else is free text. The parser is deliberately strict about the
   unlabelled forms: three loose numbers separated by spaces is far more likely
   to be a phrase from a stimulus than an address, so it is not accepted. */
const LABELLED =
  /^\s*(?:pt|preptest|test)?\s*[-.]?\s*(\d{1,3})\s*(?:[-.\s]\s*)?(?:s|sec|section)\s*[-.]?\s*(\d{1,2})\s*(?:(?:[-.\s]\s*)?(?:q|question)\s*[-.]?\s*(\d{1,3}))?\s*$/i;
const LABELLED_PT_ONLY = /^\s*(?:pt|preptest|test)\s*[-.]?\s*(\d{1,3})\s*$/i;
const NUMERIC = /^\s*(\d{1,3})\s*[-.]\s*(\d{1,2})\s*(?:[-.]\s*(\d{1,3}))?\s*$/;
const BARE_PT = /^\s*(\d{1,3})\s*$/;

export function parseQuestionAddress(input: string): QuestionAddress | null {
  const value = normalizeFinderText(input);
  if (!value) return null;

  for (const pattern of [LABELLED, NUMERIC]) {
    const match = value.match(pattern);
    if (match) {
      const address: QuestionAddress = { pt: Number(match[1]), section: Number(match[2]) };
      if (match[3] !== undefined) address.qnum = Number(match[3]);
      return address;
    }
  }

  const ptOnly = value.match(LABELLED_PT_ONLY) ?? value.match(BARE_PT);
  if (ptOnly) return { pt: Number(ptOnly[1]) };

  return null;
}

/**
 * Renders an address the way the finder shows it back.
 *
 * Deliberately the same shorthand the result rows use, and deliberately short:
 * spelled out as "PT 90 · Section 1 · Question 12" the confirmation chip was
 * wider than a phone's input and crushed the field it was confirming.
 */
export function formatQuestionAddress(address: QuestionAddress): string {
  const parts = [`PT ${address.pt}`];
  if (address.section !== undefined) parts.push(`S${address.section}`);
  if (address.qnum !== undefined) parts.push(`Q${address.qnum}`);
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ search */

function matchesAddress(
  address: QuestionAddress | null,
  pt: number,
  section: number,
  qnum?: number,
): boolean {
  if (!address) return true;
  if (address.pt !== pt) return false;
  if (address.section !== undefined && address.section !== section) return false;
  if (address.qnum !== undefined && qnum !== undefined && address.qnum !== qnum) return false;
  return true;
}

function toLrHit(question: FinderLrSource, snippet: FinderSnippet | null): FinderLrHit {
  return {
    bank: "lr",
    key: `lr:${question.qid}`,
    qid: question.qid,
    pt: question.pt,
    section: question.section,
    qnum: question.qnum,
    qtype: question.qtype,
    stem: question.questionStem,
    snippet,
  };
}

export interface FinderSearchInput {
  query: string;
  lr: FinderLrSource[];
  rcPassages: FinderRcPassageSource[];
  rcQuestions: FinderRcQuestionSource[];
  /** Per bank, not overall — the two groups never compete for the same slots. */
  limit?: number;
}

/**
 * One query, two banks, two independently-ranked groups.
 *
 * The groups are never interleaved. Each bank's engine ranks its own hits, and
 * the RC group collapses to one row per passage because a passage is what an RC
 * hit opens — three matching questions in one passage are one result, not three
 * rows that all lead to the same place.
 */
export function runFinderSearch({
  query,
  lr,
  rcPassages,
  rcQuestions,
  limit = 6,
}: FinderSearchInput): FinderResults {
  const text = normalizeFinderText(query);
  const address = parseQuestionAddress(text);
  /* An address is a filter, not a phrase. Searching stimulus text for "PT90 S1"
     would return nothing and make the finder look broken on its own syntax. */
  const phrase = address ? "" : text;

  const lrHits: FinderLrHit[] = [];
  let exact: FinderLrHit | null = null;

  for (const question of lr) {
    if (!matchesAddress(address, question.pt, question.section, question.qnum)) continue;

    let snippet: FinderSnippet | null = null;
    if (phrase) {
      snippet =
        buildFinderSnippet(question.stimulus ?? "", phrase) ??
        buildFinderSnippet(question.questionStem, phrase) ??
        buildFinderSnippet(question.qid, phrase);
      if (!snippet) continue;
    }

    const hit = toLrHit(question, snippet);

    if (
      address?.qnum !== undefined &&
      address.section !== undefined &&
      address.pt === question.pt &&
      address.section === question.section &&
      address.qnum === question.qnum
    ) {
      exact = hit;
    }

    if (lrHits.length < limit) lrHits.push(hit);
    /* Keep scanning past the limit only while an exact address is still
       unresolved — otherwise the one question the student named could fall off
       the end of its own result list. */
    if (lrHits.length >= limit && (exact || address?.qnum === undefined)) break;
  }

  /* RC collapses to passages. Count every matching question first, then emit one
     row per passage carrying that count alongside the passage's full size. */
  const matchedByPassage = new Map<number, number>();
  const snippetByPassage = new Map<number, FinderSnippet>();

  if (phrase || address) {
    for (const question of rcQuestions) {
      if (!matchesAddress(address, question.preptest, question.section)) continue;
      if (phrase) {
        const snippet = buildFinderSnippet(question.prompt ?? "", phrase);
        if (!snippet) continue;
        if (!snippetByPassage.has(question.passageId)) {
          snippetByPassage.set(question.passageId, snippet);
        }
      }
      matchedByPassage.set(
        question.passageId,
        (matchedByPassage.get(question.passageId) ?? 0) + 1,
      );
    }
  }

  const rcHits: FinderRcHit[] = [];
  for (const passage of rcPassages) {
    if (!matchesAddress(address, passage.preptest, passage.section)) continue;

    let matchedCount = matchedByPassage.get(passage.passageId) ?? 0;
    let snippet = snippetByPassage.get(passage.passageId) ?? null;

    if (phrase && matchedCount === 0) {
      /* A passage can match on its own title or opening line even when no
         question prompt does — that is still the passage the student meant. */
      snippet =
        buildFinderSnippet(passage.title ?? "", phrase) ??
        buildFinderSnippet(passage.firstWords, phrase) ??
        buildFinderSnippet(passage.topic ?? "", phrase);
      if (!snippet) continue;
      matchedCount = 0;
    }

    rcHits.push({
      bank: "rc",
      key: `rc:${passage.passageId}`,
      passageId: passage.passageId,
      preptest: passage.preptest,
      section: passage.section,
      setNumber: passage.setNumber,
      title: passage.title,
      topic: passage.topic,
      questionCount: passage.questionCount,
      matchedCount,
      snippet,
    });
    if (rcHits.length >= limit) break;
  }

  return { lr: lrHits, rc: rcHits, address, exact };
}

/* -------------------------------------------------------------- landings */

/**
 * Where an LR hit goes: one question, as a real attempt, in the drill runner.
 * `present=smart` and `returnTo` keep the pre-`1d656cf4` contract, so finishing
 * lands the student back where they started.
 */
export function lrHitHref(hit: FinderLrHit, returnTo: string): string {
  const params = new URLSearchParams({
    mode: "type-drill",
    qids: hit.qid,
    present: "smart",
    returnTo,
  });
  return `/drill?${params.toString()}`;
}

/** Where an RC hit goes: the whole passage, every question on it. ADR 0008. */
export function rcHitHref(hit: FinderRcHit): string {
  return `/rc/drill?passage=${hit.passageId}`;
}
