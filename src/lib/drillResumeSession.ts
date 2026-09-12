/**
 * Resume state for every OTHER drill — Smart Drill, custom type drills, and
 * full sections.
 *
 * Guided drills and Intro to LR practice sets already survive a closed tab, a
 * sign-out, or a different device (see guidedDrillSession). Nothing else did:
 * a student mid-way through a Smart Drill who closed the browser came back to
 * a fresh shuffle, and the answers they had already given were nowhere on the
 * screen. The attempts themselves were never lost — those are written to the
 * `attempts` table per question — but the run was, which reads as lost work.
 *
 * This rides the exact same store as the other two, namespaced so the three can
 * never collide:
 *
 *     practice set   →  pool_slug "mc-practice-1"
 *     guided drill   →  pool_slug "guided::<assignmentId>"
 *     bootcamp day   →  pool_slug "drill::bootcamp-day::<day>::<part>"
 *     homework       →  pool_slug "drill::assignment::<assignmentId>"
 *     everything else→  pool_slug "drill::<mode>::<fingerprint>"
 *
 * Failure policy, inherited: reads degrade to null (a missing resume row must
 * never block starting a drill), writes surface to the caller.
 */

import {
  loadPracticeSession,
  savePracticeSessionSnapshot,
  completePracticeSession,
  type PracticeSessionSnapshot,
} from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import type { PracticeSession } from '@/bootcamps/main-conclusion/persistence/records';

export const DRILL_SESSION_PREFIX = 'drill::';

export type DrillResumeSession = PracticeSession;
export type DrillResumeSnapshot = PracticeSessionSnapshot;

export type DrillResumeIdentity = {
  kind: 'bootcamp-day';
  day: number;
  part: 'homework' | 'practice';
};

/** Short, stable, filename-safe digest of whatever identifies the run. */
function fingerprint(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Key one run's resume row.
 *
 * A homework assignment is identified by the assignment: two assignments of
 * the same section are two sittings, and a row named by the section alone let
 * the second one open on the first one's answers and the first one's spent
 * clock. Otherwise a full section is identified by the section itself; a
 * filtered drill by the filters that drew it; Smart Drill by nothing but its
 * mode, because it has a single continuous run per student. Returns null for
 * the surfaces that own their own resume rows (guided, practice sets) and for
 * anything launched from an explicit list of qids, where the caller already
 * knows the set.
 */
export function drillResumeKey(input: {
  mode: string;
  config?: unknown;
  identity?: DrillResumeIdentity;
  /** The classroom homework assignment this run belongs to, when it does. */
  assignmentId?: string | null;
}): string | null {
  if (input.assignmentId) {
    return `${DRILL_SESSION_PREFIX}assignment::${input.assignmentId}`;
  }
  if (input.identity?.kind === 'bootcamp-day') {
    return `${DRILL_SESSION_PREFIX}bootcamp-day::${input.identity.day}::${input.identity.part}`;
  }

  const mode = input.mode;
  if (mode === 'adaptive') return `${DRILL_SESSION_PREFIX}adaptive`;

  const config = (input.config ?? null) as Record<string, unknown> | null;

  if (mode === 'full-section') {
    if (!config) return null;
    const pt = config.pt;
    const section = config.section;
    if (pt == null || section == null) return null;
    return `${DRILL_SESSION_PREFIX}section::pt${pt}-s${section}`;
  }

  if (mode === 'type-drill' || mode === 'natural-drill') {
    if (!config) return null;
    const selected = config.selectedQids as string[] | undefined;
    if (selected?.length) {
      // A pre-selected set is its own identity: the same list re-opened is the
      // same run, a different list is a different one.
      return `${DRILL_SESSION_PREFIX}${mode}::set-${fingerprint([...selected].sort().join(','))}`;
    }
    const shape = JSON.stringify({
      qtypes: config.qtypes ?? [],
      difficulties: config.difficulties ?? [],
      pts: config.pts ?? [],
      sections: config.sections ?? [],
      qfeatures: config.qfeatures ?? [],
      reasoningTypes: config.reasoningTypes ?? [],
      searchQuery: config.searchQuery ?? '',
      questionNumber: config.questionNumber ?? null,
      count: config.count ?? null,
    });
    return `${DRILL_SESSION_PREFIX}${mode}::${fingerprint(shape)}`;
  }

  return null;
}

/** The stored run for this drill, or null when there is nothing to resume. */
export async function loadDrillResumeSession(
  userId: string,
  key: string | null,
  legacyKey?: string | null,
): Promise<DrillResumeSession | null> {
  if (!userId || !key) return null;
  const current = await loadPracticeSession(userId, key);
  if (current || !legacyKey || legacyKey === key) return current;
  return loadPracticeSession(userId, legacyKey);
}

/** Write where the student is right now (local-first, debounced cloud upsert). */
export function saveDrillResumeSnapshot(
  userId: string,
  key: string | null,
  snapshot: DrillResumeSnapshot,
): Promise<void> {
  if (!userId || !key) return Promise.resolve();
  return savePracticeSessionSnapshot(userId, { slug: key, completionId: key }, snapshot);
}

/**
 * Mark the run finished. Nothing is deleted — the queue and every answer stay
 * in the row for review — it simply stops being offered as a resume, so the
 * next launch of the same drill draws fresh questions.
 */
export function completeDrillResumeSession(
  userId: string,
  key: string | null,
  snapshot: DrillResumeSnapshot,
): Promise<void> {
  if (!userId || !key) return Promise.resolve();
  return completePracticeSession(userId, { slug: key, completionId: key }, snapshot);
}

/**
 * Is this stored row worth resuming?
 *
 * Unlike a guided drill, these runs are drawn fresh on every launch, so there
 * is no fixed set to compare against — the stored queue IS the run. It is
 * resumable when it is still in progress and the student actually answered
 * something; a row with no answers has nothing to restore and would only
 * freeze a stale shuffle in place.
 */
export function isResumableDrillSession(stored: DrillResumeSession | null): boolean {
  return (
    !!stored &&
    stored.status === 'in_progress' &&
    stored.question_queue.length > 0 &&
    stored.attempts.length > 0
  );
}

/**
 * Was this row's section clock already spent when it was stored?
 *
 * A row written at or after the buzzer carries elapsed_ms equal to the budget
 * (the countdown reports zero, so the spend is the whole budget). Restoring it
 * as an ordinary resume opens the section on 00:00 with no buzzer, because the
 * regulation mark it also carries tells the buzzer effect it has already
 * asked. The runner uses this to open such a row on the buzzer instead: the
 * answers are kept, the clock is not handed back, and the student is asked to
 * finish and score the section as it was sat.
 *
 * Untimed runs have no budget and are never "spent".
 */
export function isSpentDrillSession(
  stored: DrillResumeSession | null,
  budgetMs: number | undefined,
): boolean {
  if (!stored || !budgetMs || !Number.isFinite(budgetMs)) return false;
  return (stored.elapsed_ms ?? 0) >= budgetMs;
}
