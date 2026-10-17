/**
 * Supabase reads and writes for RC progress: sessions, attempts, annotations.
 *
 * Content is static JSON (see rcBank.ts). Only the student's own work lives in
 * the database, and RLS scopes every row to them.
 */
import {
  rcDb,
  RC_ANNOTATIONS_TABLE,
  RC_ATTEMPTS_TABLE,
  RC_SESSIONS_TABLE,
  type RcAttemptRow,
  type RcDrillSessionRow,
} from './rcSupabase.types';
import type {
  RcAttempt,
  RcDraftAnswer,
  RcDrillConfig,
  RcDrillSession,
  RcHighlight,
  RcLetter,
  RcQuestionHistory,
  RcQuestionHistoryEntry,
  RcSessionStatus,
} from '../lib/rcTypes';
import { readRcDraftAnswers } from '../lib/rcTypes';
import { isActivePracticeTestDevice } from '@/lib/practiceTestStore';

/** Postgres "relation does not exist" — the migration has not been run. */
const MISSING_TABLE = '42P01';

export class RcTablesMissingError extends Error {
  constructor() {
    super(
      'The RC progress tables are missing. Run supabase/migrations/20260806000000_rc_drilling.sql.',
    );
    this.name = 'RcTablesMissingError';
  }
}

function raise(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (error.code === MISSING_TABLE) throw new RcTablesMissingError();
  throw new Error(error.message ?? 'Unknown Supabase error');
}

/** Confirms the progress tables exist. Call once on player/hub boot. */
export async function checkRcTables(): Promise<true> {
  const { error } = await rcDb.from(RC_SESSIONS_TABLE).select('id').limit(1);
  raise(error);
  return true;
}

async function requireUserId(): Promise<string> {
  const { data } = await rcDb.auth.getUser();
  const id = data?.user?.id;
  if (!id) throw new Error('You need to be signed in to drill.');
  return id;
}

export function toSession(row: RcDrillSessionRow): RcDrillSession {
  const config = row.config as RcDrillConfig & { timerSeconds?: number | null };
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('The saved reading section settings could not be verified.');
  const protectedId = (row as RcDrillSessionRow & { timed_section_sitting_id?: string | null }).timed_section_sitting_id ?? config.timedSectionSittingId;
  const protectedTestId = config.practiceTestRunId ?? row.practice_test_run_id;
  // The protected writer stores one section budget, unlike legacy passage clocks.
  // Adapt that acknowledged shape for the existing read-only report and review.
  const timing = config.timing ?? ((protectedId || protectedTestId) && config.timerSeconds === null ? { mode: 'unlimited' as const }
    : (protectedId || protectedTestId) && typeof config.timerSeconds === 'number' && Number.isFinite(config.timerSeconds) && config.timerSeconds > 0 && row.passage_ids?.length
      ? { mode: 'per_passage_budget' as const, secondsPerPassage: config.timerSeconds / row.passage_ids.length } : undefined);
  if (!timing || !['unlimited', 'per_passage_budget'].includes(timing.mode)) throw new Error('The saved reading section timing could not be verified.');
  return {
    id: row.id,
    userId: row.user_id,
    config: {
      ...config,
      ...(config.draftAnswers === undefined ? {} : { draftAnswers: readRcDraftAnswers(config.draftAnswers) }),
      timing,
      timedSectionSittingId: protectedId,
      practiceTestRunId: config.practiceTestRunId ?? row.practice_test_run_id ?? undefined,
      practiceTestLegIndex: config.practiceTestLegIndex ?? row.practice_test_leg ?? undefined,
    },
    passageIds: row.passage_ids ?? [],
    status: row.status as RcSessionStatus,
    excludedFromAnalytics: row.excluded_from_analytics,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function toAttempt(row: RcAttemptRow): RcAttempt {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    questionId: row.question_id,
    passageId: row.passage_id,
    selected: (row.selected as RcLetter | null) ?? null,
    isCorrect: row.is_correct,
    timeMs: row.time_ms,
    flagged: row.flagged,
    eliminations: (row.eliminations ?? []) as RcLetter[],
    isFirstAttempt: row.is_first_attempt,
    createdAt: row.created_at,
  };
}

async function assertActivePracticeTestSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('That practice section could not be found.');
  if (session.config.practiceTestRunId && !await isActivePracticeTestDevice(session.userId, session.config.practiceTestRunId)) {
    throw new Error('This practice test is active on another device.');
  }
}

/* ----------------------------------------------------------------- sessions */

export async function createSession(
  config: RcDrillConfig,
  passageIds: number[],
  request?: { id: string; actorId: string },
): Promise<RcDrillSession> {
  const userId = await requireUserId();
  if (request && request.actorId !== userId) throw new Error('The signed-in account changed.');
  if (config.practiceTestRunId && !await isActivePracticeTestDevice(userId, config.practiceTestRunId)) {
    throw new Error('This practice test is active on another device.');
  }
  if (await requireUserId() !== userId) throw new Error('The signed-in account changed.');
  // Reusing drill settings (including Drill your misses) must start fresh work.
  const { draftAnswers: _draftAnswers, ...freshConfig } = config;
  const { data, error } = await rcDb
    .from(RC_SESSIONS_TABLE)
    .insert({
      ...(request ? { id: request.id } : {}),
      user_id: userId,
      config: freshConfig,
      passage_ids: passageIds,
      practice_test_run_id: config.practiceTestRunId ?? null,
      practice_test_leg: config.practiceTestLegIndex ?? null,
    })
    .select()
    .single();
  raise(error);
  if (await requireUserId() !== userId) throw new Error('The signed-in account changed.');
  const saved = toSession(data as RcDrillSessionRow);
  if (saved.userId !== userId || request && saved.id !== request.id) throw new Error('The reading drill save could not be verified.');
  return saved;
}

export async function getSession(id: string, expectedActorId?: string): Promise<RcDrillSession | null> {
  if (expectedActorId && await requireUserId() !== expectedActorId) throw new Error('The signed-in account changed.');
  const { data, error } = await rcDb.from(RC_SESSIONS_TABLE).select().eq('id', id).maybeSingle();
  raise(error);
  if (expectedActorId && await requireUserId() !== expectedActorId) throw new Error('The signed-in account changed.');
  return data ? toSession(data as RcDrillSessionRow) : null;
}

export async function listSessions(): Promise<RcDrillSession[]> {
  const userId = await requireUserId();
  const { data, error } = await rcDb
    .from(RC_SESSIONS_TABLE)
    .select()
    // Admin read access includes student work; this list is the personal history.
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  raise(error);
  return ((data ?? []) as RcDrillSessionRow[]).map(toSession);
}

const clockWriteChains = new Map<string, Promise<void>>();

type RcDraftSave = { actorId: string; answers: RcDraftAnswer[] };

/** Draft snapshots share the clock queue so a heartbeat cannot overwrite them. */
export function saveSessionClock(id: string, elapsedSeconds: number, currentQuestionIndex?: number, drafts?: RcDraftSave): Promise<void> {
  const previous = clockWriteChains.get(id) ?? Promise.resolve();
  const write = previous.catch(() => undefined).then(() => writeSessionClock(id, elapsedSeconds, currentQuestionIndex, drafts));
  clockWriteChains.set(id, write);
  void write.finally(() => {
    if (clockWriteChains.get(id) === write) clockWriteChains.delete(id);
  }).catch(() => undefined);
  return write;
}

async function writeSessionClock(id: string, elapsedSeconds: number, currentQuestionIndex?: number, drafts?: RcDraftSave): Promise<void> {
  if (currentQuestionIndex !== undefined && (!Number.isSafeInteger(currentQuestionIndex) || currentQuestionIndex < 0)) {
    throw new Error('That question position could not be saved.');
  }
  const userId = await requireUserId();
  if (drafts && drafts.actorId !== userId) throw new Error('The signed-in account changed.');
  const session = await getSession(id);
  if (!session || session.userId !== userId || session.status !== 'in_progress') {
    throw new Error('The section is no longer available to save.');
  }
  await assertActivePracticeTestSession(id);
  const answers = drafts ? readRcDraftAnswers(drafts.answers) : undefined;
  if (drafts && (session.config.timedSectionSittingId || session.config.practiceTestRunId
    || !Array.isArray(drafts.answers) || answers.length !== drafts.answers.length)) {
    throw new Error('These reading drafts could not be saved.');
  }
  const seconds = Math.max(session.config.clockElapsedSeconds ?? 0, Math.floor(elapsedSeconds));
  const { data, error } = await rcDb
    .from(RC_SESSIONS_TABLE)
    .update({
      config: {
        ...session.config,
        ...(answers === undefined ? {} : { draftAnswers: answers }),
        clockElapsedSeconds: seconds,
        ...(currentQuestionIndex === undefined ? {} : { currentQuestionIndex }),
        lastActiveAt: new Date().toISOString(),
      },
    })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle();
  raise(error);
  if (!data) throw new Error('The section clock did not reach your account.');
}

export async function completeSession(id: string): Promise<void> {
  const userId = await requireUserId();
  const session = await getSession(id);
  if (!session || session.userId !== userId) throw new Error('This section is not available.');
  if (session.status === 'completed') return;
  if (session.status !== 'in_progress') throw new Error('This section cannot be completed.');
  await assertActivePracticeTestSession(id);
  const { data, error } = await rcDb
    .from(RC_SESSIONS_TABLE)
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle();
  raise(error);
  if (!data) {
    const latest = await getSession(id);
    if (latest?.userId === userId && latest.status === 'completed') return;
    throw new Error('The completed section did not reach your account.');
  }
}

/**
 * Discards an unfinished drill. The session is marked `abandoned`, never
 * deleted: its saved answers stay on the account and still count as exposure
 * (see getQuestionHistory); they just stop appearing under In progress.
 * Protected sections and finished drills cannot be discarded here.
 */
export async function abandonSession(id: string): Promise<void> {
  const userId = await requireUserId();
  const session = await getSession(id);
  if (!session || session.userId !== userId) throw new Error('This drill is not available.');
  if (session.config.practiceTestRunId || session.config.timedSectionSittingId) {
    throw new Error('A protected section cannot be discarded here.');
  }
  if (session.status === 'abandoned') return;
  if (session.status !== 'in_progress') throw new Error('Only a drill in progress can be discarded.');
  const { data, error } = await rcDb
    .from(RC_SESSIONS_TABLE)
    .update({ status: 'abandoned' })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle();
  raise(error);
  if (!data) {
    const latest = await getSession(id);
    if (latest?.userId === userId && latest.status === 'abandoned') return;
    throw new Error('The discard did not reach your account.');
  }
}

export async function setSessionExcluded(id: string, excluded: boolean): Promise<void> {
  const { error } = await rcDb
    .from(RC_SESSIONS_TABLE)
    .update({ excluded_from_analytics: excluded })
    .eq('id', id);
  raise(error);
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await rcDb.from(RC_SESSIONS_TABLE).delete().eq('id', id);
  raise(error);
}

/* ----------------------------------------------------------------- attempts */

/**
 * Writes one attempt row. The first write for a question within a session is the
 * first attempt; every later write for that same question, review re-answers
 * included, is a new row flagged `is_first_attempt: false`. Existing rows are
 * never updated, so the original answer stays intact.
 */
export async function recordAttempt(attempt: RcAttempt): Promise<RcAttempt> {
  const userId = attempt.userId ?? (await requireUserId());
  await assertActivePracticeTestSession(attempt.sessionId);

  const existingAttempt = async (): Promise<RcAttempt | null> => {
    if (!attempt.id) return null;
    const { data, error } = await rcDb.from(RC_ATTEMPTS_TABLE).select()
      .eq('id', attempt.id).eq('user_id', userId).maybeSingle();
    raise(error);
    if (!data) return null;
    const saved = toAttempt(data as RcAttemptRow);
    if (saved.sessionId !== attempt.sessionId || saved.questionId !== attempt.questionId
      || saved.passageId !== attempt.passageId || saved.selected !== attempt.selected) {
      throw new Error('The saved answer ID belongs to different work.');
    }
    return saved;
  };
  // The client keeps this UUID in its device backup. A successful insert whose
  // response was lost must be acknowledged as the same row on retry.
  const alreadySaved = await existingAttempt();
  if (alreadySaved) return alreadySaved;

  const { data: prior, error: priorError } = await rcDb
    .from(RC_ATTEMPTS_TABLE)
    .select('id')
    .eq('session_id', attempt.sessionId)
    .eq('question_id', attempt.questionId)
    .limit(1);
  raise(priorError);

  const isFirstAttempt = (prior ?? []).length === 0;

  const { data, error } = await rcDb
    .from(RC_ATTEMPTS_TABLE)
    .insert({
      ...(attempt.id ? { id: attempt.id } : {}),
      session_id: attempt.sessionId,
      user_id: userId,
      question_id: attempt.questionId,
      passage_id: attempt.passageId,
      selected: attempt.selected,
      is_correct: attempt.isCorrect,
      time_ms: attempt.timeMs,
      flagged: attempt.flagged,
      eliminations: attempt.eliminations,
      is_first_attempt: isFirstAttempt,
    })
    .select()
    .single();
  if (error?.code === '23505') {
    const saved = await existingAttempt();
    if (saved) return saved;
  }
  raise(error);
  return toAttempt(data as RcAttemptRow);
}

export async function getSessionAttempts(sessionId: string): Promise<RcAttempt[]> {
  const { data, error } = await rcDb
    .from(RC_ATTEMPTS_TABLE)
    .select()
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  raise(error);
  return ((data ?? []) as RcAttemptRow[]).map(toAttempt);
}

/** Sets the flag on every stored attempt for a question in a session. */
const aidWriteChains = new Map<string, Promise<void>>();

function serialAidWrite(key: string, write: () => Promise<void>): Promise<void> {
  const previous = aidWriteChains.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(write);
  aidWriteChains.set(key, next);
  void next.finally(() => { if (aidWriteChains.get(key) === next) aidWriteChains.delete(key); }).catch(() => undefined);
  return next;
}

export function setAttemptFlag(sessionId: string, questionId: number, flagged: boolean, expectedActorId?: string): Promise<void> {
  const queue = (actor: string) => serialAidWrite(`flag:${actor}:${sessionId}:${questionId}`, () => writeAttemptFlag(sessionId, questionId, flagged, actor));
  return expectedActorId ? queue(expectedActorId) : requireUserId().then(queue);
}

async function writeAttemptFlag(
  sessionId: string,
  questionId: number,
  flagged: boolean,
  expectedActorId?: string,
): Promise<void> {
  const userId = await requireUserId();
  if (expectedActorId && userId !== expectedActorId) throw new Error('The signed-in account changed.');
  const session = await getSession(sessionId, userId);
  if (!session || session.userId !== userId) throw new Error('This section is not available.');
  if ((session.config.practiceTestRunId || session.config.timedSectionSittingId) && session.status !== 'in_progress') throw new Error('Flags in this protected source section cannot be changed.');
  await assertActivePracticeTestSession(sessionId);
  if (await requireUserId() !== userId) throw new Error('The signed-in account changed.');
  const { data, error } = await rcDb
    .from(RC_ATTEMPTS_TABLE)
    .update({ flagged })
    .eq('session_id', sessionId)
    .eq('question_id', questionId)
    .eq('user_id', userId)
    .select('id, user_id, flagged');
  raise(error);
  if (await requireUserId() !== userId) throw new Error('The signed-in account changed.');
  if (!data?.length || data.some((row: { user_id: string; flagged: boolean }) => row.user_id !== userId || row.flagged !== flagged)) throw new Error('The flag save could not be acknowledged.');
}

const HISTORY_PAGE_SIZE = 1000;

interface RcHistorySessionRow {
  id: string;
  user_id?: string;
  status: RcSessionStatus | string;
  excluded_from_analytics: boolean;
}

interface RcHistoryAttemptRow {
  id?: string;
  user_id?: string;
  session_id?: string;
  question_id: number;
  passage_id?: number;
  selected?: RcLetter | string | null;
  is_correct: boolean | null;
  is_first_attempt?: boolean;
  created_at: string;
}

async function fetchHistoryPages<T>(
  readPage: (
    from: number,
    to: number,
  ) => Promise<{ data: T[] | null; error: { code?: string; message?: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += HISTORY_PAGE_SIZE) {
    const { data, error } = await readPage(offset, offset + HISTORY_PAGE_SIZE - 1);
    raise(error);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < HISTORY_PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Per-question aggregate over the student's whole history, used by the hub's
 * status filters and by adaptive selection.
 *
 * Uses a second paged query on `rc_drill_sessions` because the live schema has
 * two foreign keys between `rc_attempts` and `rc_drill_sessions`
 * (`rc_attempts_session_id_fkey` and `rc_attempts_session_owner_fk`), which
 * causes an unqualified PostgREST embed to fail with `PGRST201`.
 */
export async function getQuestionHistory(userId?: string): Promise<RcQuestionHistory> {
  const uid = userId ?? (await requireUserId());

  const [sessionRows, attemptRows] = await Promise.all([
    fetchHistoryPages<RcHistorySessionRow>(async (from, to) => {
      const result = await rcDb
        .from(RC_SESSIONS_TABLE)
        .select('id, user_id, status, excluded_from_analytics')
        .eq('user_id', uid)
        .order('started_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
      return result as {
        data: RcHistorySessionRow[] | null;
        error: { code?: string; message?: string } | null;
      };
    }),
    fetchHistoryPages<RcHistoryAttemptRow>(async (from, to) => {
      const result = await rcDb
        .from(RC_ATTEMPTS_TABLE)
        .select(
          'id, user_id, session_id, question_id, passage_id, selected, is_correct, is_first_attempt, created_at',
        )
        .eq('user_id', uid)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
      return result as {
        data: RcHistoryAttemptRow[] | null;
        error: { code?: string; message?: string } | null;
      };
    }),
  ]);

  const sessionsById = new Map<string, RcHistorySessionRow>();
  for (const session of sessionRows) {
    if (!session || typeof session.id !== 'string') continue;
    if (session.user_id && session.user_id !== uid) continue;
    sessionsById.set(session.id, session);
  }

  const seenAttemptIds = new Set<string>();
  const validAttemptRows: RcHistoryAttemptRow[] = [];
  for (const row of attemptRows) {
    if (!row || typeof row.question_id !== 'number') continue;
    if (row.user_id && row.user_id !== uid) continue;
    if (row.id) {
      if (seenAttemptIds.has(row.id)) continue;
      seenAttemptIds.add(row.id);
    }
    validAttemptRows.push(row);
  }

  validAttemptRows.sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });

  const history: RcQuestionHistory = new Map();
  for (const row of validAttemptRows) {
    const session = row.session_id ? sessionsById.get(row.session_id) : undefined;
    if (row.session_id && !session) continue;
    if (session?.excluded_from_analytics) continue;

    const sessionStatus = session?.status ?? 'completed';
    if (
      sessionStatus !== 'completed' &&
      sessionStatus !== 'in_progress' &&
      sessionStatus !== 'abandoned'
    ) {
      continue;
    }

    const existing: RcQuestionHistoryEntry = history.get(row.question_id) ?? {
      questionId: row.question_id,
      attempts: 0,
      everIncorrect: false,
      incorrectOnLastTake: false,
      incorrectCount: 0,
      lastSeenAt: null,
      answered: false,
      firstEverCorrect: null,
      firstTakeCorrect: null,
      unansweredOnFirstTake: false,
      everCorrect: false,
      lastFirstTakeIncorrect: false,
      reviewCorrected: false,
      completedAnswered: false,
      completedAnsweredSessionIds: [],
    };

    const isFirstTake = row.is_first_attempt !== false;
    const hasSelected = typeof row.selected === 'string' && row.selected.trim().length > 0;
    const hasGradedAnswer = hasSelected && typeof row.is_correct === 'boolean';

    if (sessionStatus === 'abandoned') {
      if (isFirstTake || existing.attempts === 0) {
        existing.attempts += 1;
      }
      if (isFirstTake || !existing.lastSeenAt) {
        existing.lastSeenAt = row.created_at;
      }
      history.set(row.question_id, existing);
      continue;
    }

    if (isFirstTake) {
      existing.attempts += 1;
      existing.lastSeenAt = row.created_at;

      if (!hasGradedAnswer) {
        if (!existing.answered) {
          existing.unansweredOnFirstTake = true;
          existing.firstEverCorrect = null;
          existing.firstTakeCorrect = null;
          existing.lastFirstTakeIncorrect = false;
          existing.incorrectOnLastTake = false;
          existing.reviewCorrected = false;
        }
      } else {
        const right = row.is_correct === true;
        const wrong = row.is_correct === false;
        existing.answered = true;
        existing.unansweredOnFirstTake = false;
        if (existing.firstEverCorrect === null) {
          existing.firstEverCorrect = right;
        }
        existing.firstTakeCorrect = right;
        existing.reviewCorrected = false;
        if (right) {
          existing.everCorrect = true;
        }
        if (wrong) {
          existing.everIncorrect = true;
          existing.incorrectCount += 1;
        }
        existing.lastFirstTakeIncorrect = wrong;
        existing.incorrectOnLastTake = wrong;

        if (sessionStatus === 'completed') {
          existing.completedAnswered = true;
          if (
            row.session_id &&
            !existing.completedAnsweredSessionIds!.includes(row.session_id)
          ) {
            existing.completedAnsweredSessionIds!.push(row.session_id);
          }
        }
      }
    } else {
      if (!existing.lastSeenAt) {
        existing.lastSeenAt = row.created_at;
      }
      if (hasGradedAnswer && existing.lastFirstTakeIncorrect) {
        existing.reviewCorrected = row.is_correct === true;
      }
    }

    history.set(row.question_id, existing);
  }
  return history;
}

/* -------------------------------------------------------------- annotations */

function sameHighlights(value: unknown, expected: RcHighlight[]): boolean {
  // JSONB can return object properties in a different order than the client.
  return Array.isArray(value) && value.length === expected.length && value.every((mark, index) => {
    const wanted = expected[index];
    return mark && mark.target === wanted.target && mark.start === wanted.start && mark.end === wanted.end
      && mark.color === wanted.color && (mark.kind ?? 'highlight') === (wanted.kind ?? 'highlight');
  });
}

export async function loadAnnotations(
  passageIds: number[],
  expectedActorId?: string,
): Promise<Map<number, RcHighlight[]>> {
  const result = new Map<number, RcHighlight[]>();
  if (passageIds.length === 0) return result;
  const userId = await requireUserId();
  if (expectedActorId && userId !== expectedActorId) throw new Error('The signed-in account changed.');

  const { data, error } = await rcDb
    .from(RC_ANNOTATIONS_TABLE)
    .select('user_id, passage_id, highlights')
    .eq('user_id', userId)
    .in('passage_id', passageIds);
  raise(error);
  if (await requireUserId() !== userId) throw new Error('The signed-in account changed.');

  for (const row of (data ?? []) as { user_id: string; passage_id: number; highlights: unknown }[]) {
    if (row.user_id !== userId || !passageIds.includes(row.passage_id)) continue;
    result.set(row.passage_id, (row.highlights ?? []) as RcHighlight[]);
  }
  return result;
}

export function saveAnnotationsNow(passageId: number, highlights: RcHighlight[], expectedActorId?: string): Promise<void> {
  const queue = (actor: string) => serialAidWrite(`annotation:${actor}:${passageId}`, () => writeAnnotations(passageId, highlights, actor));
  return expectedActorId ? queue(expectedActorId) : requireUserId().then(queue);
}

async function writeAnnotations(
  passageId: number,
  highlights: RcHighlight[],
  expectedActorId?: string,
): Promise<void> {
  const userId = await requireUserId();
  if (expectedActorId && userId !== expectedActorId) throw new Error('The signed-in account changed.');
  const { data, error } = await rcDb.from(RC_ANNOTATIONS_TABLE).upsert(
    {
      user_id: userId,
      passage_id: passageId,
      highlights,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,passage_id' },
  ).select('user_id, passage_id, highlights').single();
  raise(error);
  if (await requireUserId() !== userId) throw new Error('The signed-in account changed.');
  if (!data || data.user_id !== userId || data.passage_id !== passageId || !sameHighlights(data.highlights, highlights)) throw new Error('The passage marks save could not be acknowledged.');
}
