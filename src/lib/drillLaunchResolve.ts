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
      // Assignments, guided drills and practice sets are still handed over in
      // the old grammar, which carries their questions directly. Nothing emits
      // the id-named form for them yet, so reaching here means a hand-written
      // link rather than one the app produced.
      throw new DrillLaunchError(
        `${launch.kind} links are not accepted yet — open it from the classroom instead.`,
      );
  }
}
