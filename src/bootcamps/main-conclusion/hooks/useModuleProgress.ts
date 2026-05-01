/**
 * Module progress hook — backs the LockedRoute / unlock cascade per §5.
 *
 * Bridged for LSAT U: keys persistence on `useAuth().user.id` (Supabase UUID).
 * Each LSAT U student gets their own bootcamp progress.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, ModuleProgress } from '@/bootcamps/main-conclusion/persistence/records';
import { now, newId } from '@/bootcamps/main-conclusion/lib/ids';
import { INITIAL_UNLOCKED_ROUTES, unlockNext, type ProgressShape } from '@/bootcamps/main-conclusion/lib/ordering';

// Per-user progress record id is deterministic on user.id so we always read+update
// the same row. (Uses crypto.subtle elsewhere; for the id stub here we accept newId
// fallback. Keep one stable progress row per user.)
function progressIdFor(userId: string): string {
  // Deterministic UUIDv5-like derivation: hash userId into a stable string.
  // Simple FNV-1a 32-bit; collision risk is acceptable since the progress row is
  // user-scoped (table key already partitions by user).
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padEnd(12, '0')}`;
}

export function useModuleProgress(_userId?: string): {
  progress: ModuleProgress | null;
  markRouteVisited: (routeId: string) => Promise<void>;
  markLessonComplete: (lessonId: string, routeId: string) => Promise<void>;
  markDrillComplete: (drillId: string) => Promise<void>;
} {
  const { user: authUser } = useAuth();
  const [progress, setProgress] = useState<ModuleProgress | null>(null);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    const userId = authUser.id;
    const progressId = progressIdFor(userId);
    (async () => {
      const persist = getPersistence(userId);
      let existing = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
      if (!existing) {
        existing = ModuleProgress.parse({
          id: progressId,
          user_id: userId,
          unlocked_modules: ['M1', 'M2', 'M3', 'M5', 'M6'],
          unlocked_routes: INITIAL_UNLOCKED_ROUTES,
          completed_lessons: [],
          completed_drills: [],
          completed_capstones: [],
          updated_at: now(),
        });
        await persist.set(TABLES.module_progress, progressId, existing);
      }
      if (!cancelled) setProgress(existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const markRouteVisited = useCallback(async (_routeId: string) => {
    // Reserved for analytics in Module 6.
  }, []);

  const markLessonComplete = useCallback(
    async (lessonId: string, routeId: string) => {
      if (!authUser) return;
      const userId = authUser.id;
      const progressId = progressIdFor(userId);
      const persist = getPersistence(userId);
      const current = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
      const base = current ?? progress;
      if (!base) return;
      const completed = base.completed_lessons.includes(lessonId)
        ? base.completed_lessons
        : [...base.completed_lessons, lessonId];
      const shape: ProgressShape = {
        unlocked_routes: base.unlocked_routes,
        completed_lessons: completed,
        completed_drills: base.completed_drills,
      };
      const additions = unlockNext(routeId, shape);
      const merged: ModuleProgress = {
        ...base,
        completed_lessons: completed,
        unlocked_routes: Array.from(new Set([...base.unlocked_routes, ...additions])),
        updated_at: now(),
      };
      await persist.set(TABLES.module_progress, progressId, merged);
      setProgress(merged);
    },
    [authUser, progress],
  );

  const markDrillComplete = useCallback(
    async (drillId: string) => {
      if (!authUser) return;
      const userId = authUser.id;
      const progressId = progressIdFor(userId);
      const persist = getPersistence(userId);
      const current = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
      const base = current ?? progress;
      if (!base) return;
      const completed = base.completed_drills.includes(drillId)
        ? base.completed_drills
        : [...base.completed_drills, drillId];
      const drillNumber = drillId.replace('MC-DRL-', '');
      const routeId = `/drills/${drillNumber}`;
      const shape: ProgressShape = {
        unlocked_routes: base.unlocked_routes,
        completed_lessons: base.completed_lessons,
        completed_drills: completed,
      };
      const additions = unlockNext(routeId, shape);
      const merged: ModuleProgress = {
        ...base,
        completed_drills: completed,
        unlocked_routes: Array.from(new Set([...base.unlocked_routes, ...additions])),
        updated_at: now(),
      };
      await persist.set(TABLES.module_progress, progressId, merged);
      setProgress(merged);
    },
    [authUser, progress],
  );

  // Suppress unused-newId warning (kept available for future writes).
  void newId;

  return { progress, markRouteVisited, markLessonComplete, markDrillComplete };
}
