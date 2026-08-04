import { questionBank, CANONICAL_QTYPES, type LRQuestion } from '@/lib/questionLoader';

/**
 * Breakdown tables for /analytics.
 *
 * Every tab on the page is the same shape: a labelled row carrying how often
 * the tag appears in the pool, how the student did on it, and how long they
 * took. Question Types, Reasoning Types, Question Features and Question
 * Difficulty differ only in how rows are keyed and grouped.
 *
 * Truthfulness rules, which the renderer relies on:
 *   - `accuracy`, `avgTimeMs` and `avgDifficulty` are **null** when the student
 *     has not attempted anything in that row. Null renders as an em dash, never
 *     as 0%. A brand-new student sees no fabricated zeros anywhere.
 *   - `frequency` is a property of the question bank, not of the student, so it
 *     is always real even with zero attempts. It is what makes an untouched row
 *     still worth showing.
 */

export interface AttemptLike {
  qid: string;
  qtype: string;
  correct: boolean;
  time_ms: number | null;
}

export interface BreakdownRow {
  key: string;
  label: string;
  /** Family heading this row sits under. Empty string = ungrouped. */
  group: string;
  /** Questions in the bank carrying this tag. */
  poolCount: number;
  /** poolCount / total pool for the section, 0..1. */
  frequency: number;
  attempted: number;
  correct: number;
  /** null when attempted === 0 */
  accuracy: number | null;
  /** null when no attempt carried a time */
  avgTimeMs: number | null;
  /** null when attempted === 0 */
  avgDifficulty: number | null;
}

export type BreakdownKind =
  | 'qtype'
  | 'reasoningType'
  | 'questionFeature'
  | 'difficulty'
  | 'wrongByQtype';

/** Which canonical family a question type belongs to, e.g. Flaw -> ASSUMPTION / OBJECTION. */
const FAMILY_BY_QTYPE = new Map<string, string>(
  CANONICAL_QTYPES.groups.flatMap((g) => g.types.map((t) => [t, g.name] as const)),
);

/**
 * Feature families. The bank carries 60 distinct features with no grouping of
 * their own, so they are bucketed here by the reasoning move they belong to.
 * Anything unlisted falls into "Other" rather than being dropped.
 */
const FEATURE_FAMILY: Record<string, string> = {
  'Conditional Diagramming': 'Conditional logic',
  'Contrapositive Logic': 'Conditional logic',
  'Necessary vs. Sufficient Flaw': 'Conditional logic',
  'Refute a Conditional': 'Conditional logic',
  Binaries: 'Conditional logic',
  'Complex Conditionals': 'Conditional logic',
  'Conditional Conclusion': 'Conditional logic',
  'Explain Curious Fact': 'Causation',
  'Anti-Causal': 'Causation',
  'Causal Difference-Maker': 'Causation',
  'Plans / Recommendations': 'Comparison',
  Timeframes: 'Comparison',
  'Net Effect': 'Comparison',
  Analogies: 'Comparison',
  'Assumes Similarity': 'Comparison',
  Predictions: 'Comparison',
  Rebuttals: 'Other reasoning moves',
  'Famous Flaws': 'Other reasoning moves',
  'Ruling Out Options': 'Other reasoning moves',
  'Part vs. Whole': 'Other reasoning moves',
  'Sampling Flaw': 'Other reasoning moves',
  Science: 'Stimulus traits',
  'New Concept in Conclusion': 'Stimulus traits',
  'Math-y Stuff': 'Stimulus traits',
  'First Sentence Conclusion': 'Stimulus traits',
  'Important Pivot': 'Stimulus traits',
  'Dense Stimulus': 'Stimulus traits',
  'Intermediate Conclusions': 'Stimulus traits',
  Quantifiers: 'Stimulus traits',
  Medical: 'Stimulus traits',
  'Missing Link / Idea': 'Answer traits',
  Alternatives: 'Answer traits',
  Defender: 'Answer traits',
  Plausibility: 'Answer traits',
  'Abstract Answers': 'Answer traits',
  'Repetitve Answers': 'Answer traits',
  '2-Speaker': 'Format',
  'Principles in Answers': 'Format',
  EXCEPT: 'Format',
  'Logical Completion': 'Format',
};

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Level 1',
  2: 'Level 2',
  3: 'Level 3',
  4: 'Level 4',
  5: 'Level 5',
};

interface Bucket {
  label: string;
  group: string;
  pool: number;
  attempted: number;
  correct: number;
  timeMsTotal: number;
  timedCount: number;
  difficultyTotal: number;
  difficultyCount: number;
}

function emptyBucket(label: string, group: string): Bucket {
  return {
    label,
    group,
    pool: 0,
    attempted: 0,
    correct: 0,
    timeMsTotal: 0,
    timedCount: 0,
    difficultyTotal: 0,
    difficultyCount: 0,
  };
}

/** The tag values a question contributes to, for a given breakdown. */
function keysFor(kind: BreakdownKind, q: LRQuestion): string[] {
  switch (kind) {
    case 'qtype':
    case 'wrongByQtype':
      return q.qtype && q.qtype !== 'Unknown' ? [q.qtype] : [];
    case 'reasoningType':
      return q.reasoningType ?? [];
    case 'questionFeature':
      return q.questionFeatures ?? [];
    case 'difficulty':
      return typeof q.difficulty === 'number' && q.difficulty > 0 ? [String(q.difficulty)] : [];
  }
}

function groupFor(kind: BreakdownKind, key: string): string {
  switch (kind) {
    case 'qtype':
    case 'wrongByQtype':
      return FAMILY_BY_QTYPE.get(key) ?? 'OTHER';
    case 'questionFeature':
      return FEATURE_FAMILY[key] ?? 'Other';
    default:
      return '';
  }
}

function labelFor(kind: BreakdownKind, key: string): string {
  return kind === 'difficulty' ? (DIFFICULTY_LABEL[Number(key)] ?? `Level ${key}`) : key;
}

/**
 * Build one breakdown table.
 *
 * `attempts` should already be filtered to the section being viewed. The pool
 * is read from the loaded question bank, so frequency is bank-wide truth rather
 * than a function of what this student happened to see.
 */
export function buildBreakdown(kind: BreakdownKind, attempts: AttemptLike[]): BreakdownRow[] {
  if (!questionBank.isReady()) return [];

  const pool = questionBank.getAllQuestions();
  const buckets = new Map<string, Bucket>();

  const touch = (key: string) => {
    let b = buckets.get(key);
    if (!b) {
      b = emptyBucket(labelFor(kind, key), groupFor(kind, key));
      buckets.set(key, b);
    }
    return b;
  };

  // Pass 1 — the pool, which gives every row its frequency.
  let poolTotal = 0;
  for (const q of pool) {
    const keys = keysFor(kind, q);
    if (keys.length > 0) poolTotal++;
    for (const key of keys) touch(key).pool++;
  }

  // Pass 2 — this student's attempts, joined back to the bank by qid.
  for (const a of attempts) {
    const q = questionBank.getQuestion(a.qid);
    if (!q) continue;
    // Wrong-answer breakdowns only count misses.
    if (kind === 'wrongByQtype' && a.correct) continue;
    for (const key of keysFor(kind, q)) {
      const b = touch(key);
      b.attempted++;
      if (a.correct) b.correct++;
      if (typeof a.time_ms === 'number' && a.time_ms > 0) {
        b.timeMsTotal += a.time_ms;
        b.timedCount++;
      }
      if (typeof q.difficulty === 'number' && q.difficulty > 0) {
        b.difficultyTotal += q.difficulty;
        b.difficultyCount++;
      }
    }
  }

  const rows: BreakdownRow[] = [...buckets.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    group: b.group,
    poolCount: b.pool,
    frequency: poolTotal > 0 ? b.pool / poolTotal : 0,
    attempted: b.attempted,
    correct: b.correct,
    accuracy: b.attempted > 0 ? b.correct / b.attempted : null,
    avgTimeMs: b.timedCount > 0 ? b.timeMsTotal / b.timedCount : null,
    avgDifficulty: b.difficultyCount > 0 ? b.difficultyTotal / b.difficultyCount : null,
  }));

  // Difficulty is an ordinal scale, so it sorts by level. Everything else sorts
  // by how much of the test it accounts for, which is the order that tells a
  // student where their time is best spent.
  rows.sort((x, y) =>
    kind === 'difficulty' ? Number(x.key) - Number(y.key) : y.frequency - x.frequency,
  );
  return rows;
}

/** Family display order, so groups render in taxonomy order rather than by size. */
export function groupOrder(kind: BreakdownKind): string[] {
  if (kind === 'qtype' || kind === 'wrongByQtype') {
    return CANONICAL_QTYPES.groups.map((g) => g.name);
  }
  if (kind === 'questionFeature') {
    return [
      'Conditional logic',
      'Causation',
      'Comparison',
      'Other reasoning moves',
      'Stimulus traits',
      'Answer traits',
      'Format',
      'Other',
    ];
  }
  return [];
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPercent(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}
