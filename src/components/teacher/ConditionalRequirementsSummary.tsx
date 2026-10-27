import type { ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { resolveConditionalRequirements, snapshotConditionalRequirements } from '@/bootcamps/conditionals/courseRequirements';

/** Pure authoring summary. Inputs are protected targets and fetched metadata,
 * or explicitly labelled local examples in the development harness. */
export function ConditionalRequirementsSummary({ target, existingSnapshots = [] }: {
  target: ConditionalAssignmentTarget;
  existingSnapshots?: unknown[];
}) {
  if (!target.courseEdition) return null;
  let count: number;
  try {
    count = snapshotConditionalRequirements(target).requiredStepIds.length;
    if (!count) throw new Error('No eligible work');
  } catch {
    return <p className="text-sm text-muted-foreground" role="status">Choose valid conditional work to see its required steps.</p>;
  }
  let unavailable = false;
  const existingCounts = [...new Set(existingSnapshots.flatMap(snapshot => {
    try { return [resolveConditionalRequirements(target, snapshot).requiredStepIds.length]; }
    catch { unavailable = true; return []; }
  }))];
  return <div className="space-y-2 text-sm text-muted-foreground" aria-label="Assignment required steps">
    <p>This new assignment requires {count} lessons and drills.
      {existingCounts.length > 0 && <> Existing assignments retain their required steps ({existingCounts.join(', ')}).</>}</p>
    {unavailable && <p>An existing assignment needs its required lessons reviewed before a count can be shown.</p>}
  </div>;
}
