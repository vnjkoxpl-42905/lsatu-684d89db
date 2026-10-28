import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import HubAssignments from '@/components/hub/HubAssignments';
import { BootcampLessonProgress } from '@/components/teacher/bootcamps/BootcampLessonProgress';
import { StudentIndicatorLedger } from '@/features/activity-centre/components/StudentIndicatorLedger';
import { useScopedStudentWork } from '@/hooks/useScopedStudentWork';
import { useDossier } from './StudentDossier';
import { useActivityRevocationCapability } from '@/features/activity-centre/hooks/useActivityRevocationCapability';
import { revokeActivityAssignment } from '@/features/activity-centre/api/activityRevocation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

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
  const canRevokeActivity = useActivityRevocationCapability();
  const qc = useQueryClient();
  const [pending, setPending] = useState<{ id: string; title: string; studentId: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function confirmRevocation() {
    if (!pending || revoking) return;
    if (pending.studentId !== studentId) { setPending(null); return; }
    setRevoking(true);
    try {
      await revokeActivityAssignment(pending.id, studentId);
      toast.success('Activity unassigned. Saved work has been kept.');
      setPending(null);
      const refreshed = await Promise.allSettled([
        Promise.resolve().then(() => ownedWork.refresh({ throwOnError: true })),
        Promise.resolve().then(() => qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] }, { throwOnError: true })),
        Promise.resolve().then(() => qc.invalidateQueries({ queryKey: ['classroom-items', studentId] }, { throwOnError: true })),
      ]);
      if (refreshed.some(result => result.status === 'rejected')) {
        toast.error('Activity unassigned, but the work list could not refresh. Reload to see the updated list.');
      }
    } catch (error) {
      toast.error('Could not confirm Activity unassignment', { description: 'Refresh the work list before retrying.' });
    } finally { setRevoking(false); }
  }

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
                      {row.progressUnverified ? 'Progress unverified' : row.status.replace('_', ' ')}
                    </span>
                    {row.sourceTable === 'activity_assignments' && (
                      <button type="button" disabled={!canRevokeActivity}
                        aria-label={canRevokeActivity ? `Unassign ${row.title}` : `Unassign ${row.title} unavailable`}
                        title={canRevokeActivity ? 'Unassign Activity and keep saved work' : 'Activity unassignment is unavailable. The assignment has been kept.'}
                        onClick={() => setPending({ id: row.refId, title: row.title, studentId })}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && !revoking && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign from student?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? `"${pending.title}" will be removed from the student's view. Their saved answers and results will be kept. This can't be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={revoking} onClick={(event) => { event.preventDefault(); void confirmRevocation(); }}>
                {revoking ? 'Removing…' : 'Unassign'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Renders nothing when there is no stored progress, so it never adds an
          empty block. */}
      <BootcampLessonProgress studentClassId={studentId} />

      {/* What their Activity work says to teach next, read from the attempts
          they have already made. Also renders nothing when there are none. */}
      <StudentIndicatorLedger studentClassId={studentId} />
    </div>
  );
}
