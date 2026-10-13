/**
 * Writes Flaw & Famous Flaws drill outcomes into localStorage.
 *
 * The bootcamp dashboard (Home.tsx) and the Mistake Journal both READ
 * `lsat_flaw_performance`, but nothing wrote it: FF drills run through the
 * shared /drill page and only persisted to the global attempts/WAJ flow. This
 * bridges that gap so completed FF drills actually populate the bootcamp's own
 * stats instead of leaving them permanently empty.
 *
 * Shape matches what Home.tsx / MistakeJournal.tsx expect:
 *   Record<flawLabel, { correct, attempts, totalTime, misses, title }>
 * where totalTime is cumulative seconds across attempts.
 */

import { mirroredSetItem } from '@/lib/cloudMirror';

const FLAW_PERFORMANCE_KEY = 'lsat_flaw_performance';

interface FlawPerformanceEntry {
  correct: number;
  attempts: number;
  totalTime: number;
  misses: number;
  title: string;
}

export interface FlawAttemptOutcome {
  correct: boolean;
  timeMs?: number;
}

export function recordFlawPerformance(
  flawLabel: string,
  outcomes: FlawAttemptOutcome[],
): void {
  if (!flawLabel || outcomes.length === 0) return;
  try {
    const raw = JSON.parse(localStorage.getItem(FLAW_PERFORMANCE_KEY) || '{}') as Record<
      string,
      Partial<FlawPerformanceEntry>
    >;
    const prev = raw[flawLabel] ?? {};
    const addAttempts = outcomes.length;
    const addCorrect = outcomes.filter((o) => o.correct).length;
    const addTime = outcomes.reduce((sum, o) => sum + Math.round((o.timeMs ?? 0) / 1000), 0);

    const next: FlawPerformanceEntry = {
      correct: (prev.correct ?? 0) + addCorrect,
      attempts: (prev.attempts ?? 0) + addAttempts,
      totalTime: (prev.totalTime ?? 0) + addTime,
      misses: (prev.misses ?? 0) + (addAttempts - addCorrect),
      title: flawLabel,
    };

    raw[flawLabel] = next;
    mirroredSetItem(FLAW_PERFORMANCE_KEY, JSON.stringify(raw));
  } catch (error) {
    console.error('Failed to record flaw bootcamp performance:', error);
  }
}
