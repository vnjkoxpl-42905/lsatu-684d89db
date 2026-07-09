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

const DRILL_ROUTE_ALIASES: Record<string, string> = {
  'MC-DRL-MCL': '/drills/main-conclusion-lab',
  'MC-DRL-CLS': '/drills/first-sentence-vs-rebuttal-lab',
  'MC-DRL-CT': '/drills/conclusion-type-lab',
};

// Per-user progress record id is deterministic on user.id so we always read+update
// the same row. (Uses crypto.subtle elsewhere; for the id stub here we accept newId
// fallback. Keep one stable progress row per user.)
export function progressIdFor(userId: string): string {
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
  markMilestoneComplete: (milestoneId: string) => Promise<void>;
  markHardSectionComplete: (sectionId: string) => Promise<void>;
  markCapstoneComplete: (capstoneId: 'M1.13' | 'M5.8') => Promise<void>;
} {
  const { user: authUser } = useAuth();
  const [progress, setProgress] = useState<ModuleProgress | null>(null);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    const userId = authUser.id;
    const progressId = progressIdFor(userId);
    (async () => {
      try {
        const persist = getPersistence(userId);
        // Wait for cloud hydration before treating the row as missing, otherwise a
        // cold cross-device load fabricates a default row and clobbers real progress.
        await persist.ready();
        if (cancelled) return;
        let existing = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
        if (!existing) {
          existing = ModuleProgress.parse({
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
          await persist.set(TABLES.module_progress, progressId, existing);
        }
        if (!cancelled) setProgress(existing);
      } catch (e) {
        console.error('[useModuleProgress] initial load failed', {
          userId,
          error: e,
        });
        throw e;
      }
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
      if (!authUser) {
        throw new Error('markLessonComplete called with no authenticated user');
      }
      const userId = authUser.id;
      const progressId = progressIdFor(userId);
      const persist = getPersistence(userId);
      try {
        const current = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
        const base = current ?? progress;
        if (!base) {
          throw new Error('markLessonComplete: progress not yet loaded');
        }
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
      } catch (e) {
        console.error('[useModuleProgress] markLessonComplete failed', {
          userId,
          lessonId,
          routeId,
          error: e,
        });
        throw e;
      }
    },
    [authUser, progress],
  );

  const markDrillComplete = useCallback(
    async (drillId: string) => {
      if (!authUser) {
        throw new Error('markDrillComplete called with no authenticated user');
      }
      const userId = authUser.id;
      const progressId = progressIdFor(userId);
      const persist = getPersistence(userId);
      try {
        const current = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
        const base = current ?? progress;
        if (!base) {
          throw new Error('markDrillComplete: progress not yet loaded');
        }
        const completed = base.completed_drills.includes(drillId)
          ? base.completed_drills
          : [...base.completed_drills, drillId];
        const routeId = DRILL_ROUTE_ALIASES[drillId] ?? `/drills/${drillId.replace('MC-DRL-', '')}`;
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
      } catch (e) {
        console.error('[useModuleProgress] markDrillComplete failed', {
          userId,
          drillId,
          error: e,
        });
        throw e;
      }
    },
    [authUser, progress],
  );

  const markMilestoneComplete = useCallback(
    async (milestoneId: string) => {
      if (!authUser) {
        throw new Error('markMilestoneComplete called with no authenticated user');
      }
      const userId = authUser.id;
      const progressId = progressIdFor(userId);
      const persist = getPersistence(userId);
      try {
        const current = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
        const base = current ?? progress;
        if (!base) {
          throw new Error('markMilestoneComplete: progress not yet loaded');
        }
        const completed = base.completed_milestones.includes(milestoneId)
          ? base.completed_milestones
          : [...base.completed_milestones, milestoneId];
        const shape: ProgressShape = {
          unlocked_routes: base.unlocked_routes,
          completed_lessons: base.completed_lessons,
          completed_drills: base.completed_drills,
        };
        // Check if milestone unlocks any routes. 
        // We'll update the logic in unlockNext to handle milestones.
        const additions = unlockNext(milestoneId, shape);
        const merged: ModuleProgress = {
          ...base,
          completed_milestones: completed,
          unlocked_routes: Array.from(new Set([...base.unlocked_routes, ...additions])),
          updated_at: now(),
        };
        await persist.set(TABLES.module_progress, progressId, merged);
        setProgress(merged);
      } catch (e) {
        console.error('[useModuleProgress] markMilestoneComplete failed', {
          userId,
          milestoneId,
          error: e,
        });
        throw e;
      }
    },
    [authUser, progress],
  );

  const markHardSectionComplete = useCallback(
    async (sectionId: string) => {
      if (!authUser) {
        throw new Error('markHardSectionComplete called with no authenticated user');
      }
      const userId = authUser.id;
      const progressId = progressIdFor(userId);
      const persist = getPersistence(userId);
      try {
        const current = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
        const base = current ?? progress;
        if (!base) {
          throw new Error('markHardSectionComplete: progress not yet loaded');
        }
        // Older persisted rows predate this field.
        const existing = base.completed_hard_sections ?? [];
        if (existing.includes(sectionId)) return;
        const merged: ModuleProgress = {
          ...base,
          completed_hard_sections: [...existing, sectionId],
          updated_at: now(),
        };
        await persist.set(TABLES.module_progress, progressId, merged);
        setProgress(merged);
      } catch (e) {
        console.error('[useModuleProgress] markHardSectionComplete failed', {
          userId,
          sectionId,
          error: e,
        });
        throw e;
      }
    },
    [authUser, progress],
  );

  const markCapstoneComplete = useCallback(
    async (capstoneId: 'M1.13' | 'M5.8') => {
      if (!authUser) {
        throw new Error('markCapstoneComplete called with no authenticated user');
      }
      const userId = authUser.id;
      const progressId = progressIdFor(userId);
      const persist = getPersistence(userId);
      try {
        const current = await persist.get<ModuleProgress>(TABLES.module_progress, progressId);
        const base = current ?? progress;
        if (!base) {
          throw new Error('markCapstoneComplete: progress not yet loaded');
        }
        const existing = base.completed_capstones ?? [];
        if (existing.includes(capstoneId)) return;
        const merged: ModuleProgress = {
          ...base,
          completed_capstones: [...existing, capstoneId],
          updated_at: now(),
        };
        await persist.set(TABLES.module_progress, progressId, merged);
        setProgress(merged);
      } catch (e) {
        console.error('[useModuleProgress] markCapstoneComplete failed', {
          userId,
          capstoneId,
          error: e,
        });
        throw e;
      }
    },
    [authUser, progress],
  );

  // Suppress unused-newId warning (kept available for future writes).
  void newId;

  return {
    progress,
    markRouteVisited,
    markLessonComplete,
    markDrillComplete,
    markMilestoneComplete,
    markHardSectionComplete,
    markCapstoneComplete,
  };
}
