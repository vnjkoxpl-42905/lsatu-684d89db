/**
 * Handing one leg of a practice test to the runner that already exists, and
 * reading its result back.
 *
 * The sitting owns sequence, clock and scoring. It does NOT own answering —
 * that stays in `/drill` (LR) and `/rc` (RC), so a question inside a practice
 * test behaves identically to the same question outside one. The cost of that
 * choice is this file: the runners report to their own tables, and the sitting
 * has to go and find the row afterwards.
 *
 * A leg is matched by "this user, this section, finished after the moment the
 * leg began". That is why `startedAt` is stamped before navigating and never
 * after.
 */
import { supabase } from '@/integrations/supabase/client';
import type { FullSectionConfig, TimerMode } from '@/types/drill';
import {
  practiceTestRunSectionSeconds,
  type PracticeTestLeg,
  type PracticeTestRun,
} from '@/lib/practiceTest';
import { RC_STANDARD_SECONDS_PER_PASSAGE } from '@/features/rc/lib/rcTypes';

const PRACTICE_TEST_PATH_PREFIX = '/testing/test/';

export function practiceTestPath(runId: string): string {
  return `${PRACTICE_TEST_PATH_PREFIX}${runId}`;
}

/**
 * Whether a return path points back into a sitting.
 *
 * ROUTING ONLY: it decides where a runner navigates and whether score UI is
 * suppressed. It must never gate a clock or an integrity rule, because the path
 * it reads is student-editable. Anything load-bearing reads persisted run and
 * leg attribution instead.
 *
 * The prefix lives here, next to the function that writes it, so the two cannot
 * drift apart.
 */
export function isSittingReturn(path: string | null | undefined): boolean {
  return !!path?.startsWith(PRACTICE_TEST_PATH_PREFIX);
}

/**
 * The clock a leg runs on.
 *
 * This used to map the pace id straight onto an absolute TimerMode: 'standard'
 * became '35' no matter what the student's standing timing mode said, so a
 * student carrying extra time who chose "Standard" was handed a 35-minute
 * section for every leg of a two-hour sitting. The seconds are resolved against
 * their own clock when the run is created, and read back here, so the pace is
 * relative for everyone. 'custom' carries the exact figure, including the
 * fractional 52.5 and 78.75 minute cases, which the named modes cannot express.
 */
function timerForRun(run: PracticeTestRun): { mode: TimerMode; customMinutes?: number } {
  const seconds = practiceTestRunSectionSeconds(run);
  if (seconds === null) return { mode: 'unlimited' };
  return { mode: 'custom', customMinutes: seconds / 60 };
}

/**
 * Which run and which leg a runner was launched for.
 *
 * The runner needs this to key its closeout bookkeeping, and it cannot be
 * recovered from `returnTo`: that string is a routing hint, editable and
 * removable, and clock integrity must never depend on it. The leg INDEX is
 * passed rather than searched for, because `legs` can hold two legs of the same
 * section and matching by section number would pick the wrong one.
 */
export interface PtLegIdentity {
  runId: string;
  legIndex: number;
}

export interface LrLegLaunch {
  pathname: '/drill';
  state: {
    mode: 'full-section';
    config: FullSectionConfig;
    returnTo: string;
    practicingLabel: string;
    ptRun: PtLegIdentity;
  };
}

export function lrLegLaunch(
  run: PracticeTestRun,
  leg: PracticeTestLeg,
  legIndex: number,
): LrLegLaunch {
  return {
    pathname: '/drill',
    state: {
      mode: 'full-section',
      config: {
        pt: run.pt,
        section: leg.section,
        timer: {
          ...timerForRun(run),
          isPaused: false,
          elapsedMs: 0,
          startedAt: Date.now(),
        },
      },
      returnTo: practiceTestPath(run.id),
      practicingLabel: `Practice Test ${run.pt}`,
      ptRun: { runId: run.id, legIndex },
    },
  };
}

/**
 * The RC leg's link. `reveal=end_of_set` because a section is sat under test
 * conditions — nothing is revealed until the sitting is over, and inside a
 * practice test that is doubly true.
 */
export function rcLegHref(
  run: PracticeTestRun,
  leg: PracticeTestLeg,
  legIndex: number,
): string {
  const secondsPerPassage = (() => {
    // Same reading as the LR leg: the run's own resolved clock, so an
    // accommodated student's RC passages get their share of the longer section
    // rather than a share of 35 minutes.
    const sectionSeconds = practiceTestRunSectionSeconds(run);
    if (sectionSeconds === null) return null;
    const passages = leg.passageIds?.length || 4;
    return Math.round(sectionSeconds / passages);
  })();

  const params = new URLSearchParams({
    passages: (leg.passageIds ?? []).join(','),
    reveal: 'end_of_set',
    timing: secondsPerPassage === null ? 'untimed' : 'standard',
    start: '1',
    returnTo: practiceTestPath(run.id),
    ptRun: run.id,
    ptLeg: String(legIndex),
  });
  if (secondsPerPassage !== null && secondsPerPassage !== RC_STANDARD_SECONDS_PER_PASSAGE) {
    params.set('secondsPerPassage', String(secondsPerPassage));
  }
  return `/rc?${params.toString()}`;
}

/** Reopen the one RC session attached to this exam leg instead of inserting another. */
export async function findRcLegSession(
  userId: string,
  runId: string,
  legIndex: number,
): Promise<{ id: string; status: string } | null> {
  const { data, error } = await supabase.from('rc_drill_sessions')
    .select('id,status')
    .eq('user_id', userId)
    .eq('practice_test_run_id', runId)
    .eq('practice_test_leg', legIndex)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface LegResult {
  correct: number;
  answered: number;
  timeMs: number;
}

/** Submission persists blank rows for scoring; they are not answered questions. */
export function projectRcLegResult(
  attempts: Array<{ selected: string | null; is_correct: boolean; time_ms: number | null }>,
  clockElapsedSeconds?: unknown,
): LegResult {
  const answered = attempts.filter((attempt) => /^[A-E]$/.test(attempt.selected ?? ''));
  // The persisted session clock includes reading and unanswered questions.
  // Blank closeout rows may repeat the final question's time, so never sum them.
  const timeMs = typeof clockElapsedSeconds === 'number' && Number.isFinite(clockElapsedSeconds) && clockElapsedSeconds >= 0
    ? clockElapsedSeconds * 1000
    : answered.reduce((total, attempt) => total + (Number.isFinite(attempt.time_ms) ? Math.max(0, attempt.time_ms ?? 0) : 0), 0);
  return { correct: answered.filter((attempt) => attempt.is_correct).length, answered: answered.length, timeMs };
}

/**
 * Read one finished LR leg out of `section_history`.
 *
 * Returns null when no matching row exists yet, which is the normal answer for
 * a leg the student walked away from rather than completed. The caller decides
 * what to do about that; this never invents a zero, because a zero here reads
 * as "answered everything wrong" on the score report.
 */
export async function readLrLegResult(
  userId: string,
  pt: number,
  section: number,
  startedAtIso: string,
  identity?: PtLegIdentity,
): Promise<LegResult | null> {
  let query = supabase
    .from('section_history')
    .select('initial_score, initial_total, total_questions, total_time_ms, time_taken_ms, completed_at')
    .eq('user_id', userId)
    .eq('pt', pt)
    .eq('section', section);
  query = identity
    ? query.eq('practice_test_run_id', identity.runId).eq('practice_test_leg', identity.legIndex)
    : query.gte('completed_at', startedAtIso);
  const { data, error } = await query
    .order('completed_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    correct: row.initial_score ?? 0,
    answered: row.initial_total ?? row.total_questions ?? 0,
    timeMs: row.total_time_ms ?? row.time_taken_ms ?? 0,
  };
}

/**
 * Read one finished RC leg out of `rc_drill_sessions` + `rc_attempts`.
 *
 * Matched on the passage set rather than a section number: RC sessions record
 * which passages were sat, not which section they came from.
 */
export async function readRcLegResult(
  userId: string,
  passageIds: number[],
  startedAtIso: string,
  identity?: PtLegIdentity,
): Promise<LegResult | null> {
  let query = supabase
    .from('rc_drill_sessions')
    .select('id, passage_ids, completed_at, config')
    .eq('user_id', userId)
    .eq('status', 'completed');
  query = identity
    ? query.eq('practice_test_run_id', identity.runId).eq('practice_test_leg', identity.legIndex)
    : query.gte('completed_at', startedAtIso);
  const { data: sessions, error } = await query
    .order('completed_at', { ascending: false })
    .limit(5);

  if (error || !sessions || sessions.length === 0) return null;

  const wanted = [...passageIds].sort((a, b) => a - b).join(',');
  const session = sessions.find(
    (s) => [...(s.passage_ids ?? [])].sort((a, b) => a - b).join(',') === wanted,
  );
  if (!session) return null;

  const { data: attempts, error: attemptsError } = await supabase
    .from('rc_attempts')
    .select('selected, is_correct, time_ms')
    .eq('session_id', session.id)
    .eq('user_id', userId)
    .eq('is_first_attempt', true);

  if (attemptsError || !attempts) return null;
  const config = session.config as { clockElapsedSeconds?: unknown } | null;
  return projectRcLegResult(attempts, config?.clockElapsedSeconds);
}

export async function readLegResult(
  userId: string,
  run: PracticeTestRun,
  leg: PracticeTestLeg,
): Promise<LegResult | null> {
  if (!leg.startedAt) return null;
  // Account-backed runs require an exact leg link. Timestamp proximity could
  // score an unrelated section taken in another tab or on another device.
  const identity = run.revision === undefined
    ? undefined
    : { runId: run.id, legIndex: run.currentLeg };
  return leg.kind === 'lr'
    ? readLrLegResult(userId, run.pt, leg.section, leg.startedAt, identity)
    : readRcLegResult(userId, leg.passageIds ?? [], leg.startedAt, identity);
}
