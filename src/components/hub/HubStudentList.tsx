import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Search, User } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHubStudents, type HubStudentRow } from "@/hooks/useHubStudents";

interface Props {
  selectedId: string | null;
  onSelect: (studentId: string) => void;
}

/**
 * Student Hub left panel. Forked from StudentSelector so we can decorate
 * each row with last-seen, assignment counts, and an unread pip without
 * changing the selector used by FloatingTAWidget.
 *
 * Rows are keyed by `class_id`, matching every other TA surface.
 */
export default function HubStudentList({ selectedId, onSelect }: Props) {
  const { rows, loading, error, refresh } = useHubStudents();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => {
      const name = (s.display_name ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading…
          </div>
        ) : error ? (
          <div className="p-4 space-y-2">
            <div className="text-sm text-red-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Failed to load students.</span>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="text-[11px] text-zinc-400 hover:text-zinc-100 underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">
            {query ? "No matching students." : "No students yet."}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {filtered.map((s) => (
              <StudentRow
                key={s.class_id}
                student={s}
                active={s.class_id === selectedId}
                onClick={() => onSelect(s.class_id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  student: HubStudentRow;
  active: boolean;
  onClick: () => void;
}

function StudentRow({ student, active, onClick }: RowProps) {
  const lastSeen = student.last_seen_at
    ? formatDistanceToNowStrict(new Date(student.last_seen_at), {
        addSuffix: true,
      })
    : "Never";

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left px-3 py-2.5 flex items-start gap-2.5 text-sm transition border-l-2",
          active
            ? "bg-zinc-800/70 text-zinc-100 border-l-amber-400"
            : "text-zinc-300 hover:bg-zinc-900/60 border-l-transparent"
        )}
      >
        <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 relative">
          <User className="h-3.5 w-3.5 text-zinc-400" />
          {student.has_unread_from_student && (
            <span
              aria-label="Unread message"
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sky-400 ring-2 ring-zinc-950"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">
              {student.display_name?.trim() || "Unnamed"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
            <span className="truncate">{lastSeen}</span>
            {student.assignments_total > 0 && (
              <>
                <span>·</span>
                <span className="shrink-0">
                  {student.assignments_completed}/{student.assignments_total}
                </span>
              </>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}
