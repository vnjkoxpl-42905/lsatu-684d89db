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
  /** RC-only passage position; never an internal passage id. */
  pnum?: number;
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
  questionId: number;
  passageId: number;
  preptest: number;
  section: number;
  /** Official 1-based question number across the full RC section. */
  qnum: number;
  /** Canonical section-wide position from the RC source index. */
  position: number;
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
  /** Present when the query resolves to one precise RC question. */
  questionId?: number;
  qnum?: number;
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
  rcTotal: number;
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

/**
 * Falls back from an exact phrase to an all-words match. Students rarely
 * remember the source sentence word-for-word; "drought fertilizer sales"
 * should still find a sentence containing those ideas in another order.
 */
export function buildSmartFinderSnippet(text: string, query: string): FinderSnippet | null {
  const exact = buildFinderSnippet(text, query);
  if (exact) return exact;

  const haystack = normalizeFinderText(text);
  const folded = haystack.toLocaleLowerCase();
  const terms = [...new Set(
    normalizeFinderText(query)
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length >= 2),
  )];
  if (terms.length < 2 || !terms.every((term) => folded.includes(term))) return null;

  const first = terms
    .map((term) => ({ term, index: folded.indexOf(term) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)[0];
  return first ? buildFinderSnippet(haystack, first.term) : null;
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
  /^\s*(?:pt|preptest|practice\s*test|test)?\s*[-.]?\s*(\d{1,3})\s*(?:[-.,:/\s]\s*)?(?:s|sec|section)\s*(?:(?:number|no\.?|#)\s*)?[-.]?\s*(\d{1,2})\s*(?:(?:[-.,:/\s]\s*)?(?:q|question)\s*(?:(?:number|no\.?|#)\s*)?[-.]?\s*(\d{1,3}))?\s*$/i;
const LABELLED_PT_ONLY = /^\s*(?:pt|preptest|practice\s*test|test)\s*[-.]?\s*(\d{1,3})\s*$/i;
const LABELLED_PT_QUESTION =
  /^\s*(?:pt|preptest|practice\s*test|test)\s*[-.]?\s*(\d{1,3})\s*(?:[-.,:/\s]\s*)?(?:q|question)\s*(?:(?:number|no\.?|#)\s*)?[-.]?\s*(\d{1,3})\s*$/i;
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

  const ptQuestion = value.match(LABELLED_PT_QUESTION);
  if (ptQuestion) return { pt: Number(ptQuestion[1]), qnum: Number(ptQuestion[2]) };

  const ptOnly = value.match(LABELLED_PT_ONLY) ?? value.match(BARE_PT);
  if (ptOnly) return { pt: Number(ptOnly[1]) };

  return null;
}

/** Passage syntax is separate so the shared LR address grammar stays unchanged. */
export function parseRcPassageAddress(input: string): QuestionAddress | null {
  const match = normalizeFinderText(input).match(/^\s*(?:pt|preptest|practice\s*test|test)?\s*(\d{1,3})\s*(?:[-.,:/\s]\s*)?(?:s|sec|section)\s*(\d{1,2})\s*(?:[-.,:/\s]\s*)?(?:p|passage)\s*(\d{1,2})\s*(?:(?:[-.,:/\s]\s*)?(?:q|question)\s*(\d{1,3}))?\s*$/i);
  if (!match) return null;
  return { pt: Number(match[1]), section: Number(match[2]), pnum: Number(match[3]), ...(match[4] === undefined ? {} : { qnum: Number(match[4]) }) };
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
  if (address.pnum !== undefined) parts.push(`P${address.pnum}`);
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
  rcLimit?: number;
  /** When mounted from the drill hub, search only the active side of its switch. */
  bank?: QuestionFinderBank;
}

/**
 * One query, two banks, two independently-ranked groups.
 *
 * The groups are never interleaved. Each bank's engine ranks its own hits. RC
 * question matches point at the exact question inside its passage, while
 * passage metadata matches remain passage-level results.
 */
export function runFinderSearch({
  query,
  lr,
  rcPassages,
  rcQuestions,
  limit = 6,
  rcLimit = limit,
  bank,
}: FinderSearchInput): FinderResults {
  const text = normalizeFinderText(query);
  const address = (bank !== 'lr' ? parseRcPassageAddress(text) : null) ?? parseQuestionAddress(text);
  /* An address is a filter, not a phrase. Searching stimulus text for "PT90 S1"
     would return nothing and make the finder look broken on its own syntax. */
  const phrase = address ? "" : text;

  const lrHits: FinderLrHit[] = [];
  let exact: FinderLrHit | null = null;

  for (const question of bank === "rc" ? [] : lr) {
    if (address?.pnum !== undefined) continue;
    if (!matchesAddress(address, question.pt, question.section, question.qnum)) continue;

    let snippet: FinderSnippet | null = null;
    if (phrase) {
      snippet =
        buildSmartFinderSnippet(question.stimulus ?? "", phrase) ??
        buildSmartFinderSnippet(question.questionStem, phrase) ??
        buildSmartFinderSnippet(question.qid, phrase);
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

  const rcCandidates: Array<{ hit: FinderRcHit; score: number }> = [];
  if (bank !== "lr") {
    const passageById = new Map(rcPassages.filter(passage => passage.questionCount > 0).map((passage) => [passage.passageId, passage]));
    const passagesWithQuestionHits = new Set<number>();

    /* A question-address or prompt match is one precise result. It still opens
       its passage, but now lands on the numbered question the student named. */
    if (phrase || address?.qnum !== undefined) {
      for (const question of rcQuestions) {
        if (!matchesAddress(address, question.preptest, question.section, question.qnum)) continue;
        const passage = passageById.get(question.passageId);
        if (!passage) continue;
        if (address?.pnum !== undefined && passage.setNumber !== address.pnum) continue;
        const snippet = phrase
          ? buildSmartFinderSnippet(question.prompt ?? "", phrase)
          : null;
        if (phrase && !snippet) continue;

        rcCandidates.push({ score: address ? 100 : 40, hit: {
          bank: "rc",
          key: `rc-question:${question.questionId}`,
          passageId: passage.passageId,
          preptest: passage.preptest,
          section: passage.section,
          setNumber: passage.setNumber,
          title: passage.title,
          topic: passage.topic,
          questionCount: passage.questionCount,
          questionId: question.questionId,
          qnum: question.qnum,
          matchedCount: 1,
          snippet,
        } });
        passagesWithQuestionHits.add(passage.passageId);
      }
    }

    /* Partial addresses and passage-text queries resolve at passage scope. Do
       not repeat a passage already represented by a precise question hit. */
    if (address?.qnum === undefined) {
      for (const passage of passageById.values()) {
        if (!matchesAddress(address, passage.preptest, passage.section)) continue;
        if (address?.pnum !== undefined && passage.setNumber !== address.pnum) continue;

        let snippet: FinderSnippet | null = null;
        let score = 100;
        if (phrase) {
          const titleMatch = buildSmartFinderSnippet(passage.title ?? '', phrase);
          if (passagesWithQuestionHits.has(passage.passageId) && !titleMatch) continue;
          const openingMatch = buildSmartFinderSnippet(passage.firstWords, phrase);
          snippet = titleMatch ?? openingMatch ?? buildSmartFinderSnippet(passage.topic ?? '', phrase);
          if (!snippet) continue;
          score = titleMatch ? normalizeFinderText(passage.title ?? '').toLocaleLowerCase() === phrase.toLocaleLowerCase() ? 100 : 80 : openingMatch ? 30 : 20;
        }

        rcCandidates.push({ score, hit: {
          bank: "rc",
          key: `rc:${passage.passageId}`,
          passageId: passage.passageId,
          preptest: passage.preptest,
          section: passage.section,
          setNumber: passage.setNumber,
          title: passage.title,
          topic: passage.topic,
          questionCount: passage.questionCount,
          matchedCount: 0,
          snippet,
        } });
      }
    }
  }

  const rc = rcCandidates.sort((a, b) => b.score - a.score).slice(0, Math.max(0, rcLimit)).map(candidate => candidate.hit);
  return { lr: lrHits, rc, address, exact, rcTotal: rcCandidates.length };
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

/** Opens an RC passage, targeting the matched question when one is known. */
export function rcHitHref(hit: FinderRcHit): string {
  const params = new URLSearchParams({ passage: String(hit.passageId) });
  if (hit.questionId !== undefined) params.set("q", String(hit.questionId));
  return `/rc/drill?${params.toString()}`;
}
