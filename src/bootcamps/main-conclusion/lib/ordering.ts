/**
 * Module ordering enforcement (per architecture-plan.md §5).
 *
 * `ModuleProgress.unlocked_routes` is the source of truth — never derived ad-hoc.
 */

import type { DrillId, LessonId } from '@/bootcamps/main-conclusion/types/source-slots';

export type MilestoneId = `MC-MIL-${string}`;

export interface RouteRequirement {
  blocker: DrillId | LessonId | MilestoneId;
  hint: string;
}

const SIMULATOR_UNLOCK_ROUTES = [
  '/simulator',
  '/simulator/bank',
  '/simulator/trap-master',
  '/simulator/answer-key-views',
  '/simulator/hard-mode',
];

export const ROUTE_REQUIREMENTS: Record<string, RouteRequirement> = Object.fromEntries(
  SIMULATOR_UNLOCK_ROUTES.map((route) => [
    route,
    {
      blocker: 'MC-DRL-CT' as DrillId,
      hint: 'Complete the three Intro to LR drill labs before moving into Simulator practice.',
    },
  ]),
);

/** Initial unlocks for a brand-new student.
 *  Keep teaching and drill prep open, but hold the Simulator until the live
 *  three-drill path is complete.
 */
export const INITIAL_UNLOCKED_ROUTES: string[] = [
  '/',
  // M1 — every lesson
  '/lessons',
  ...Array.from({ length: 12 }, (_, i) => `/lessons/1.${i + 1}`),
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
  '/drills/main-conclusion-lab',
  '/drills/first-sentence-vs-rebuttal-lab',
  '/drills/conclusion-type-lab',
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
    if (next <= 12) additions.push(`/lessons/1.${next}`);
  }
  if (currentRouteId === '/drills/conclusion-type-lab') {
    additions.push(...SIMULATOR_UNLOCK_ROUTES);
  }
  return additions;
}
