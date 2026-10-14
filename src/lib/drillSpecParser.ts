/**
 * The drill spec line: a compact way to say "PT 101-110 S2,3 Q1,6,8,23".
 *
 * It is a FILTER specification, not a list of questions. The three facets are
 * independent, so `PT101,105 S2,3 Q1,6` narrows to the questions matching any
 * of those PTs *and* any of those sections *and* any of those numbers — eight
 * combinations, not four questions. Naming exact questions is a different job
 * with a different syntax; see `parseExactRefs`.
 *
 * The bar owns exactly these three facets. Type, reasoning, feature and
 * difficulty stay in their popovers and are never formatted into the text,
 * because a round trip through a grammar that cannot express them would
 * silently drop them.
 */

/** The three facets the spec line owns. Everything else lives in popovers. */
export interface DrillSpec {
  prepTests: number[];
  sections: number[];
  questionNumbers: number[];
}

export type SpecFacet = keyof DrillSpec;

export interface SpecIssue {
  kind: 'unknown-token' | 'unknown-value' | 'bad-range' | 'too-many';
  /** The offending text, quoted back to the user verbatim. */
  token: string;
  message: string;
}

export interface ParseSpecResult {
  spec: DrillSpec;
  issues: SpecIssue[];
  /** True when nothing was rejected. A spec with issues is never committed. */
  ok: boolean;
}

/** What the current question bank actually contains. */
export interface SpecVocabulary {
  prepTests: readonly number[];
  sections: readonly number[];
  /** Highest question number in the bank. LR sections top out around 26. */
  maxQuestionNumber: number;
}

/**
 * Ceiling on how many values one facet may expand to. Stops `Q1-999999999`
 * from becoming an allocation instead of a parse error.
 */
export const MAX_VALUES_PER_FACET = 200;

const EMPTY_SPEC: DrillSpec = { prepTests: [], sections: [], questionNumbers: [] };

export function createEmptySpec(): DrillSpec {
  return { prepTests: [], sections: [], questionNumbers: [] };
}

export function isEmptySpec(spec: DrillSpec): boolean {
  return (
    spec.prepTests.length === 0 &&
    spec.sections.length === 0 &&
    spec.questionNumbers.length === 0
  );
}

/**
 * Facet markers, longest first so `PT` is never read as a bare `P` or as `S`.
 * Order here IS the precedence rule: the first marker that matches wins, and
 * `S` always means section — it is never a PrepTest prefix.
 */
const FACET_MARKERS: ReadonlyArray<{ marker: string; facet: SpecFacet }> = [
  { marker: 'pt', facet: 'prepTests' },
  { marker: 's', facet: 'sections' },
  { marker: 'q', facet: 'questionNumbers' },
];

/** `pt 101-110`, `PT101,105`, `s2,3`, `q1-18`. Values are digits, commas, dashes, spaces. */
const SEGMENT_RE = /(pt|s|q)\s*([0-9][0-9,\s-]*)/gi;

const FACET_LABEL: Record<SpecFacet, string> = {
  prepTests: 'PT',
  sections: 'S',
  questionNumbers: 'Q',
};

/** Emission order. Stable so equivalent state always formats identically. */
const FACET_ORDER: readonly SpecFacet[] = ['prepTests', 'sections', 'questionNumbers'];

/**
 * Expand one comma-separated value list, which may contain `a-b` ranges.
 * Returns null on a malformed range so the caller can report the raw token.
 */
function expandValueList(
  raw: string,
  facet: SpecFacet,
  issues: SpecIssue[],
): number[] {
  const out: number[] = [];

  for (const chunk of raw.split(',')) {
    const piece = chunk.trim();
    if (!piece) continue;

    const range = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      if (lo > hi) {
        issues.push({
          kind: 'bad-range',
          token: piece,
          message: `${FACET_LABEL[facet]}${piece} runs backwards. Write it low to high.`,
        });
        continue;
      }
      if (hi - lo + 1 > MAX_VALUES_PER_FACET) {
        issues.push({
          kind: 'too-many',
          token: piece,
          message: `${FACET_LABEL[facet]}${piece} covers ${hi - lo + 1} values. The limit is ${MAX_VALUES_PER_FACET}.`,
        });
        continue;
      }
      for (let n = lo; n <= hi; n += 1) out.push(n);
      continue;
    }

    if (/^\d+$/.test(piece)) {
      out.push(Number(piece));
      continue;
    }

    issues.push({
      kind: 'unknown-token',
      token: piece,
      message: `Could not read "${piece}".`,
    });
  }

  return out;
}

/** Ascending, deduplicated. The canonical interior order for every facet. */
function normalizeValues(values: readonly number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

/**
 * Parse a spec line. Validation is total: every value is checked against the
 * bank's vocabulary, and any problem leaves `ok` false so the caller can show
 * the issue without mutating filter state.
 */
export function parseSpec(input: string, vocab: SpecVocabulary): ParseSpecResult {
  const issues: SpecIssue[] = [];
  const collected: Record<SpecFacet, number[]> = {
    prepTests: [],
    sections: [],
    questionNumbers: [],
  };

  const text = input ?? '';
  const consumed: Array<[number, number]> = [];

  SEGMENT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SEGMENT_RE.exec(text)) !== null) {
    const marker = match[1].toLowerCase();
    const entry = FACET_MARKERS.find((f) => f.marker === marker);
    if (!entry) continue;
    collected[entry.facet].push(...expandValueList(match[2], entry.facet, issues));
    consumed.push([match.index, match.index + match[0].length]);
  }

  // Anything outside a recognised segment is surfaced, never swallowed.
  let cursor = 0;
  const leftovers: string[] = [];
  for (const [start, end] of consumed) {
    const gap = text.slice(cursor, start).trim();
    if (gap) leftovers.push(gap);
    cursor = end;
  }
  const tail = text.slice(cursor).trim();
  if (tail) leftovers.push(tail);

  for (const leftover of leftovers) {
    issues.push({
      kind: 'unknown-token',
      token: leftover,
      message: `"${leftover}" is not part of the spec. Use PT, S or Q.`,
    });
  }

  const spec = createEmptySpec();
  const allowed: Record<SpecFacet, (n: number) => boolean> = {
    prepTests: (n) => vocab.prepTests.includes(n),
    sections: (n) => vocab.sections.includes(n),
    questionNumbers: (n) => n >= 1 && n <= vocab.maxQuestionNumber,
  };

  for (const facet of FACET_ORDER) {
    const values = normalizeValues(collected[facet]);

    if (values.length > MAX_VALUES_PER_FACET) {
      issues.push({
        kind: 'too-many',
        token: FACET_LABEL[facet],
        message: `${FACET_LABEL[facet]} lists ${values.length} values. The limit is ${MAX_VALUES_PER_FACET}.`,
      });
      continue;
    }

    const unknown = values.filter((n) => !allowed[facet](n));
    if (unknown.length > 0) {
      issues.push({
        kind: 'unknown-value',
        token: unknown.join(', '),
        message:
          facet === 'questionNumbers'
            ? `No question ${unknown.join(', ')} — numbers run 1 to ${vocab.maxQuestionNumber}.`
            : `${FACET_LABEL[facet]}${unknown.join(', ')} is not in the bank.`,
      });
      continue;
    }

    spec[facet] = values;
  }

  return { spec, issues, ok: issues.length === 0 };
}

/**
 * Compact a sorted, deduplicated run into `a-b` where three or more values are
 * contiguous. Two in a row stay comma-separated: `101,102` is no longer than
 * `101-102` and reads more plainly.
 */
function compactRuns(values: readonly number[]): string {
  const parts: string[] = [];
  let i = 0;

  while (i < values.length) {
    let j = i;
    while (j + 1 < values.length && values[j + 1] === values[j] + 1) j += 1;

    const runLength = j - i + 1;
    if (runLength >= 3) {
      parts.push(`${values[i]}-${values[j]}`);
    } else {
      for (let k = i; k <= j; k += 1) parts.push(String(values[k]));
    }
    i = j + 1;
  }

  return parts.join(',');
}

/**
 * The canonical text for a spec. One formatter, used by the bar and by every
 * PT/S/Q mutation elsewhere, so the two notations can never drift.
 *
 * Guarantees `formatSpec(parseSpec(formatSpec(s)).spec) === formatSpec(s)`.
 */
export function formatSpec(spec: DrillSpec): string {
  const parts: string[] = [];

  for (const facet of FACET_ORDER) {
    const values = normalizeValues(spec[facet] ?? []);
    if (values.length === 0) continue;
    parts.push(`${FACET_LABEL[facet]}${compactRuns(values)}`);
  }

  return parts.join(' ');
}

/* -------------------------------------------------------------------------
 * Exact references — a separate job with a separate input.
 *
 * `PT101.S2.Q1` names one question. This never touches the facet filter:
 * mixing the two in one field would let `PT101 PT102.S2.Q1` request a
 * generated set and a manual one at the same time, with the manual QIDs
 * silently overriding the spec the user could see.
 * ---------------------------------------------------------------------- */

export interface ExactRef {
  pt: number;
  section: number;
  qnum: number;
  /** Canonical text for this reference, echoed back in errors. */
  label: string;
}

export interface ParseExactRefsResult {
  refs: ExactRef[];
  issues: SpecIssue[];
  ok: boolean;
}

/** Cap on one submission, matching the facet ceiling. */
export const MAX_EXACT_REFS = 200;

const EXACT_RE = /^pt(\d+)\.s(\d+)\.q(\d+)$/i;

/**
 * Parse `PT101.S2.Q1, PT101.S2.Q6` into references.
 *
 * Case-insensitive, separated by commas or whitespace, deduplicated with the
 * first occurrence's position preserved. Atomic: one bad reference fails the
 * whole submission, because a partially accepted paste is how a set quietly
 * becomes the wrong set.
 */
export function parseExactRefs(input: string): ParseExactRefsResult {
  const issues: SpecIssue[] = [];
  const refs: ExactRef[] = [];
  const seen = new Set<string>();

  const tokens = (input ?? '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length > MAX_EXACT_REFS) {
    return {
      refs: [],
      issues: [
        {
          kind: 'too-many',
          token: String(tokens.length),
          message: `${tokens.length} references. The limit is ${MAX_EXACT_REFS} at a time.`,
        },
      ],
      ok: false,
    };
  }

  for (const token of tokens) {
    const m = token.match(EXACT_RE);
    if (!m) {
      issues.push({
        kind: 'unknown-token',
        token,
        message: `"${token}" is not a question reference. Write them like PT101.S2.Q1.`,
      });
      continue;
    }

    const pt = Number(m[1]);
    const section = Number(m[2]);
    const qnum = Number(m[3]);
    const label = `PT${pt}.S${section}.Q${qnum}`;

    if (seen.has(label)) continue;
    seen.add(label);
    refs.push({ pt, section, qnum, label });
  }

  return { refs, issues, ok: issues.length === 0 };
}

/** Format references back to canonical text, in the order given. */
export function formatExactRefs(refs: readonly ExactRef[]): string {
  return refs.map((r) => r.label).join(', ');
}
