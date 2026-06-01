/**
 * Module ordering enforcement (per architecture-plan.md §5 + G2.DRL-3.4).
 *
 * Hard constraint: Drill 3.4 must complete before /simulator/* unlocks.
 * `ModuleProgress.unlocked_routes` is the source of truth — never derived ad-hoc.
 */

import type { DrillId, LessonId } from '@/bootcamps/main-conclusion/types/source-slots';

export type MilestoneId = `MC-MIL-${string}`;

export interface RouteRequirement {
  blocker: DrillId | LessonId | MilestoneId;
  hint: string;
}

export const ROUTE_REQUIREMENTS: Record<string, RouteRequirement> = {
  '/simulator': {
    blocker: 'MC-DRL-MIX',
    hint: 'Complete the Final Mixed Structure Check to unlock the Question Simulator.',
  },
  '/simulator/bank': {
    blocker: 'MC-DRL-MIX',
    hint: 'Complete the Final Mixed Structure Check to unlock the Question Simulator.',
  },
  '/simulator/trap-master': {
    blocker: 'MC-DRL-MIX',
    hint: 'Complete the Final Mixed Structure Check to unlock the Question Simulator.',
  },
  '/simulator/hard-mode': {
    blocker: 'MC-DRL-MIX',
    hint: 'Complete the Final Mixed Structure Check to unlock the Question Simulator.',
  },
};

/** Initial unlocks for a brand-new student.
 *  Preview mode: every lesson, drill, reference section, and module entry point is open
 *  so reviewers can walk the full bootcamp without completing the gate cascade.
 */
export const INITIAL_UNLOCKED_ROUTES: string[] = [
  '/',
  // M1 — every lesson
  '/lessons',
  ...Array.from({ length: 13 }, (_, i) => `/lessons/1.${i + 1}`),
  // M2 — every reference + named tool surface
  '/reference',
  '/reference/indicators',
  '/reference/2-part-check',
  '/reference/fabs',
  '/reference/stimulus-tendencies',
  '/reference/conclusion-types',
  '/reference/rebuttal-structure',
  '/reference/three-traps',
  '/reference/pronoun-library',
  '/reference/concession-decoder',
  '/reference/quick-card',
  '/reference/companion-mode',
  '/reference/named-tools',
  // M3 — every drill
  '/drills',
  ...Array.from({ length: 9 }, (_, i) => `/drills/3.${i + 1}`),
  // Preview/review mode includes simulator surfaces; persisted student unlocks
  // still come only from Drill 3.4 completion below.
  '/simulator',
  '/simulator/bank',
  '/simulator/trap-master',
  '/simulator/hard-mode',
  // M5 — Hard Sentences
  '/hard-sentences',
  '/hard-sentences/capstone',
  // M6 — Diagnostics
  '/diagnostics',
  '/diagnostics/philosophy',
  '/diagnostics/dashboard',
  '/diagnostics/recommendations',
  '/diagnostics/rr-review',
  '/diagnostics/trait-profile',
  '/diagnostics/mistake-profile',
  '/diagnostics/srs',
  // Cross-cutting
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
  // Drill 3.4 is the simulator gate.
  if (currentRouteId === '/drills/3.4') {
    additions.push('/simulator', '/simulator/bank', '/simulator/trap-master', '/simulator/hard-mode');
  }
  return additions;
}
