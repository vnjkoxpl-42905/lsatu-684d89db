/**
 * Diagnostic accuracy is the first saved, graded answer to each distinct
 * question. Source adapters below deliberately exclude visits, blind review,
 * ungraded rows, and unfinished sections. Repeats remain in History elsewhere.
 */
export type ProgressArea = 'LR' | 'RC';
export type ProgressSource = 'lr_attempts' | 'lr_section_history' | 'rc_attempts';
export type ProgressWindow = 7 | 14 | 21 | 30 | 'all';

export interface GradedQuestionAnswer {
  attemptId: string;
  questionKey: string;
  area: ProgressArea;
  source: ProgressSource;
  mode: string;
  correct: boolean;
  gradedAt: string;
  /** Saved answer order when multiple choices become graded together at submission. */
  answeredAt?: string;
  /** Persisted LR question type. RC has no comparable topic in these rows. */
  topic?: string;
}

export interface ProgressCoverage {
  includedSources: ProgressSource[];
  missingSources: Array<{ source: ProgressSource | 'rc_sessions' | 'practice_test_runs'; reason: string }>;
  excludedRows: Record<string, number>;
  knownLimitations?: string[];
}

export interface AreaProgress {
  correct: number;
  denominator: number;
  percent: number | null;
  sample: 'insufficient' | 'early' | 'established';
  evidenceAttemptIds: string[];
  sources: ProgressSource[];
}

export interface FirstAnswerProgress {
  LR: AreaProgress;
  RC: AreaProgress;
  repeatCount: number;
  coverage: ProgressCoverage;
}

export interface LrAttemptSourceRow {
  id: string;
  user_id: string | null;
  qid: string;
  mode: string;
  correct: boolean;
  selected_answer: string | null;
  timestamp_iso: string | null;
  qtype?: string | null;
}

export interface LrSectionSourceRow {
  id: string;
  user_id: string | null;
  mode: string | null;
  completed_at: string | null;
  practice_test_run_id: string | null;
  questions_json: unknown;
}

export interface RcAttemptSourceRow {
  id: string;
  user_id: string;
  session_id: string;
  passage_id: number;
  question_id: number;
  selected: string | null;
  is_correct: boolean | null;
  created_at: string;
}

export interface RcSessionSourceRow {
  id: string;
  user_id: string;
  status: string;
  completed_at: string | null;
  excluded_from_analytics: boolean;
  practice_test_run_id: string | null;
  timed_section_sitting_id?: string | null;
  /** Legacy parent provenance can live only here (practiceTestRunId, timedSectionSittingId). */
  config?: unknown;
}

export interface PracticeTestSourceRow {
  id: string;
  user_id: string;
  status: string;
  completed_at: string | null;
}

// LRQuestionModal writes `bootcamp-pf` when an authored bootcamp question is
// answered; the ordinary runner writes the four drill modes beside it.
const LR_DRILL_MODES = new Set(['adaptive', 'type-drill', 'natural-drill', 'practice-set', 'bootcamp-pf']);

function validDate(value: string | null | undefined): value is string {
  return !!value && Number.isFinite(Date.parse(value));
}

/** Only saved answer rows from known LR drill modes. Full sections use their graded result. */
export function adaptLrAttempts(rows: LrAttemptSourceRow[], studentId: string): GradedQuestionAnswer[] {
  return rows.flatMap((row) => {
    if (row.user_id !== studentId || !LR_DRILL_MODES.has(row.mode)) return [];
    if (!row.qid || !row.selected_answer || !validDate(row.timestamp_iso)) return [];
    return [{
      attemptId: `attempts:${row.id}`,
      questionKey: `LR:${row.qid}`,
      area: 'LR' as const,
      source: 'lr_attempts' as const,
      mode: row.mode,
      correct: row.correct,
      gradedAt: row.timestamp_iso,
      answeredAt: row.timestamp_iso,
      topic: row.qtype?.trim() || undefined,
    }];
  });
}

/** Completed section detail is the authority for LR timed and full-test legs. */
export function adaptLrSections(
  rows: LrSectionSourceRow[],
  studentId: string,
  completedRunIds: ReadonlySet<string>,
): GradedQuestionAnswer[] {
  const answers: GradedQuestionAnswer[] = [];
  for (const row of rows) {
    if (row.user_id !== studentId || row.mode !== 'full-section' || !validDate(row.completed_at)) continue;
    if (row.practice_test_run_id && !completedRunIds.has(row.practice_test_run_id)) continue;
    if (!Array.isArray(row.questions_json)) continue;
    for (const raw of row.questions_json) {
      if (!raw || typeof raw !== 'object') continue;
      const question = raw as Record<string, unknown>;
      if (typeof question.qid !== 'string' || !question.qid) continue;
      if (typeof question.initialAnswer !== 'string' || !question.initialAnswer || question.initialAnswer === '—') continue;
      if (typeof question.initialCorrect !== 'boolean') continue;
      answers.push({
        attemptId: `section_history:${row.id}:${question.qid}`,
        questionKey: `LR:${question.qid}`,
        area: 'LR',
        source: 'lr_section_history',
        mode: row.practice_test_run_id ? 'practice-test' : 'timed-section',
        correct: question.initialCorrect,
        gradedAt: row.completed_at,
        topic: typeof question.qtype === 'string' ? question.qtype.trim() || undefined : undefined,
      });
    }
  }
  return answers;
}

export type RcParentResolution = { kind: 'none' } | { kind: 'run'; id: string } | { kind: 'malformed' };

function configRecord(config: unknown): Record<string, unknown> | null {
  return config && typeof config === 'object' && !Array.isArray(config) ? config as Record<string, unknown> : null;
}

/** An explicit non-empty string column wins; otherwise a non-empty string config id. */
function stringIdentity(column: unknown, configValue: unknown): { kind: 'none' } | { kind: 'id'; id: string } | { kind: 'malformed' } {
  if (typeof column === 'string' && column.trim()) return { kind: 'id', id: column.trim() };
  if (column !== null && column !== undefined && typeof column !== 'string') return { kind: 'malformed' };
  if (typeof configValue === 'string' && configValue.trim()) return { kind: 'id', id: configValue.trim() };
  if (configValue !== null && configValue !== undefined && typeof configValue !== 'string') return { kind: 'malformed' };
  return { kind: 'none' };
}

/**
 * Parent practice-test identity for an RC session. Legacy sessions can carry it only in
 * config. A malformed (non-string) identity is not treated as ordinary released work.
 */
export function resolveRcPracticeTestParent(session: Pick<RcSessionSourceRow, 'practice_test_run_id' | 'config'>): RcParentResolution {
  const resolved = stringIdentity(session.practice_test_run_id, configRecord(session.config)?.practiceTestRunId);
  return resolved.kind === 'id' ? { kind: 'run', id: resolved.id } : resolved;
}

/** Timed-sitting provenance only labels the mode; completion is the session's own. */
function hasTimedSitting(session: Pick<RcSessionSourceRow, 'timed_section_sitting_id' | 'config'>): boolean {
  return stringIdentity(session.timed_section_sitting_id, configRecord(session.config)?.timedSectionSittingId).kind === 'id';
}

/** RC rows count only after their session, and any enclosing full test, finishes. */
export function adaptRcAttempts(
  attempts: RcAttemptSourceRow[],
  sessions: RcSessionSourceRow[],
  studentId: string,
  completedRunIds: ReadonlySet<string>,
): GradedQuestionAnswer[] {
  const sessionsById = new Map(sessions.filter((session) => session.user_id === studentId).map((session) => [session.id, session]));
  return attempts.flatMap((attempt) => {
    if (attempt.user_id !== studentId || !attempt.selected || typeof attempt.is_correct !== 'boolean') return [];
    const session = sessionsById.get(attempt.session_id);
    if (!session || session.status !== 'completed' || !validDate(session.completed_at) || session.excluded_from_analytics) return [];
    const parent = resolveRcPracticeTestParent(session);
    if (parent.kind === 'malformed') return [];
    if (parent.kind === 'run' && !completedRunIds.has(parent.id)) return [];
    // Eligible at session completion. A pick made before then becomes graded at
    // completion; a later review attempt keeps the date it was actually saved.
    const saved = validDate(attempt.created_at) ? attempt.created_at : null;
    const gradedAt = saved && Date.parse(saved) > Date.parse(session.completed_at) ? saved : session.completed_at;
    return [{
      attemptId: `rc_attempts:${attempt.id}`,
      questionKey: `RC:${attempt.passage_id}:${attempt.question_id}`,
      area: 'RC' as const,
      source: 'rc_attempts' as const,
      mode: parent.kind === 'run' ? 'practice-test' : hasTimedSitting(session) ? 'timed-section' : 'rc-drill',
      correct: attempt.is_correct,
      gradedAt,
      answeredAt: saved ?? gradedAt,
    }];
  });
}

export function completedPracticeTestIds(rows: PracticeTestSourceRow[], studentId: string): Set<string> {
  return new Set(rows
    .filter((row) => row.user_id === studentId && row.status === 'complete' && validDate(row.completed_at))
    .map((row) => row.id));
}

function areaProgress(rows: GradedQuestionAnswer[], area: ProgressArea): AreaProgress {
  const selected = rows.filter((row) => row.area === area);
  const denominator = selected.length;
  const correct = selected.filter((row) => row.correct).length;
  return {
    correct,
    denominator,
    percent: denominator < 3 ? null : Math.round((correct / denominator) * 100),
    sample: denominator < 3 ? 'insufficient' : denominator < 10 ? 'early' : 'established',
    evidenceAttemptIds: selected.map((row) => row.attemptId),
    sources: [...new Set(selected.map((row) => row.source))],
  };
}

/** Keep one row per persisted attempt ID across paged source reads. */
export function orderedDistinctAnswers(answers: GradedQuestionAnswer[]): GradedQuestionAnswer[] {
  const ordered = answers
    .filter((answer) => validDate(answer.gradedAt))
    .sort((a, b) => Date.parse(a.gradedAt) - Date.parse(b.gradedAt)
      || Date.parse(a.answeredAt ?? a.gradedAt) - Date.parse(b.answeredAt ?? b.gradedAt)
      || a.attemptId.localeCompare(b.attemptId));
  const seenAttemptIds = new Set<string>();
  return ordered.filter((answer) => {
    if (seenAttemptIds.has(answer.attemptId)) return false;
    seenAttemptIds.add(answer.attemptId);
    return true;
  });
}

/** Select each question's first graded answer globally, then apply the window. */
export function projectFirstAnswerProgress(input: {
  answers: GradedQuestionAnswer[];
  window: ProgressWindow;
  asOf: string;
  coverage: ProgressCoverage;
}): FirstAnswerProgress {
  const ordered = orderedDistinctAnswers(input.answers);
  const firstByQuestion = new Map<string, GradedQuestionAnswer>();
  for (const answer of ordered) {
    if (!firstByQuestion.has(answer.questionKey)) firstByQuestion.set(answer.questionKey, answer);
  }
  const end = Date.parse(input.asOf);
  const start = input.window === 'all' ? Number.NEGATIVE_INFINITY : end - input.window * 86_400_000;
  const firstInWindow = [...firstByQuestion.values()].filter((answer) => {
    const at = Date.parse(answer.gradedAt);
    return at >= start && at <= end;
  });
  return {
    LR: areaProgress(firstInWindow, 'LR'),
    RC: areaProgress(firstInWindow, 'RC'),
    repeatCount: ordered.filter((answer) => {
      const at = Date.parse(answer.gradedAt);
      return at >= start && at <= end && firstByQuestion.get(answer.questionKey) !== answer;
    }).length,
    coverage: input.coverage,
  };
}
