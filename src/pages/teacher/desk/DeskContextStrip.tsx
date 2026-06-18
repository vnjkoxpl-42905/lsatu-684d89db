import type { HubStudentRow } from '@/hooks/useHubStudents';
import { completionRate, type DeskTask } from './deskTasks';

/**
 * Right column — read-only evidence for the active task. NO action controls:
 * approval lives in the assistant's cards (ADR 0003). When a task is selected it
 * shows student signals + source provenance; with nothing selected the parent
 * collapses this column entirely, so the assistant gets the room.
 */
export function DeskContextStrip({
  task,
  studentRow,
}: {
  task: DeskTask;
  studentRow: HubStudentRow | null;
}) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Context</div>

      <div className="text-sm font-semibold">{task.studentName || task.subject}</div>
      {studentRow ? (
        <dl className="mt-3 space-y-1.5 text-xs text-black/56">
          <Row label="Completed" value={`${studentRow.assignments_completed} / ${studentRow.assignments_total}`} />
          <Row label="Completion" value={`${completionRate(studentRow)}%`} />
          <Row label="Unread from student" value={studentRow.has_unread_from_student ? 'Yes' : 'No'} />
        </dl>
      ) : (
        <p className="mt-2 text-sm leading-6 text-black/52">
          No roster row is loaded for this task. Open the full student page for profile and progress.
        </p>
      )}

      {/* Source provenance — what produced the draft, not just the text. */}
      <div className="mt-5 border border-black/12 bg-white/18 p-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-black/45">{task.sourceLabel}</div>
        <div className="mt-1 text-sm font-semibold text-black/72">{task.reason}</div>
        <p className="mt-1.5 text-[13px] leading-5 text-black/55">{task.preview}</p>
        {task.suggested ? (
          <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-black/40">Suggested by assistant</div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-semibold text-black/72 tabular-nums">{value}</dd>
    </div>
  );
}
