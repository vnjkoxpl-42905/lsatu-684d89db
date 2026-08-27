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
  practiceTestPace,
  type PracticeTestLeg,
  type PracticeTestPaceId,
  type PracticeTestRun,
} from '@/lib/practiceTest';
import { RC_STANDARD_SECONDS_PER_PASSAGE } from '@/features/rc/lib/rcTypes';

export function practiceTestPath(runId: string): string {
  return `/testing/test/${runId}`;
}

function timerModeForPace(pace: PracticeTestPaceId): TimerMode {
  switch (pace) {
    case 'time-and-a-half':
      return '52.5';
    case 'double-time':
      return '70';
    case 'untimed':
      return 'unlimited';
    default:
      return '35';
  }
}

export interface LrLegLaunch {
  pathname: '/drill';
  state: {
    mode: 'full-section';
    config: FullSectionConfig;
    returnTo: string;
    practicingLabel: string;
  };
}

export function lrLegLaunch(run: PracticeTestRun, leg: PracticeTestLeg): LrLegLaunch {
  return {
    pathname: '/drill',
    state: {
      mode: 'full-section',
      config: {
        pt: run.pt,
        section: leg.section,
        timer: {
          mode: timerModeForPace(run.pace),
          isPaused: false,
          elapsedMs: 0,
          startedAt: Date.now(),
        },
      },
      returnTo: practiceTestPath(run.id),
      practicingLabel: `Practice Test ${run.pt}`,
    },
  };
}

/**
 * The RC leg's link. `reveal=end_of_set` because a section is sat under test
 * conditions — nothing is revealed until the sitting is over, and inside a
 * practice test that is doubly true.
 */
export function rcLegHref(run: PracticeTestRun, leg: PracticeTestLeg): string {
  const secondsPerPassage = (() => {
    const sectionSeconds = practiceTestPace(run.pace).sectionSeconds;
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
  });
  if (secondsPerPassage !== null && secondsPerPassage !== RC_STANDARD_SECONDS_PER_PASSAGE) {
    params.set('secondsPerPassage', String(secondsPerPassage));
  }
  return `/rc?${params.toString()}`;
}

export interface LegResult {
  correct: number;
  answered: number;
  timeMs: number;
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
): Promise<LegResult | null> {
  const { data, error } = await supabase
    .from('section_history')
    .select('initial_score, initial_total, total_questions, total_time_ms, time_taken_ms, completed_at')
    .eq('user_id', userId)
    .eq('pt', pt)
    .eq('section', section)
    .gte('completed_at', startedAtIso)
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
): Promise<LegResult | null> {
  const { data: sessions, error } = await supabase
    .from('rc_drill_sessions')
    .select('id, passage_ids, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', startedAtIso)
    .order('completed_at', { ascending: false })
    .limit(5);

  if (error || !sessions || sessions.length === 0) return null;

  const wanted = [...passageIds].sort((a, b) => a - b).join(',');
  const session = sessions.find(
    (s) => [...(s.passage_ids ?? [])].sort((a, b) => a - b).join(',') === wanted,
  );
  if (!session) return null;

  const { data: attempts } = await supabase
    .from('rc_attempts')
    .select('is_correct, time_ms')
    .eq('session_id', session.id)
    .eq('is_first_attempt', true);

  if (!attempts) return null;
  return {
    correct: attempts.filter((a) => a.is_correct).length,
    answered: attempts.length,
    timeMs: attempts.reduce((n, a) => n + (a.time_ms ?? 0), 0),
  };
}

export async function readLegResult(
  userId: string,
  run: PracticeTestRun,
  leg: PracticeTestLeg,
): Promise<LegResult | null> {
  if (!leg.startedAt) return null;
  return leg.kind === 'lr'
    ? readLrLegResult(userId, run.pt, leg.section, leg.startedAt)
    : readRcLegResult(userId, leg.passageIds ?? [], leg.startedAt);
}
