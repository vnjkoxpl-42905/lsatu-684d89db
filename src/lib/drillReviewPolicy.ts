import type { DrillLaunchBody } from '@/lib/drillLaunch';
import type { DrillRunSpec } from '@/lib/drillRunSpec';

/**
 * How the official drill surface lets a student review a question.
 *
 *  - `fixed`: a fixed queue (guided drill, assignment, saved set, custom
 *    questions, practice set, bootcamp day, filter draw). Answer and
 *    Explanation are independent toggles, no Submit pill, nothing locks.
 *  - `adaptive`: Smart Drill. Same pills, but its own bar (Submit, Skip, the
 *    auto-reveal switch) stays.
 *  - `none`: a full section, a sealed run, or a practice-test leg. Today's
 *    coupled reveal, untouched.
 *
 * A pure function of the resolved spec, so an early render can never
 * misclassify a run the way the mutable `isPracticeSetMode` state could.
 */
export type ReviewPolicy = 'fixed' | 'adaptive' | 'none';

/**
 * Which pick model a run uses. `list`: a pick is written straight into
 * `session.attempts` and the set is persisted at the end. `commit`: a pick
 * sits in `selectedAnswer` and is persisted per question on the way out.
 * Independent of the review policy, because a `questions` launch can arrive as
 * `natural-drill` and never sets a selected-qid list.
 */
export type PickModel = 'list' | 'commit';

function policyForKind(kind: DrillLaunchBody['kind']): ReviewPolicy {
  switch (kind) {
    case 'guided-drill':
    case 'assignment':
    case 'saved-set':
    case 'questions':
    case 'practice-set':
    case 'bootcamp-day':
    case 'filter':
      return 'fixed';
    case 'smart-drill':
      return 'adaptive';
    case 'section':
      return 'none';
    default: {
      const never: never = kind;
      return never;
    }
  }
}

export function reviewPolicyForRun(spec: DrillRunSpec): ReviewPolicy {
  if (spec.sealed || spec.ptRun) return 'none';
  if (!spec.launchKind) return 'none';
  return policyForKind(spec.launchKind);
}

/** The exact condition the runner uses to enter the in-memory-attempt model. */
export function hasSelectedQidList(spec: DrillRunSpec): boolean {
  if (spec.mode !== 'type-drill') return false;
  const config = spec.config as { selectedQids?: string[] } | undefined;
  return !!config?.selectedQids && config.selectedQids.length > 0;
}

export function pickModelForRun(spec: DrillRunSpec): PickModel {
  return hasSelectedQidList(spec) ? 'list' : 'commit';
}
