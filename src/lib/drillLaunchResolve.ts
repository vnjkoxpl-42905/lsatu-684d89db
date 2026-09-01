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
import { getAssignment } from '@/lib/guidedDrills';
import {
  pickHomeworkForDay,
  pickPracticeForDay,
} from '@/bootcamps/principle-flaw/lib/dayQuestions';

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
      // The assignment row owns the list. Re-reading it is the whole point: an
      // assignment edited after the link went out should run what it says now,
      // not what it said when the student was emailed.
      const row = (await getAssignment(launch.assignmentId)) as
        | { question_qids?: string[]; guided_drill?: { question_qids?: string[] } }
        | null;
      if (!row) {
        throw new DeadDrillLinkError('That assignment no longer exists.');
      }
      const qids = row.question_qids?.length
        ? row.question_qids
        : (row.guided_drill?.question_qids ?? []);
      if (qids.length === 0) {
        throw new DeadDrillLinkError('That assignment has no questions on it.');
      }
      return qids;
    }

    case 'bootcamp-day': {
      // Deterministic for a given day and part, so the same link picks the same
      // questions even before a Run Record exists.
      const qids =
        launch.part === 'homework'
          ? pickHomeworkForDay(launch.day)
          : pickPracticeForDay(launch.day);
      if (qids.length === 0) {
        throw new DeadDrillLinkError(
          `Day ${launch.day} has no ${launch.part} questions to give yet.`,
        );
      }
      return qids;
    }

    default:
      // Guided drills and practice sets are still handed over in the old
      // grammar, which carries their questions directly. A guided drill cannot
      // safely be id-named yet: without an assignment it resolves through a
      // per-student level band, so re-resolving on refresh could draw a
      // different set than the one the student is part-way through.
      throw new DrillLaunchError(
        `${launch.kind} links are not accepted yet — open it from the classroom instead.`,
      );
  }
}
