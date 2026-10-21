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

/** Fetches the student's full attempt history, oldest data included. */
export async function fetchDrillHistory(userId: string): Promise<DrillHistoryRow[]> {
  const rows: DrillHistoryRow[] = [];
  let from = 0;
  // Page through the whole history — a student with years of work should
  // still see every attempt, not the newest thousand.
  for (;;) {
    const { data, error } = await supabase
      .from('drill_history' as never)
      .select('*')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message ?? 'Could not load drill history');
    const batch = (data ?? []) as unknown as DrillHistoryRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
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
