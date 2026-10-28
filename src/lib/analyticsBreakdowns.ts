import { questionBank, CANONICAL_QTYPES, type LRQuestion } from '@/lib/questionLoader';
import {
  FEATURE_FAMILIES,
  FEATURE_FAMILY_BY_ID,
  FALLBACK_FEATURE_FAMILY_LABEL,
  familyForFeature,
} from '@/lib/questionFeatureFamilies';

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
 * Feature families come from the canonical taxonomy in `questionFeatureFamilies.ts`,
 * which is derived from the question bank itself and is the single source of truth.
 *
 * This file used to carry its own copy of the map. That copy was transcribed from
 * LSAT Lab's analytics UI, so it inherited their label spellings — `Repetitve Answers`
 * (their typo), `Necessary vs. Sufficient Flaw`, `Sampling Flaw` — none of which match
 * the strings in our bank (`Repetitive Answers`, `Sufficient vs. Necessary Flaw`,
 * `Sampling`). Those rows, plus ~20 real features the copy never listed at all,
 * silently fell into "Other". See research/lsatlab-analytics-teardown-2026-08-26.
 *
 * Do not reintroduce a local map. Add features to `questionFeatureFamilies.ts`.
 */

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

/**
 * Feature -> family DISPLAY LABEL.
 *
 * `familyForFeature()` returns the family *id* ("traps"), while the grouped
 * renderer and `groupOrder()` both work in labels ("Answer Choice Traps"). This
 * is the bridge. A feature the taxonomy has never seen falls to the shared
 * fallback label rather than throwing — but the bank-coverage test
 * (`questionFeatureBankCoverage.test.ts`) fails the build if that ever happens,
 * so the fallback is a safety net and not an expected path.
 */
function featureFamilyLabel(feature: string): string {
  const id = familyForFeature(feature);
  if (!id) return FALLBACK_FEATURE_FAMILY_LABEL;
  return FEATURE_FAMILY_BY_ID[id]?.label ?? FALLBACK_FEATURE_FAMILY_LABEL;
}

function groupFor(kind: BreakdownKind, key: string): string {
  switch (kind) {
    case 'qtype':
    case 'wrongByQtype':
      return FAMILY_BY_QTYPE.get(key) ?? 'OTHER';
    case 'questionFeature':
      return featureFamilyLabel(key);
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
      ...FEATURE_FAMILIES.map((f) => f.label),
      FALLBACK_FEATURE_FAMILY_LABEL,
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
