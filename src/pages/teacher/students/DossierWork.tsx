import { Plus } from 'lucide-react';
import HubAssignments from '@/components/hub/HubAssignments';
import { BootcampLessonProgress } from '@/components/teacher/bootcamps/BootcampLessonProgress';
import { useDossier } from './StudentDossier';

/**
 * Work = every assignment kind for this student in one place.
 *
 * This reuses `HubAssignments`, which already queries all three real sources
 * (`homework_assignments`, `ta_assignments`, `classroom_items`) and carries
 * the unassign/delete flows. It groups by kind rather than interleaving one
 * newest-first list; each group is already newest-first. Rebuilding it as a
 * single interleaved timeline would have meant re-deriving those queries and
 * dropping the delete affordances, so the grouping stands until there is a
 * reason to trade that away.
 */
export default function DossierWork() {
  const { studentId, openAssign } = useDossier();

  return (
    <div className="space-y-4 p-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAssign}
          className="inline-flex items-center gap-1.5 bg-teacher-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-teacher-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Assign work
        </button>
      </div>

      <HubAssignments studentId={studentId} />

      {/* Renders nothing when there is no stored progress, so it never adds an
          empty block. */}
      <BootcampLessonProgress studentClassId={studentId} />
    </div>
  );
}
