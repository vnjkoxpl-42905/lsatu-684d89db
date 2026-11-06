/**
 * Standalone module-progress writer for Intro to LR practice sets.
 *
 * The shared /drill page (src/pages/Drill.tsx) runs the final practice sets but
 * lives outside the bootcamp's React tree, so it cannot use useModuleProgress.
 * This helper performs the same completed_drills append directly against the
 * shared persistence layer (bootcamp_kv), keyed on the same deterministic
 * progress-row id. No unlock cascade is run: practice sets are terminal path
 * actions and do not gate any route.
 *
 * Throws on persistence failure so the caller can surface a toast rather than
 * silently dropping completion (see the don't-swallow-errors policy).
 */

import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, ModuleProgress } from '@/bootcamps/main-conclusion/persistence/records';
import { now } from '@/bootcamps/main-conclusion/lib/ids';
import { INITIAL_UNLOCKED_ROUTES } from '@/bootcamps/main-conclusion/lib/ordering';
import { progressIdFor } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export async function recordPracticeDrillCompletion(
  userId: string,
  completionId: string,
): Promise<void> {
  if (!userId || !completionId) return;
  const progressId = progressIdFor(userId);
  const persist = getPersistence(userId);
  await persist.ready();

  const existing = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
  const base: ModuleProgress =
    existing ??
    ModuleProgress.parse({
      id: progressId,
      user_id: userId,
      unlocked_modules: ['M1', 'M2', 'M3', 'M5', 'M6'],
      unlocked_routes: INITIAL_UNLOCKED_ROUTES,
      completed_lessons: [],
      completed_drills: [],
      completed_milestones: [],
      completed_hard_sections: [],
      completed_capstones: [],
      updated_at: now(),
    });

  if (base.completed_drills.includes(completionId)) return;

  const merged: ModuleProgress = {
    ...base,
    completed_drills: [...base.completed_drills, completionId],
    updated_at: now(),
  };
  await persist.set(TABLES.module_progress, progressId, merged);
}
