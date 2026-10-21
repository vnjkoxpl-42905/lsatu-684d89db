import { Plus } from 'lucide-react';
import HubAssignments from '@/components/hub/HubAssignments';
import { BootcampLessonProgress } from '@/components/teacher/bootcamps/BootcampLessonProgress';
import { StudentIndicatorLedger } from '@/features/activity-centre/components/StudentIndicatorLedger';
import { useScopedStudentWork } from '@/hooks/useScopedStudentWork';
import { useDossier } from './StudentDossier';

/**
 * Work = every assignment kind for this student in one place.
 *
 * HubAssignments keeps its existing homework, TA, and classroom-item controls.
 * The owned-work panel adds issued guided and Activity assignments that are
 * absent from Hub, using the student's My Work projection for their status.
 */
export default function DossierWork() {
  const { studentId, openAssign } = useDossier();
  const ownedWork = useScopedStudentWork(studentId);

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

      <section aria-label="Guided drills and Activities" className="space-y-2 px-4 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Guided drills and Activities
        </h2>
        {ownedWork.resolution.state === 'denied' ? (
          <div role="alert" className="text-xs text-destructive">
            This student view is unavailable to this account.
          </div>
        ) : (
          <>
            {ownedWork.error && (
              <div role="alert" className="text-xs text-destructive">
                Could not refresh guided drills and Activities. Earlier saved work is still shown when available.
                <button type="button" className="ml-2 underline" onClick={() => void ownedWork.refresh()}>Try again</button>
              </div>
            )}
            {ownedWork.failedSources.length > 0 && (
              <div role="alert" className="text-xs text-destructive">
                Could not confirm {ownedWork.failedSources.join(', ')}. This work list may be incomplete or have unverified progress.
                <button type="button" className="ml-2 underline" onClick={() => void ownedWork.refresh()}>Try again</button>
              </div>
            )}
            {ownedWork.loading && ownedWork.rows.length === 0 ? (
              <p role="status" className="text-xs text-muted-foreground">Loading guided drills and Activities…</p>
            ) : ownedWork.rows.length > 0 ? (
              <ul className="space-y-1.5">
                {ownedWork.rows.map((row) => (
                  <li key={`${row.sourceTable}:${row.refId}`} className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{row.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {row.kind === 'guided' ? 'Guided drill' : 'Activity'} · {row.subtitle}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {row.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : ownedWork.failedSources.length === 0 && !ownedWork.error ? (
              <p className="text-xs text-muted-foreground">No other guided drills or Activities.</p>
            ) : null}
          </>
        )}
      </section>

      <HubAssignments studentId={studentId} />

      {/* Renders nothing when there is no stored progress, so it never adds an
          empty block. */}
      <BootcampLessonProgress studentClassId={studentId} />

      {/* What their Activity work says to teach next, read from the attempts
          they have already made. Also renders nothing when there are none. */}
      <StudentIndicatorLedger studentClassId={studentId} />
    </div>
  );
}
