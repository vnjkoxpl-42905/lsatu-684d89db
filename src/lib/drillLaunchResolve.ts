/**
 * Turning a Drill Launch's *name* into the questions it stands for.
 *
 * A launch names a run rather than containing it, so the kinds named by a row
 * have to read that row before the runner can start. This is the read.
 *
 * A row that is gone is a dead link, and a dead link says so. It does not fall
 * back to a generic drill: a student quietly drilling something nobody assigned
 * is worse than a student telling you a link is broken. See
 * `docs/adr/0016-a-drill-link-names-a-run-it-does-not-contain-one.md`.
 */

import { DrillLaunchError, launchNeedsResolution, type DrillLaunch } from '@/lib/drillLaunch';
import { listSavedSets } from '@/lib/savedSets';
import { supabase } from '@/integrations/supabase/client';
import { getPracticePool } from '@/bootcamps/main-conclusion/data/practiceDrillPools';
import {
  pickHomeworkForDay,
  pickPracticeForDay,
} from '@/bootcamps/principle-flaw/lib/dayQuestions';
import {
  drillResumeKey,
  isResumableDrillSession,
  loadDrillResumeSession,
} from '@/lib/drillResumeSession';
import { getRecentExposureSet } from '@/lib/questionExposure';
import {
  getAssignment,
  getGuidedDrill,
  resolveGuidedDrillQidsForLevel,
  type GuidedDrill,
  type GuidedDrillAssignment,
} from '@/lib/guidedDrills';
import {
  getLocalGuidedDrillBySlug,
  isEmptyBankFilter,
} from '@/lib/guidedDrillsLocal';
import {
  guidedSessionKey,
  loadGuidedDrillSession,
} from '@/lib/guidedDrillSession';

/** Raised when the link is well-formed but the thing it names is gone. */
export class DeadDrillLinkError extends DrillLaunchError {
  constructor(message: string) {
    super(message);
    this.name = 'DeadDrillLinkError';
  }
}

export async function resolveDrillLaunch(
  launch: DrillLaunch,
  userId: string | undefined,
): Promise<string[] | undefined> {
  if (!launchNeedsResolution(launch)) return undefined;

  switch (launch.kind) {
    case 'saved-set': {
      if (!userId) {
        throw new DeadDrillLinkError('You need to be signed in to open a saved set.');
      }
      // Saved sets belong to the student who saved them, so a link to someone
      // else's set finds nothing here — which is the intended answer, not a
      // failure to look hard enough.
      const sets = await listSavedSets(userId);
      const set = sets.find((s) => s.id === launch.setId);
      if (!set) {
        throw new DeadDrillLinkError('That saved set no longer exists.');
      }
      if (set.question_ids.length === 0) {
        throw new DeadDrillLinkError('That saved set has no questions in it.');
      }
      return set.question_ids;
    }

    case 'assignment': {
      // `homework_assignments`, which is where the classroom assignment surfaces
      // read theirs from (`useStudentAssignment`). NOT `guided_drill_assignments`:
      // those are a different table with different ids, and looking an id up in
      // the wrong one makes a live assignment read as a dead link.
      const { data, error } = await supabase
        .from('homework_assignments')
        .select('id, question_qids')
        .eq('id', launch.assignmentId)
        .maybeSingle();
      if (error) throw error;
      const qids = (data as { question_qids?: string[] } | null)?.question_qids ?? [];
      if (!data) {
        throw new DeadDrillLinkError('That assignment no longer exists.');
      }
      if (qids.length === 0) {
        throw new DeadDrillLinkError('That assignment has no questions on it.');
      }
      return qids;
    }

    case 'practice-set': {
      // The pool is static source data with a fixed list, so re-resolving the
      // slug gives back the same questions every time. Its Run Record is keyed
      // by the slug too, so both safety conditions hold.
      const pool = getPracticePool(launch.slug);
      if (!pool) {
        throw new DeadDrillLinkError('That practice set no longer exists.');
      }
      return [...pool.qids];
    }

    case 'bootcamp-day': {
      const resumeKey = drillResumeKey({
        mode: 'type-drill',
        identity: launch,
      });
      let hasIdentityRecord = false;
      if (userId) {
        const stored = await loadDrillResumeSession(userId, resumeKey);
        hasIdentityRecord = !!stored;
        if (isResumableDrillSession(stored)) return stored.question_queue;
      }

      // The day picker includes the student's recently-seen cooldown, so a
      // fresh resolution can legitimately produce a different list. The
      // identity-keyed Run Record above wins whenever one exists; only a new
      // run reaches this draw. The gate waits for the question bank first.
      const excludedQids = userId ? await getRecentExposureSet(userId, 500) : new Set<string>();
      const qids =
        launch.part === 'homework'
          ? pickHomeworkForDay(launch.day, undefined, excludedQids)
          : pickPracticeForDay(launch.day, undefined, excludedQids);
      if (userId && !hasIdentityRecord && qids.length > 0) {
        const legacyKey = drillResumeKey({
          mode: 'type-drill',
          config: { selectedQids: qids },
        });
        const legacy = await loadDrillResumeSession(userId, legacyKey);
        if (isResumableDrillSession(legacy)) return legacy.question_queue;
      }
      if (qids.length === 0) {
        throw new DeadDrillLinkError(
          `Day ${launch.day} has no ${launch.part} questions to give yet.`,
        );
      }
      return qids;
    }

    case 'guided-drill': {
      let assignment: (GuidedDrillAssignment & { guided_drill?: GuidedDrill }) | null = null;
      let drill: GuidedDrill | null = null;

      if (launch.assignmentId) {
        assignment = (await getAssignment(launch.assignmentId)) as typeof assignment;
        drill = assignment?.guided_drill ?? null;
      } else if (launch.drillId) {
        drill = await getGuidedDrill(launch.drillId);
        if (!drill) drill = getLocalGuidedDrillBySlug(launch.drillId);
      }

      if (!drill) {
        throw new DeadDrillLinkError('That guided drill no longer exists.');
      }

      const local = getLocalGuidedDrillBySlug(drill.slug);
      if (local && isEmptyBankFilter(drill.bank_filter)) {
        drill = {
          ...drill,
          bank_filter: local.bank_filter,
          question_count: drill.question_count ?? local.question_count,
        };
      }

      if (userId) {
        const currentKey = guidedSessionKey({
          assignmentId: launch.assignmentId,
          drillId: launch.assignmentId ? undefined : launch.drillId,
        });
        const legacyKey = launch.assignmentId
          ? null
          : guidedSessionKey({ slug: drill.slug });
        const stored = await loadGuidedDrillSession(userId, currentKey, legacyKey);
        if (
          stored?.status === 'in_progress' &&
          stored.question_queue.length > 0 &&
          stored.attempts.length > 0
        ) {
          return stored.question_queue;
        }
      }

      const resolution = resolveGuidedDrillQidsForLevel({ drill, assignment });
      if (resolution.warning === 'empty' || resolution.qids.length === 0) {
        throw new DeadDrillLinkError('That guided drill has no questions to give yet.');
      }
      return resolution.qids;
    }

    default:
      throw new DrillLaunchError(
        `${launch.kind} links are not accepted yet — open it from the classroom instead.`,
      );
  }
}
