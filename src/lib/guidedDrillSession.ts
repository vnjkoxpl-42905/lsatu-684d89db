/**
 * Resume state for guided drills.
 *
 * A student who starts an assigned guided drill and leaves — taps back, closes
 * the tab, comes back after dinner — must land on the question they stopped on,
 * with the SAME questions and every answer they already gave still marked.
 * Neither React state nor URL params can do that: both die with the page, and
 * re-entering from the Classroom re-runs the level draw, which reshuffles the
 * pool and hands the student a different set of questions. That is the bug this
 * module exists to close.
 *
 * It is a thin adapter, not a second mechanism. The Intro to LR practice sets
 * already solved exactly this problem (see practiceSessionStore), and that store
 * gives us local-first writes, a debounced `bootcamp_kv` cloud upsert, zod
 * validation, and cross-device hydration. Guided drills ride the same rows,
 * namespaced by key so the two can never collide:
 *
 *     practice set   →  pool_slug "mc-practice-1"
 *     assigned drill →  pool_slug "guided::<assignmentId>"
 *     direct drill   →  pool_slug "guided::drill:<drillId>"
 *
 * The `pool_slug`/`completion_id` field names come from that store's schema and
 * are reused as-is rather than forked; read them as "which drill" and "what it
 * completes", not as bootcamp-only concepts.
 *
 * Failure policy, inherited: reads degrade to null (a missing resume row must
 * never block starting a drill), writes surface to the caller.
 */

import {
  loadPracticeSession,
  savePracticeSessionSnapshot,
  completePracticeSession,
  resetPracticeSession,
  type PracticeSessionSnapshot,
} from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import type { PracticeSession, PracticeSessionAttempt } from '@/bootcamps/main-conclusion/persistence/records';
import type { DrillSession } from '@/types/drill';

export const GUIDED_SESSION_PREFIX = 'guided::';

/** Stable identity for one question in one sitting, including closeout retries. */
export async function guidedAttemptId(runId: string, qid: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${runId}:${qid}`)));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export type GuidedDrillSession = PracticeSession;
export type GuidedDrillSnapshot = PracticeSessionSnapshot;

/** A migrated singleton can remain in progress if its cleanup write failed. */
export function isLegacyGuidedSessionSuperseded(
  legacy: GuidedDrillSession | null,
  completed: GuidedDrillSession[],
): boolean {
  if (!legacy || legacy.status !== 'in_progress') return false;
  return completed.some((run) =>
    run.status === 'completed' &&
    run.question_queue.join('|') === legacy.question_queue.join('|') &&
    legacy.attempts.every((old) => run.attempts.some((attempt) =>
      attempt.qid === old.qid && attempt.selected_answer === old.selected_answer,
    )),
  );
}

/**
 * Key one guided drill's resume row. The assignment id is preferred: it is what
 * makes the row per-student-per-assignment, so re-assigning the same drill later
 * gets its own clean run. Direct launches use the drill id. The slug remains a
 * legacy fallback for runs started from `/guided-drills/:slug` before the drill
 * id travelled with the launch.
 */
export function guidedSessionKey(input: {
  assignmentId?: string | null;
  drillId?: string | null;
  slug?: string | null;
}): string | null {
  const id = input.assignmentId?.trim();
  if (id) return `${GUIDED_SESSION_PREFIX}${id}`;
  const drillId = input.drillId?.trim();
  if (drillId) return `${GUIDED_SESSION_PREFIX}drill:${drillId}`;
  const slug = input.slug?.trim();
  if (slug) return `${GUIDED_SESSION_PREFIX}slug:${slug}`;
  return null;
}

/**
 * The same key, derived from what the drill runner actually has: the
 * `guidedAssignmentId` param when present, otherwise the drill identity encoded
 * in the `returnTo` path it was launched with (`/guided/:assignmentId` or
 * `/guided-drills/:slug`). Returns null for any non-guided drill, which is what
 * switches all of this off for library, flagged, and bootcamp runs.
 */
export function guidedSessionKeyForRunner(input: {
  guidedAssignmentId?: string | null;
  guidedDrillId?: string | null;
  returnTo?: string | null;
}): string | null {
  if (input.guidedAssignmentId?.trim()) {
    return guidedSessionKey({ assignmentId: input.guidedAssignmentId });
  }
  if (input.guidedDrillId?.trim()) {
    return guidedSessionKey({ drillId: input.guidedDrillId });
  }
  const path = (input.returnTo ?? '').split('?')[0];
  const assignmentMatch = path.match(/^\/guided\/([^/]+)/);
  if (assignmentMatch) {
    return guidedSessionKey({ assignmentId: decodeURIComponent(assignmentMatch[1]) });
  }
  const slugMatch = path.match(/^\/guided-drills\/([^/]+)/);
  if (slugMatch) {
    return guidedSessionKey({ slug: decodeURIComponent(slugMatch[1]) });
  }
  return null;
}

/** The stored run for one guided drill, or null when there is nothing to resume. */
export async function loadGuidedDrillSession(
  userId: string,
  key: string | null,
  legacyKey?: string | null,
): Promise<GuidedDrillSession | null> {
  if (!userId || !key) return null;
  const current = await loadPracticeSession(userId, key);
  if (current || !legacyKey || legacyKey === key) return current;
  return loadPracticeSession(userId, legacyKey);
}

/**
 * Write where the student is right now. Called on every answer and every
 * question move, so it must stay cheap — the persistence layer writes locally at
 * once and debounces the cloud upsert.
 */
export function saveGuidedDrillSnapshot(
  userId: string,
  key: string | null,
  snapshot: GuidedDrillSnapshot,
): Promise<void> {
  if (!userId || !key) return Promise.resolve();
  return savePracticeSessionSnapshot(userId, { slug: key, completionId: key }, snapshot);
}

/**
 * Mark the run finished. This is what keeps a re-attempt honest: a completed row
 * is never resumed, so opening the drill again draws a fresh set of questions,
 * which is the intended guided-drill behaviour.
 */
export function completeGuidedDrillSession(
  userId: string,
  key: string | null,
  snapshot: GuidedDrillSnapshot,
): Promise<void> {
  if (!userId || !key) return Promise.resolve();
  return completePracticeSession(userId, { slug: key, completionId: key }, snapshot);
}

/** Drop the row outright, so the next open starts from question 1. */
export function resetGuidedDrillSession(userId: string, key: string | null): Promise<void> {
  if (!userId || !key) return Promise.resolve();
  return resetPracticeSession(userId, key);
}

/**
 * Is this stored row resumable against the set we are about to launch?
 *
 * Same length and same membership, not same order: the stored queue is the one
 * that wins, so a reshuffled fresh draw of the identical questions still counts
 * as the same set. A pool that changed under a saved run does not — starting
 * clean is the only honest option there.
 */
export function isResumableGuidedSession(
  stored: GuidedDrillSession | null,
  queue: string[],
): boolean {
  if (!stored || stored.status !== 'in_progress') return false;
  if (stored.question_queue.length === 0) return false;
  if (stored.question_queue.length !== queue.length) return false;
  const target = new Set(queue);
  return stored.question_queue.every((qid) => target.has(qid));
}

/**
 * Where to drop the student back in.
 *
 * The stored index is a starting point, not the answer. Snapshot writes are
 * local-first with a debounced cloud upsert, so a resume that hydrates from the
 * cloud can read an index one behind the last local write and put the student
 * back on a question they already answered. Landing on the first question they
 * have NOT answered, at or after the stored index, is both immune to that race
 * and what a student expects "pick up where I left off" to mean.
 *
 * Everything already answered → the last question, so they can review and
 * finish rather than being bounced past the end.
 */
export function guidedResumeIndex(
  queue: string[],
  storedIndex: number,
  answeredQids: Iterable<string>,
): number {
  if (queue.length === 0) return 0;
  const answered = new Set(answeredQids);
  const start = Math.min(Math.max(storedIndex, 0), queue.length - 1);
  if (!answered.has(queue[start])) return start;
  for (let i = start + 1; i < queue.length; i++) {
    if (!answered.has(queue[i])) return i;
  }
  // Nothing unanswered ahead — fall back to anything missed earlier.
  for (let i = 0; i < start; i++) {
    if (!answered.has(queue[i])) return i;
  }
  return queue.length - 1;
}

/**
 * The line shown on the launch card so the student knows their work is still
 * there. It names the question guidedResumeIndex will actually open, so the card
 * and the drill never disagree about where they are being put back.
 */
export function guidedResumeNotice(stored: GuidedDrillSession | null): string | undefined {
  if (!stored || stored.status !== 'in_progress') return undefined;
  const total = stored.question_queue.length;
  if (total === 0) return undefined;
  const answered = stored.attempts.length;
  if (answered === 0) return undefined;
  const at =
    guidedResumeIndex(
      stored.question_queue,
      stored.current_index,
      stored.attempts.map((a) => a.qid),
    ) + 1;
  return `Picking up where you left off — question ${at} of ${total}, ${answered} already answered.`;
}

/**
 * Rehydrate a finished run into the shape the results view reads.
 *
 * A completed row keeps the exact question queue and every answer — completion
 * only stops it being *resumed*, it does not throw the work away. Without this
 * the record sits in the store unread and a student who reopens a finished
 * drill sees a fresh draw with no way back to what they actually did, which is
 * how a completed guided drill came to look like lost work.
 *
 * Only the fields the results view uses are populated. `timestamp` is not
 * stored per attempt (the snapshot schema keeps qid/answer/correct/time_ms), so
 * it is left at 0 rather than invented — the results view sorts by queue order
 * and never reads it.
 */
export function guidedSessionToDrillSession(
  stored: GuidedDrillSession | null,
): Pick<DrillSession, 'mode' | 'questionQueue' | 'currentIndex' | 'attempts'> | null {
  if (!stored || stored.question_queue.length === 0) return null;
  const attempts = guidedAttemptsToDrillAttempts(stored.attempts);
  return {
    mode: 'type-drill',
    questionQueue: stored.question_queue,
    currentIndex: stored.current_index,
    attempts,
  };
}

export function guidedAttemptsToDrillAttempts(stored: PracticeSessionAttempt[]): DrillSession['attempts'] {
  const attempts: DrillSession['attempts'] = new Map();
  for (const a of stored) {
    attempts.set(a.qid, {
      selectedAnswer: a.selected_answer,
      correct: a.correct,
      timeMs: a.time_ms ?? 0,
      timestamp: 0,
      switchCount: a.switch_count,
      brMarked: a.flagged,
      answerRevealed: a.answer_revealed ?? false,
      answerTrail: a.answer_trail?.map((e) => ({ answer: e.answer, atMs: e.at_ms })),
    });
  }
  return attempts;
}

/**
 * The finished run for this drill, if there is one. Mirrors
 * loadGuidedDrillSession but selects the completed row instead of the resumable
 * one, so the launch page can offer a review rather than silently redrawing.
 */
export async function loadCompletedGuidedDrillSession(
  userId: string,
  key: string | null,
  legacyKey?: string | null,
): Promise<GuidedDrillSession | null> {
  const stored = await loadGuidedDrillSession(userId, key, legacyKey);
  if (!stored || stored.status !== 'completed') return null;
  return stored.attempts.length > 0 ? stored : null;
}
