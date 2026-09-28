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
    if (session.practice_test_run_id && !completedRunIds.has(session.practice_test_run_id)) return [];
    return [{
      attemptId: `rc_attempts:${attempt.id}`,
      questionKey: `RC:${attempt.passage_id}:${attempt.question_id}`,
      area: 'RC' as const,
      source: 'rc_attempts' as const,
      mode: session.practice_test_run_id ? 'practice-test' : 'rc-drill',
      correct: attempt.is_correct,
      // The answer is not eligible for diagnostic accuracy until graded work
      // is submitted, so the window uses session completion rather than pick time.
      gradedAt: session.completed_at,
      answeredAt: attempt.created_at,
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

/** Select each question's first graded answer globally, then apply the window. */
export function projectFirstAnswerProgress(input: {
  answers: GradedQuestionAnswer[];
  window: ProgressWindow;
  asOf: string;
  coverage: ProgressCoverage;
}): FirstAnswerProgress {
  const ordered = input.answers
    .filter((answer) => validDate(answer.gradedAt))
    .sort((a, b) => Date.parse(a.gradedAt) - Date.parse(b.gradedAt)
      || Date.parse(a.answeredAt ?? a.gradedAt) - Date.parse(b.answeredAt ?? b.gradedAt)
      || a.attemptId.localeCompare(b.attemptId));
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
