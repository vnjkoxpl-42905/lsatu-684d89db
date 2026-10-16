/**
 * Per-pool status for the Intro to LR practice drills.
 *
 * Joins the two durable sources so every surface tells the student the same
 * story instead of looking untouched after real work:
 *   - module_progress.completed_drills → the set was finished (MC-PRC-*)
 *   - practice_sessions               → mid-set place and answers so far
 *
 * Completion wins over an in-progress row: a finished set reads "Completed"
 * even if a later re-run was abandoned halfway.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, ModuleProgress } from '@/bootcamps/main-conclusion/persistence/records';
import { progressIdFor } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { loadAllPracticeSessions } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import {
  MAIN_CONCLUSION_PRACTICE_POOLS,
  type PracticePool,
} from '@/bootcamps/main-conclusion/data/practiceDrillPools';

export type PracticeDrillState = 'not-started' | 'in-progress' | 'completed';

export interface PracticeDrillStatus {
  slug: string;
  state: PracticeDrillState;
  /** Questions answered so far (or the full count once completed). */
  answered: number;
  total: number;
  /** How many of the answered questions were right. */
  correct: number;
  /** Zero-based question the student stopped on; 0 when nothing is stored. */
  resumeIndex: number;
  /** Per-question outcome, in queue order, for the "already done" markers. */
  questionOutcomes: Array<'unanswered' | 'correct' | 'incorrect'>;
}

function emptyStatus(pool: PracticePool): PracticeDrillStatus {
  return {
    slug: pool.slug,
    state: 'not-started',
    answered: 0,
    total: pool.count,
    correct: 0,
    resumeIndex: 0,
    questionOutcomes: Array.from({ length: pool.count }, () => 'unanswered' as const),
  };
}

export function usePracticeDrillStatus(): {
  statuses: Record<string, PracticeDrillStatus>;
  loading: boolean;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, PracticeDrillStatus>>(() => {
    const seed: Record<string, PracticeDrillStatus> = {};
    for (const pool of Object.values(MAIN_CONCLUSION_PRACTICE_POOLS)) {
      seed[pool.slug] = emptyStatus(pool);
    }
    return seed;
  });
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const userId = user.id;

    (async () => {
      setLoading(true);
      let completedDrills = new Set<string>();
      try {
        const persist = getPersistence(userId);
        await persist.ready();
        const progress = await persist.get<ModuleProgress>(
          TABLES.module_progress,
          progressIdFor(userId),
        );
        completedDrills = new Set(progress?.completed_drills ?? []);
      } catch (e) {
        // A progress read failure must not blank the page; sessions alone still
        // give a useful in-progress picture.
        console.warn('[practice-status] module progress read failed', e);
      }

      const sessions = await loadAllPracticeSessions(userId);
      if (cancelled) return;

      const next: Record<string, PracticeDrillStatus> = {};
      for (const pool of Object.values(MAIN_CONCLUSION_PRACTICE_POOLS)) {
        const base = emptyStatus(pool);
        const session = sessions[pool.slug];
        const isComplete =
          completedDrills.has(pool.completionId) || session?.status === 'completed';

        if (session && session.question_queue.length > 0) {
          const byQid = new Map(session.attempts.map((a) => [a.qid, a]));
          base.questionOutcomes = session.question_queue.map((qid) => {
            const attempt = byQid.get(qid);
            if (!attempt) return 'unanswered' as const;
            return attempt.correct ? ('correct' as const) : ('incorrect' as const);
          });
          base.total = session.question_queue.length;
          base.answered = session.attempts.length;
          base.correct = session.attempts.filter((a) => a.correct).length;
          base.resumeIndex = Math.min(session.current_index, session.question_queue.length - 1);
        }

        if (isComplete) {
          base.state = 'completed';
          // A set finished before resume tracking existed has no session row;
          // don't claim a per-question breakdown we never recorded.
          if (!session) base.answered = base.total;
        } else if (base.answered > 0) {
          base.state = 'in-progress';
        }

        next[pool.slug] = base;
      }

      setStatuses(next);
      setLoading(false);
    })().catch((e) => {
      console.error('[practice-status] load failed', e);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, nonce]);

  return { statuses, loading, refresh };
}
