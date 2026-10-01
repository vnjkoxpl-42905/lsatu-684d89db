/**
 * Unified drill history — reads `public.drill_history`, the security-invoker
 * view that unions every per-question attempt source on the platform:
 *
 *   lr         → attempts (Smart Drill, type drills, guided drills, sections)
 *   intro-lr   → intro_lr_attempts (Main Conclusion bootcamp)
 *   rc         → rc_attempts (Reading Comprehension)
 *   abstract   → abstract_drill_attempts (Abstract Reasoning)
 *   causation  → cs_attempts (Causation Station)
 *
 * The view is not in the generated Supabase types yet, so rows are cast at
 * the call site — the established pattern in this repo for objects ahead of
 * a types regeneration.
 */

import { nativeLabQuestion } from '@/components/review/nativeLabReviewSource';
import type { NativeLabKind } from '@/bootcamps/main-conclusion/lib/nativeLabAttempt';
import { supabase } from '@/integrations/supabase/client';

export type DrillHistorySource = 'lr' | 'intro-lr' | 'rc' | 'abstract' | 'causation';

export const SOURCE_LABELS: Record<DrillHistorySource, string> = {
  lr: 'Drills',
  'intro-lr': 'Intro to LR',
  rc: 'Reading',
  abstract: 'Abstract',
  causation: 'Causation Station',
};

export interface DrillHistoryRow {
  user_id: string;
  source: DrillHistorySource;
  question_key: string;
  question_ref: string;
  detail: string | null;
  correct: boolean | null;
  time_ms: number | null;
  selected_answer: string | null;
  mode: string | null;
  attempted_at: string;
}

export interface QuestionRollup {
  source: DrillHistorySource;
  questionKey: string;
  questionRef: string;
  detail: string | null;
  attempts: number;
  gradedAttempts: number;
  correctCount: number;
  /** null when every attempt is ungraded (free-response work). */
  accuracy: number | null;
  avgTimeMs: number | null;
  totalTimeMs: number;
  lastCorrect: boolean | null;
  lastAttemptedAt: string;
}

const PAGE_SIZE = 1000;

async function requireHistoryOwner(userId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error('The signed-in account changed. Reload history.');
}

async function readHistoryPages<T>(userId: string, query: (from: number) => PromiseLike<{ data: unknown; error: { message?: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    await requireHistoryOwner(userId);
    const { data, error } = await query(from);
    if (error) throw new Error(error.message ?? 'Could not load saved history');
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  await requireHistoryOwner(userId);
  return rows;
}

export async function filterCompletedHistorySections<T extends { practiceTestRunId: string | null }>(userId: string, sections: T[]): Promise<T[]> {
  await requireHistoryOwner(userId);
  if (!sections.some((s) => s.practiceTestRunId)) return sections;
  const runs = await readHistoryPages<{ id: string; user_id: string; status: string; completed_at: string | null }>(userId, (from) => supabase
    .from('practice_test_runs').select('id,user_id,status,completed_at').eq('user_id', userId)
    .eq('status', 'completed').order('id').range(from, from + PAGE_SIZE - 1));
  const completed = new Set(runs.filter((r) => r.user_id === userId && r.status === 'completed' && r.completed_at).map((r) => r.id));
  return sections.filter((s) => !s.practiceTestRunId || completed.has(s.practiceTestRunId));
}

export function readableHistoryRow(row: DrillHistoryRow): DrillHistoryRow {
  if (row.mode !== 'native_lab_v1') return row;
  const match = /^native-lab:(main-conclusion|structure|conclusion-type):([0-9a-f-]+)$/i.exec(row.detail ?? '');
  if (!match) return row;
  try {
    const saved = JSON.parse(row.selected_answer ?? 'null');
    const question = nativeLabQuestion(match[1] as NativeLabKind, row.question_ref);
    if (!question || saved?.run_id !== match[2] || typeof saved.answer !== 'string') return row;
    const answer = match[1] === 'main-conclusion' ? question.options[Number(saved.answer)] : question.options.includes(saved.answer) ? saved.answer : null;
    if (!answer) return row;
    return { ...row, question_key: `native-lab:${match[1]}:${row.question_ref}`, detail: question.title, selected_answer: answer, mode: 'Saved lab answer' };
  } catch { return row; }
}

/** RC grading stays withheld until its exact saved session and PrepTest parent complete. */
export async function fetchDrillHistory(userId: string): Promise<DrillHistoryRow[]> {
  const rows = await readHistoryPages<DrillHistoryRow>(userId, (from) => supabase
    .from('drill_history' as never).select('*').eq('user_id', userId).neq('source', 'rc').neq('source', 'lr')
    .order('attempted_at', { ascending: false }).range(from, from + PAGE_SIZE - 1));
  type Run = { id: string; user_id: string; status: string; completed_at: string | null };
  const runs = await readHistoryPages<Run>(userId, (from) => supabase
    .from('practice_test_runs').select('id,user_id,status,completed_at').eq('user_id', userId)
    .eq('status', 'completed').order('id').range(from, from + PAGE_SIZE - 1));
  const completedParents = new Set(runs.filter((r) => r.user_id === userId && r.status === 'completed' && !!r.completed_at).map((r) => r.id));
  const sittings = await readHistoryPages<{ id: string; owner_id: string; phase: string }>(userId, (from) => supabase
    .from('timed_section_sittings_v1' as never).select('id,owner_id,phase').eq('owner_id', userId)
    .eq('phase', 'complete').order('id').range(from, from + PAGE_SIZE - 1));
  const completedSittings = new Set(sittings.filter((r) => r.owner_id === userId && r.phase === 'complete').map((r) => r.id));
  type LrAttempt = { user_id: string | null; class_id: string; qid: string; pt: number; section: number; qnum: number; qtype: string; correct: boolean | null; time_ms: number | null; selected_answer: string | null; mode: string; timestamp_iso: string; timed_pt_run_id: string | null; timed_section_sitting_id: string | null };
  const lr = await readHistoryPages<LrAttempt>(userId, (from) => supabase.from('attempts')
    .select('user_id,class_id,qid,pt,section,qnum,qtype,correct,time_ms,selected_answer,mode,timestamp_iso,timed_pt_run_id,timed_section_sitting_id')
    .or(`user_id.eq.${userId},and(user_id.is.null,class_id.eq.${userId})`)
    .order('timestamp_iso', { ascending: false }).range(from, from + PAGE_SIZE - 1));
  for (const a of lr) {
    if ((a.user_id ?? a.class_id) !== userId || (a.timed_pt_run_id && !completedParents.has(a.timed_pt_run_id)) ||
        (a.timed_section_sitting_id && !completedSittings.has(a.timed_section_sitting_id))) continue;
    rows.push({ user_id: userId, source: 'lr', question_key: a.qid, question_ref: `PT${a.pt} / S${a.section} / Q${a.qnum}`,
      detail: a.qtype, correct: a.correct, time_ms: a.time_ms, selected_answer: a.selected_answer, mode: a.mode, attempted_at: a.timestamp_iso });
  }
  type Session = { id: string; user_id: string; status: string; completed_at: string | null; practice_test_run_id: string | null; config: { practiceTestRunId?: string } | null };
  const sessions = await readHistoryPages<Session>(userId, (from) => supabase
    .from('rc_drill_sessions').select('id,user_id,status,completed_at,practice_test_run_id,config')
    .eq('user_id', userId).eq('status', 'completed').order('id').range(from, from + PAGE_SIZE - 1));
  const completed = sessions.filter((s) => s.user_id === userId && s.status === 'completed' && !!s.completed_at);
  const parent = (s: Session) => s.practice_test_run_id ?? s.config?.practiceTestRunId;
  const eligible = completed.filter((s) => !parent(s) || completedParents.has(parent(s)!)).map((s) => s.id);
  type Attempt = { user_id: string; session_id: string; question_id: string | number; passage_id: string | number; is_correct: boolean | null; time_ms: number | null; selected: string | null; is_first_attempt: boolean; created_at: string };
  for (let offset = 0; offset < eligible.length; offset += 100) {
    const ids = eligible.slice(offset, offset + 100);
    const attempts = await readHistoryPages<Attempt>(userId, (from) => supabase
      .from('rc_attempts').select('user_id,session_id,question_id,passage_id,is_correct,time_ms,selected,is_first_attempt,created_at')
      .eq('user_id', userId).in('session_id', ids).order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1));
    for (const attempt of attempts) {
      if (attempt.user_id !== userId || !ids.includes(attempt.session_id) || attempt.selected == null) continue;
      rows.push({ user_id: userId, source: 'rc', question_key: `rc::${attempt.question_id}`,
        question_ref: `Passage ${attempt.passage_id} / Q${attempt.question_id}`, detail: null,
        correct: attempt.is_correct, time_ms: attempt.time_ms, selected_answer: attempt.selected,
        mode: attempt.is_first_attempt ? 'first' : 'review', attempted_at: attempt.created_at });
    }
  }
  await requireHistoryOwner(userId);
  return rows.filter((r) => r.user_id === userId).map(readableHistoryRow).sort((a, b) => b.attempted_at.localeCompare(a.attempted_at));
}

/** Per-question rollup over a set of history rows (already filtered). */
export function rollupByQuestion(rows: DrillHistoryRow[]): QuestionRollup[] {
  const byKey = new Map<string, QuestionRollup & { _timeCount: number }>();
  for (const row of rows) {
    const key = `${row.source}|${row.question_key}`;
    let agg = byKey.get(key);
    if (!agg) {
      agg = {
        source: row.source,
        questionKey: row.question_key,
        questionRef: row.question_ref,
        detail: row.detail,
        attempts: 0,
        gradedAttempts: 0,
        correctCount: 0,
        accuracy: null,
        avgTimeMs: null,
        totalTimeMs: 0,
        lastCorrect: null,
        lastAttemptedAt: row.attempted_at,
        _timeCount: 0,
      };
      byKey.set(key, agg);
    }
    agg.attempts += 1;
    if (row.correct !== null) {
      agg.gradedAttempts += 1;
      if (row.correct) agg.correctCount += 1;
    }
    if (row.time_ms != null) {
      agg.totalTimeMs += row.time_ms;
      agg._timeCount += 1;
    }
    // rows arrive newest-first from fetchDrillHistory, so the first row seen
    // for a question is its latest take.
    if (agg.attempts === 1 || row.attempted_at > agg.lastAttemptedAt) {
      agg.lastAttemptedAt = row.attempted_at;
      agg.lastCorrect = row.correct;
    }
  }
  const result: QuestionRollup[] = [];
  for (const agg of byKey.values()) {
    agg.accuracy = agg.gradedAttempts > 0 ? agg.correctCount / agg.gradedAttempts : null;
    agg.avgTimeMs = agg._timeCount > 0 ? Math.round(agg.totalTimeMs / agg._timeCount) : null;
    const { _timeCount, ...rest } = agg;
    void _timeCount;
    result.push(rest);
  }
  result.sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));
  return result;
}

/**
 * Attempt number of each row within its question's history (1 = first ever).
 * Input must be the full fetched set; rows can be in any order.
 */
export function attemptNumbers(rows: DrillHistoryRow[]): Map<DrillHistoryRow, number> {
  const byKey = new Map<string, DrillHistoryRow[]>();
  for (const row of rows) {
    const key = `${row.source}|${row.question_key}`;
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }
  const numbers = new Map<DrillHistoryRow, number>();
  for (const list of byKey.values()) {
    list.sort((a, b) => a.attempted_at.localeCompare(b.attempted_at));
    list.forEach((row, i) => numbers.set(row, i + 1));
  }
  return numbers;
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, '0')}`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours}h ${restMinutes}m`;
}
