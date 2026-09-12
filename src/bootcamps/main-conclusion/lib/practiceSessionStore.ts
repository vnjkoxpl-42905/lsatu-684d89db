/**
 * Practice-set resume store for the Intro to LR practice drills.
 *
 * A student who starts a practice set and leaves — closes the tab, clicks away
 * to a lesson, signs out, comes back tomorrow on another machine — must land
 * back on the question they stopped on, with every answer they already gave
 * still marked. React state and URL params cannot do that: both die with the
 * page. So each practice set keeps one durable row per user in the shared
 * bootcamp_kv persistence (the same layer module_progress uses), written on
 * every answer and on every question move.
 *
 * These are standalone functions rather than a hook because the drill runner
 * (src/pages/Drill.tsx) lives outside the bootcamp's React tree — the same
 * reason recordPracticeCompletion.ts exists.
 *
 * Failure policy: reads degrade to null (a missing resume row must never block
 * starting a drill). Writes throw so the caller can surface a toast rather than
 * silently losing a student's place.
 */

import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, PracticeSession, type PracticeSessionAttempt } from '@/bootcamps/main-conclusion/persistence/records';
import { now } from '@/bootcamps/main-conclusion/lib/ids';
import {
  MAIN_CONCLUSION_PRACTICE_POOLS,
  type PracticePool,
} from '@/bootcamps/main-conclusion/data/practiceDrillPools';

/**
 * Deterministic per-user, per-pool record id, so every read and write lands on
 * the same row without a lookup. Mirrors progressIdFor's FNV-1a approach but
 * hashes user + slug together.
 */
export function practiceSessionIdFor(userId: string, poolSlug: string): string {
  const input = `${userId}::${poolSlug}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let h2 = 0x811c9dc5;
  for (let i = input.length - 1; i >= 0; i--) {
    h2 ^= input.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex}${hex2.slice(0, 4)}`;
}

/**
 * One writer per row at a time.
 *
 * Both writers below read the row and then write it, with an await in between.
 * The drill runner fires a snapshot on every answer and a completion at the
 * end, and nothing stopped a snapshot that had already read the row from
 * writing it AFTER the completion had — which put a finished section back to
 * in_progress. Chaining each row's writes behind the previous one keeps them
 * in the order they were asked for. Writes to different rows still overlap.
 */
const rowChains = new Map<string, Promise<unknown>>();

async function withRow<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const previous = rowChains.get(id) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  rowChains.set(id, run.catch(() => undefined));
  try {
    return await run;
  } finally {
    if (rowChains.get(id) === run) rowChains.delete(id);
  }
}

export interface PracticeSessionSnapshot {
  questionQueue: string[];
  currentIndex: number;
  attempts: PracticeSessionAttempt[];
  /** Section clock already spent, for the surfaces that run one. */
  elapsedMs?: number;
  /** Answers that were already down when the clock ran out, if it did. */
  regulationAnsweredQids?: string[];
}

/**
 * Read the stored session for one pool. Returns null when there is nothing to
 * resume, when the row is corrupt, or when persistence is unavailable — all of
 * which mean "start fresh", never "block the student".
 */
export async function loadPracticeSession(
  userId: string,
  poolSlug: string,
): Promise<PracticeSession | null> {
  if (!userId || !poolSlug) return null;
  try {
    const persist = getPersistence(userId);
    // Wait for cloud hydration first, otherwise a cold load on a second device
    // reports "nothing to resume" while the row is still in flight.
    await persist.ready();
    const raw = await persist.get<unknown>(TABLES.practice_sessions, practiceSessionIdFor(userId, poolSlug));
    if (!raw) return null;
    const parsed = PracticeSession.safeParse(raw);
    if (!parsed.success) {
      console.warn('[practice-session] stored row failed validation, ignoring', {
        poolSlug,
        issues: parsed.error.issues,
      });
      return null;
    }
    return parsed.data;
  } catch (e) {
    console.warn('[practice-session] load failed, starting fresh', { poolSlug, error: e });
    return null;
  }
}

/** Read the stored session for every practice pool, for the index UI. */
export async function loadAllPracticeSessions(
  userId: string,
): Promise<Record<string, PracticeSession>> {
  const slugs = Object.keys(MAIN_CONCLUSION_PRACTICE_POOLS);
  const rows = await Promise.all(slugs.map((slug) => loadPracticeSession(userId, slug)));
  const out: Record<string, PracticeSession> = {};
  rows.forEach((row, i) => {
    if (row) out[slugs[i]] = row;
  });
  return out;
}

/**
 * Write the student's current place in a practice set. Called after every
 * answer and every question move, so it must stay cheap — the persistence layer
 * writes to the local cache synchronously and debounces the Supabase upsert.
 *
 * The row is always written as in_progress: this is the live run, and a
 * completed row under the same key means a previous run of the same pool that
 * this one is replacing. A caller that must not write over a finished run —
 * a homework assignment, whose row is that one sitting — stops calling before
 * it gets here (see genericFinalizedRef in Drill.tsx).
 */
export async function savePracticeSessionSnapshot(
  userId: string,
  pool: Pick<PracticePool, 'slug' | 'completionId'>,
  snapshot: PracticeSessionSnapshot,
): Promise<void> {
  if (!userId || !pool?.slug) return;
  if (snapshot.questionQueue.length === 0) return;

  const id = practiceSessionIdFor(userId, pool.slug);
  await withRow(id, async () => {
    const persist = getPersistence(userId);
    const existing = await loadPracticeSession(userId, pool.slug);

    const record = PracticeSession.parse({
      id,
      user_id: userId,
      pool_slug: pool.slug,
      completion_id: pool.completionId,
      question_queue: snapshot.questionQueue,
      current_index: Math.min(
        Math.max(snapshot.currentIndex, 0),
        Math.max(snapshot.questionQueue.length - 1, 0),
      ),
      attempts: snapshot.attempts,
      status: 'in_progress',
      // Never hand back time already spent: a snapshot with no clock keeps
      // whatever the row already knew rather than clearing it.
      elapsed_ms: snapshot.elapsedMs ?? existing?.elapsed_ms,
      regulation_answered_qids:
        snapshot.regulationAnsweredQids ?? existing?.regulation_answered_qids,
      started_at: existing?.started_at ?? now(),
      updated_at: now(),
    });

    await persist.set(TABLES.practice_sessions, id, record);
  });
}

/**
 * Mark the set finished. The row is kept rather than deleted so the index can
 * show what was answered and how it went after completion.
 */
export async function completePracticeSession(
  userId: string,
  pool: Pick<PracticePool, 'slug' | 'completionId'>,
  snapshot: PracticeSessionSnapshot,
): Promise<void> {
  if (!userId || !pool?.slug) return;

  const id = practiceSessionIdFor(userId, pool.slug);
  await withRow(id, async () => {
    const persist = getPersistence(userId);
    const existing = await loadPracticeSession(userId, pool.slug);

    const record = PracticeSession.parse({
      id,
      user_id: userId,
      pool_slug: pool.slug,
      completion_id: pool.completionId,
      question_queue: snapshot.questionQueue.length
        ? snapshot.questionQueue
        : existing?.question_queue ?? [],
      current_index: Math.max(snapshot.questionQueue.length - 1, 0),
      attempts: snapshot.attempts.length ? snapshot.attempts : existing?.attempts ?? [],
      status: 'completed',
      elapsed_ms: snapshot.elapsedMs ?? existing?.elapsed_ms,
      regulation_answered_qids:
        snapshot.regulationAnsweredQids ?? existing?.regulation_answered_qids,
      started_at: existing?.started_at ?? now(),
      updated_at: now(),
    });

    await persist.set(TABLES.practice_sessions, id, record);
  });
}

/** Clear the row so a re-run of a finished set starts from question 1. */
export async function resetPracticeSession(userId: string, poolSlug: string): Promise<void> {
  if (!userId || !poolSlug) return;
  const persist = getPersistence(userId);
  await persist.remove(TABLES.practice_sessions, practiceSessionIdFor(userId, poolSlug));
}
