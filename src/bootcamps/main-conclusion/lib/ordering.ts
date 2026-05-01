/**
 * Module ordering enforcement (per architecture-plan.md §5 + G2.DRL-3.4).
 *
 * Hard constraint: Drill 3.4 must complete before /simulator/* unlocks.
 * `ModuleProgress.unlocked_routes` is the source of truth — never derived ad-hoc.
 */

import type { DrillId, LessonId } from '@/bootcamps/main-conclusion/types/source-slots';

export interface RouteRequirement {
  blocker: DrillId | LessonId;
  hint: string;
}

export const ROUTE_REQUIREMENTS: Record<string, RouteRequirement> = {
  '/simulator': {
    blocker: 'MC-DRL-3.4',
    hint: 'Complete Drill 3.4 (Rebuttal vs First-Sentence Stage-Gate) to unlock the Question Simulator.',
  },
  '/simulator/bank': {
    blocker: 'MC-DRL-3.4',
    hint: 'Complete Drill 3.4 to unlock the Question Simulator.',
  },
  '/simulator/trap-master': {
    blocker: 'MC-DRL-3.4',
    hint: 'Complete Drill 3.4 to unlock the Question Simulator.',
  },
  '/simulator/hard-mode': {
    blocker: 'MC-DRL-3.4',
    hint: 'Complete Drill 3.4 to unlock the Question Simulator.',
  },
};

/** Initial unlocks for a brand-new student. */
export const INITIAL_UNLOCKED_ROUTES: string[] = [
  '/',
  '/lessons',
  '/lessons/1.1',
  '/reference',
  '/reference/indicators',
  '/reference/2-part-check',
  '/reference/fabs',
  '/reference/named-tools',
  '/reference/quick-card',
  '/drills',
  '/drills/3.1',
  '/diagnostics',
  '/diagnostics/philosophy',
  '/journal',
  '/settings',
];

export interface ProgressShape {
  unlocked_routes: string[];
  completed_lessons: string[];
  completed_drills: string[];
}

/** Returns new unlock-route additions for a just-completed surface. Pure. */
export function unlockNext(currentRouteId: string, _progress: ProgressShape): string[] {
  const additions: string[] = [];
  // Lesson cascade: completing lesson N unlocks N+1 (within M1).
  const lessonMatch = /^\/lessons\/1\.(\d+)$/.exec(currentRouteId);
  if (lessonMatch) {
    const next = Number(lessonMatch[1]) + 1;
    if (next <= 13) additions.push(`/lessons/1.${next}`);
  }
  // Drill 3.4 → unlocks Simulator.
  if (currentRouteId === '/drills/3.4') {
    additions.push('/simulator', '/simulator/bank', '/simulator/trap-master', '/simulator/hard-mode');
  }
  return additions;
}
