import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  useAdminTAAssignmentsForStudent,
  type TAAssignmentStatus,
} from "@/hooks/useStudentAssignments";

function StatusBadge({ status }: { status: TAAssignmentStatus }) {
  const map: Record<TAAssignmentStatus, { label: string; cls: string }> = {
    assigned: { label: "Assigned", cls: "bg-zinc-800 text-zinc-300" },
    viewed: { label: "Viewed", cls: "bg-amber-500/15 text-amber-300" },
    completed: { label: "Completed", cls: "bg-emerald-500/15 text-emerald-300" },
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

export default function StudentTAAssignmentsStrip({
  studentId,
}: {
  studentId: string;
}) {
  const { assignments, loading } = useAdminTAAssignmentsForStudent(studentId);
  const [open, setOpen] = React.useState(false);

  if (loading && assignments.length === 0) {
    return (
      <div className="px-3 py-2 border-b border-zinc-800 text-[11px] text-zinc-500">
        Loading assignments…
      </div>
    );
  }
  if (assignments.length === 0) {
    return (
      <div className="px-3 py-2 border-b border-zinc-800 text-[11px] text-zinc-500">
        No TA assignments yet for this student.
      </div>
    );
  }

  const counts = assignments.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<TAAssignmentStatus, number>
  );

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-900/80 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        )}
        <span className="text-[11px] uppercase tracking-wider text-zinc-400">
          Assignments
        </span>
        <span className="text-[11px] text-zinc-500">
          {assignments.length} total
          {counts.assigned ? ` · ${counts.assigned} assigned` : ""}
          {counts.viewed ? ` · ${counts.viewed} viewed` : ""}
          {counts.completed ? ` · ${counts.completed} completed` : ""}
        </span>
      </button>
      {open && (
        <ul className="max-h-48 overflow-y-auto border-t border-zinc-800 divide-y divide-zinc-800">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="px-3 py-1.5 flex items-center gap-2 text-sm text-zinc-200"
            >
              <div className="flex-1 min-w-0 truncate">{a.title}</div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
