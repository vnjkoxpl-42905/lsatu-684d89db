import { supabase } from '@/integrations/supabase/client';
import {
  adaptLrAttempts,
  adaptLrSections,
  adaptRcAttempts,
  completedPracticeTestIds,
  projectFirstAnswerProgress,
  type FirstAnswerProgress,
  type GradedQuestionAnswer,
  type LrAttemptSourceRow,
  type LrSectionSourceRow,
  type PracticeTestSourceRow,
  type ProgressCoverage,
  type ProgressWindow,
  type RcAttemptSourceRow,
  type RcSessionSourceRow,
} from '@/lib/firstAnswerProgress';
import { assertActiveStudentScope } from '@/lib/studentScopedWork';
import type { StudentSubjectScope } from '@/lib/studentSubjectScope';
import { resolveStudentAccountId } from '@/lib/studentAccountScope';

const PAGE_SIZE = 500;

async function allPages<T>(read: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await read(offset, offset + PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < PAGE_SIZE) return rows;
  }
}

const readLrAttempts = (studentId: string) => allPages<LrAttemptSourceRow>(async (from, to) => {
  const result = await supabase.from('attempts')
    .select('id,user_id,qid,qtype,mode,correct,selected_answer,timestamp_iso')
    .eq('user_id', studentId).order('id').range(from, to);
  return result as unknown as { data: LrAttemptSourceRow[] | null; error: { message: string } | null };
});

const readLrSections = (studentId: string) => allPages<LrSectionSourceRow>(async (from, to) => {
  const result = await supabase.from('section_history')
    .select('id,user_id,mode,completed_at,practice_test_run_id,questions_json')
    .eq('user_id', studentId).order('id').range(from, to);
  return result as unknown as { data: LrSectionSourceRow[] | null; error: { message: string } | null };
});

const readRcAttempts = (studentId: string) => allPages<RcAttemptSourceRow>(async (from, to) => {
  const result = await supabase.from('rc_attempts')
    .select('id,user_id,session_id,passage_id,question_id,selected,is_correct,created_at')
    .eq('user_id', studentId).order('id').range(from, to);
  return result as unknown as { data: RcAttemptSourceRow[] | null; error: { message: string } | null };
});

const readRcSessions = (studentId: string) => allPages<RcSessionSourceRow>(async (from, to) => {
  const result = await supabase.from('rc_drill_sessions')
    .select('id,user_id,status,completed_at,excluded_from_analytics,practice_test_run_id,timed_section_sitting_id')
    .eq('user_id', studentId).order('id').range(from, to);
  return result as unknown as { data: RcSessionSourceRow[] | null; error: { message: string } | null };
});

const readPracticeTests = (studentId: string) => allPages<PracticeTestSourceRow>(async (from, to) => {
  const result = await supabase.from('practice_test_runs')
    .select('id,user_id,status,completed_at')
    .eq('user_id', studentId).order('id').range(from, to);
  return result as unknown as { data: PracticeTestSourceRow[] | null; error: { message: string } | null };
});

const errorReason = (reason: unknown) => reason instanceof Error ? reason.message : 'Source read failed';

/**
 * Read one student's persisted sources under their own session or an admin's
 * selected-student scope. Failed sources are named in coverage, never counted
 * as a genuine zero. The student and selected-student views share this ledger.
 */
export async function loadFirstAnswerLedger(scope: StudentSubjectScope): Promise<{
  answers: GradedQuestionAnswer[];
  coverage: ProgressCoverage;
  ownerId: string;
}> {
  await assertActiveStudentScope(scope);
  const studentId = await resolveStudentAccountId(scope);
  const [lrAttemptsResult, lrSectionsResult, rcAttemptsResult, rcSessionsResult, runsResult] = await Promise.allSettled([
    readLrAttempts(studentId),
    readLrSections(studentId),
    readRcAttempts(studentId),
    readRcSessions(studentId),
    readPracticeTests(studentId),
  ]);

  const coverage: ProgressCoverage = {
    includedSources: [],
    missingSources: [],
    excludedRows: {},
    knownLimitations: [
      'Older section_history rows without user_id or per-question detail cannot be safely attributed to this student.',
      'Unknown LR attempt modes and answers without a saved date are excluded.',
      'Full PrepTest answers count only after the run is marked complete.',
    ],
  };
  const runs = runsResult.status === 'fulfilled' ? runsResult.value : [];
  if (runsResult.status === 'rejected') coverage.missingSources.push({ source: 'practice_test_runs', reason: errorReason(runsResult.reason) });
  const completedRuns = completedPracticeTestIds(runs, studentId);

  const lrAttempts = lrAttemptsResult.status === 'fulfilled' ? lrAttemptsResult.value : [];
  if (lrAttemptsResult.status === 'fulfilled') coverage.includedSources.push('lr_attempts');
  else coverage.missingSources.push({ source: 'lr_attempts', reason: errorReason(lrAttemptsResult.reason) });
  const lr = adaptLrAttempts(lrAttempts, studentId);
  coverage.excludedRows.lr_attempts = lrAttempts.length - lr.length;

  const sectionRows = lrSectionsResult.status === 'fulfilled' ? lrSectionsResult.value : [];
  if (lrSectionsResult.status === 'fulfilled') coverage.includedSources.push('lr_section_history');
  else coverage.missingSources.push({ source: 'lr_section_history', reason: errorReason(lrSectionsResult.reason) });
  const sections = adaptLrSections(sectionRows, studentId, completedRuns);
  coverage.excludedRows.lr_section_history_without_eligible_detail = sectionRows.filter((row) => {
    if (!row.completed_at || !Array.isArray(row.questions_json) || row.questions_json.length === 0) return true;
    return !!row.practice_test_run_id && !completedRuns.has(row.practice_test_run_id);
  }).length;

  const rcRows = rcAttemptsResult.status === 'fulfilled' ? rcAttemptsResult.value : [];
  const rcSessions = rcSessionsResult.status === 'fulfilled' ? rcSessionsResult.value : [];
  if (rcAttemptsResult.status === 'rejected') coverage.missingSources.push({ source: 'rc_attempts', reason: errorReason(rcAttemptsResult.reason) });
  if (rcSessionsResult.status === 'rejected') coverage.missingSources.push({ source: 'rc_sessions', reason: errorReason(rcSessionsResult.reason) });
  const rcReady = rcAttemptsResult.status === 'fulfilled' && rcSessionsResult.status === 'fulfilled';
  if (rcReady) coverage.includedSources.push('rc_attempts');
  const rc = rcReady ? adaptRcAttempts(rcRows, rcSessions, studentId, completedRuns) : [];
  coverage.excludedRows.rc_attempts = rcReady ? rcRows.length - rc.length : 0;

  await assertActiveStudentScope(scope);
  return { answers: [...lr, ...sections, ...rc], coverage, ownerId: studentId };
}

/** Direct one-off read. Mounted views should cache loadFirstAnswerLedger instead. */
export async function loadFirstAnswerProgress(
  scope: StudentSubjectScope,
  window: ProgressWindow,
  asOf = new Date().toISOString(),
): Promise<FirstAnswerProgress> {
  const ledger = await loadFirstAnswerLedger(scope);
  return projectFirstAnswerProgress({ ...ledger, window, asOf });
}
