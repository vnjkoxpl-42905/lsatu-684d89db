/**
 * Passage selection for the drill builder.
 *
 * Deterministic ordering, no model and no inference. "Adaptive" here means one
 * thing only: prefer fresh passages whose difficulty sits near the level the
 * student's own recent accuracy puts them at. Nothing else, and it is never
 * described to the student as anything more than that.
 */
import type {
  RcIndexPassage,
  RcPassageState,
  RcQuestionHistory,
  RcQuestionHistoryEntry,
} from './rcTypes';

export type { RcPassageState };

export type RcStatusFilter = 'any' | 'fresh' | 'incorrect_before' | 'incorrect_last';

export interface RcSelectionFilters {
  topics: string[];
  formats: string[];
  frameworks: string[];
  families: string[];
  /** Empty means Adaptive: pick the target from the student's own accuracy. */
  difficulties: number[];
  status: RcStatusFilter;
  preptestMin: number;
  preptestMax: number;
}

export type RcIndexPassageWithPt = RcIndexPassage & { preptest: number };

/** The label used anywhere this behavior is named. Nothing grander. */
export const RC_ADAPTIVE_LABEL = 'Adaptive: fresh passages near your level.';

/** Per-passage roll-up of the student's history across its questions. */
export interface RcPassageStatus {
  state: RcPassageState;
  attempted: boolean;
  everIncorrect: boolean;
  incorrectOnLastTake: boolean;
  lastFirstTakeIncorrect: boolean;
  reviewCorrected: boolean;
  attempts: number;
  answeredCount: number;
  questionCount: number;
  lastSeenAt: number | null;
  missed: number;
}

function isEntryAnswered(entry: RcQuestionHistoryEntry): boolean {
  if (typeof entry.answered === 'boolean') return entry.answered;
  if (entry.firstTakeCorrect === null || entry.unansweredOnFirstTake === true) return false;
  return true;
}

function isEntryEverIncorrect(entry: RcQuestionHistoryEntry): boolean {
  if (!isEntryAnswered(entry)) return false;
  return Boolean(entry.everIncorrect);
}

function isEntryLastFirstTakeIncorrect(entry: RcQuestionHistoryEntry): boolean {
  if (typeof entry.lastFirstTakeIncorrect === 'boolean') return entry.lastFirstTakeIncorrect;
  if (!isEntryAnswered(entry)) return false;
  return Boolean(entry.incorrectOnLastTake);
}

function hasCompletedSessionCoveringAllQuestions(entries: RcQuestionHistoryEntry[]): boolean {
  if (entries.length === 0) return false;
  const allHaveSessionLists = entries.every((e) => Array.isArray(e.completedAnsweredSessionIds));
  if (allHaveSessionLists) {
    const first = entries[0].completedAnsweredSessionIds ?? [];
    if (first.length === 0) return false;
    const restSets = entries
      .slice(1)
      .map((e) => new Set(e.completedAnsweredSessionIds ?? []));
    return first.some((sessionId) => restSets.every((set) => set.has(sessionId)));
  }
  return entries.every((e) =>
    typeof e.completedAnswered === 'boolean' ? e.completedAnswered : isEntryAnswered(e),
  );
}

export function passageStatus(
  passage: RcIndexPassageWithPt,
  questionIds: number[],
  history: RcQuestionHistory,
): RcPassageStatus {
  const totalQuestions = questionIds.length > 0 ? questionIds.length : passage.questionCount;
  const entries = questionIds
    .map((id) => history.get(id))
    .filter((entry): entry is RcQuestionHistoryEntry => Boolean(entry) && entry.attempts > 0);

  const attempted = entries.length > 0;
  const answeredEntries = entries.filter(isEntryAnswered);
  const answeredCount = answeredEntries.length;
  const allQuestionsSeen = totalQuestions > 0 && entries.length === totalQuestions;
  const completedInFinishedSession =
    allQuestionsSeen && hasCompletedSessionCoveringAllQuestions(entries);

  let state: RcPassageState;
  if (!attempted) {
    state = 'not_attempted';
  } else if (completedInFinishedSession) {
    state = 'completed';
  } else if (answeredCount === 0 && entries.some((e) => e.unansweredOnFirstTake === true)) {
    state = 'skipped_only';
  } else {
    state = 'partial';
  }

  const everIncorrect = entries.some(isEntryEverIncorrect);
  const lastFirstTakeIncorrect = entries.some(isEntryLastFirstTakeIncorrect);
  const reviewCorrected = entries.some((e) => Boolean(e.reviewCorrected));
  const missed = entries.filter(isEntryEverIncorrect).length;

  return {
    state,
    attempted,
    everIncorrect,
    incorrectOnLastTake: lastFirstTakeIncorrect,
    lastFirstTakeIncorrect,
    reviewCorrected,
    attempts: entries.reduce((n, e) => n + e.attempts, 0),
    answeredCount,
    questionCount: totalQuestions,
    lastSeenAt: entries.reduce<number | null>((latest, e) => {
      if (!e.lastSeenAt) return latest;
      const t = Date.parse(e.lastSeenAt);
      return latest == null || t > latest ? t : latest;
    }, null),
    missed,
  };
}

export function formatPassageStatusLabel(status: RcPassageStatus): string {
  switch (status.state) {
    case 'not_attempted':
      return 'Not attempted';
    case 'skipped_only':
      return 'Skipped';
    case 'partial':
      return status.missed > 0 ? `Partial · ${status.missed} missed` : 'Partial';
    case 'completed':
      return status.missed > 0 ? `${status.missed} missed` : 'Completed';
  }
}

function hasGradedFirstTake(entry: RcQuestionHistoryEntry): boolean {
  if (!(entry.lastGradedAt ?? entry.lastSeenAt) || entry.attempts <= 0) return false;
  if (entry.unansweredOnFirstTake === true) return false;
  if ('firstTakeCorrect' in entry && entry.firstTakeCorrect === null) return false;
  if (typeof entry.answered === 'boolean' && !entry.answered) return false;
  return true;
}

function isFirstTakeCorrect(entry: RcQuestionHistoryEntry): boolean {
  if (typeof entry.firstTakeCorrect === 'boolean') return entry.firstTakeCorrect;
  return !entry.everIncorrect && !entry.incorrectOnLastTake;
}

/**
 * The student's rolling accuracy over their last 40 graded first-take attempts,
 * or fewer. Skipped questions, abandoned sessions, and blind-review rows are
 * excluded. Returns null when they have no graded first-take history.
 */
export function rollingAccuracy(history: RcQuestionHistory): number | null {
  const entries = [...history.values()].filter(hasGradedFirstTake);
  if (entries.length === 0) return null;
  const recent = entries
    .sort((a, b) => Date.parse(b.lastGradedAt ?? b.lastSeenAt!) - Date.parse(a.lastGradedAt ?? a.lastSeenAt!))
    .slice(0, 40);
  const right = recent.filter(isFirstTakeCorrect).length;
  return right / recent.length;
}

/** Accuracy maps to a target difficulty. No history starts at 2. */
export function targetDifficulty(accuracy: number | null): number {
  if (accuracy == null) return 2;
  if (accuracy >= 0.8) return 4;
  if (accuracy >= 0.6) return 3;
  return 2;
}

export function matchesFilters(
  passage: RcIndexPassageWithPt,
  filters: RcSelectionFilters,
  status: RcPassageStatus,
): boolean {
  if (passage.preptest < filters.preptestMin || passage.preptest > filters.preptestMax) return false;
  if (filters.topics.length > 0 && (!passage.topic || !filters.topics.includes(passage.topic)))
    return false;
  if (filters.formats.length > 0 && (!passage.format || !filters.formats.includes(passage.format)))
    return false;
  if (
    filters.frameworks.length > 0 &&
    !passage.frameworks.some((f) => filters.frameworks.includes(f))
  )
    return false;

  switch (filters.status) {
    case 'fresh':
      if (status.state !== 'not_attempted') return false;
      break;
    case 'incorrect_before':
      if (!status.everIncorrect) return false;
      break;
    case 'incorrect_last':
      if (!status.lastFirstTakeIncorrect) return false;
      break;
    default:
      break;
  }
  return true;
}

/**
 * A tiny deterministic PRNG so a session's tie-break order is reproducible
 * from its timestamp rather than being different on every render.
 */
function seeded(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export interface RcSelectionInput {
  pool: RcIndexPassageWithPt[];
  /** Question ids per passage, so status can roll up from the history. */
  questionIdsByPassage: Map<number, number[]>;
  filters: RcSelectionFilters;
  history: RcQuestionHistory;
  count: number;
  seed: number;
}

export interface RcSelectionResult {
  selected: RcIndexPassageWithPt[];
  poolSize: number;
  /** Set when the pool could not fill the request. */
  shortfallMessage: string | null;
  target: number;
  accuracy: number | null;
}

export function selectPassages(input: RcSelectionInput): RcSelectionResult {
  const { pool, questionIdsByPassage, filters, history, count, seed } = input;

  const statuses = new Map<number, RcPassageStatus>();
  const filtered = pool.filter((p) => {
    // A passage with no drillable questions cannot be drilled. Eleven passages
    // are in this state because the source published no answer choices for them.
    if (p.questionCount === 0) return false;
    const status = passageStatus(p, questionIdsByPassage.get(p.passageId) ?? [], history);
    statuses.set(p.passageId, status);
    return matchesFilters(p, filters, status);
  });

  const explicit = filters.difficulties.length > 0;
  const accuracy = explicit ? null : rollingAccuracy(history);
  const target = explicit ? 0 : targetDifficulty(accuracy);

  const eligible = explicit
    ? filtered.filter((p) => p.difficulty != null && filters.difficulties.includes(p.difficulty))
    : filtered;

  const random = seeded(seed);
  const jitter = new Map(eligible.map((p) => [p.passageId, random()]));

  const ordered = [...eligible].sort((a, b) => {
    if (!explicit) {
      const da = Math.abs((a.difficulty ?? target) - target);
      const db = Math.abs((b.difficulty ?? target) - target);
      if (da !== db) return da - db;
    }
    const sa = statuses.get(a.passageId)!;
    const sb = statuses.get(b.passageId)!;
    if (sa.attempts !== sb.attempts) return sa.attempts - sb.attempts;
    const la = sa.lastSeenAt ?? 0;
    const lb = sb.lastSeenAt ?? 0;
    if (la !== lb) return la - lb;
    return (jitter.get(a.passageId) ?? 0) - (jitter.get(b.passageId) ?? 0);
  });

  const selected = ordered.slice(0, count);

  return {
    selected,
    poolSize: eligible.length,
    shortfallMessage:
      eligible.length < count
        ? `Only ${eligible.length} passage${eligible.length === 1 ? '' : 's'} match — loosen a filter to get more`
        : null,
    target,
    accuracy,
  };
}
