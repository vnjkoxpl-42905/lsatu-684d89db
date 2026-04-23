import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelativeShort } from "@/lib/time";
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
 * Keyboard:
 *   - Cmd/Ctrl+K    focus the search input
 *   - Arrow Up/Down move a virtual cursor through the filtered list
 *   - Enter         select the cursor row
 *   - Esc (search)  clear the query
 *
 * Rows are keyed by `class_id`, matching every other TA surface.
 */
export default function HubStudentList({ selectedId, onSelect }: Props) {
  const { rows, loading, error, refresh } = useHubStudents();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => {
      const name = (s.display_name ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, query]);

  // Reset cursor when the filtered list shrinks or changes significantly.
  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  // Sync cursor to the currently selected row when it's in view so
  // arrow keys start from "where we are" rather than top-of-list.
  useEffect(() => {
    if (!selectedId) return;
    const idx = filtered.findIndex((s) => s.class_id === selectedId);
    if (idx >= 0) setCursor(idx);
    // Intentionally only when selectedId or filter changes materially.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, filtered.length]);

  // Scroll cursor row into view as it moves.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-cursor="${cursor}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // Global Cmd/Ctrl+K → focus the search input when the hub is mounted.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[cursor];
      if (target) onSelect(target.class_id);
    }
  };

  return (
    <div
      className="flex h-full flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Search students (⌘K)"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ul className="divide-y divide-zinc-800" aria-label="Loading students">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="px-3 py-2.5 flex items-center gap-2.5">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
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
          <ul ref={listRef} className="divide-y divide-zinc-800">
            {filtered.map((s, i) => (
              <StudentRow
                key={s.class_id}
                index={i}
                student={s}
                active={s.class_id === selectedId}
                cursor={i === cursor}
                onClick={() => onSelect(s.class_id)}
                onHover={() => setCursor(i)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  index: number;
  student: HubStudentRow;
  active: boolean;
  cursor: boolean;
  onClick: () => void;
  onHover: () => void;
}

function StudentRow({
  index,
  student,
  active,
  cursor,
  onClick,
  onHover,
}: RowProps) {
  const lastSeen = formatRelativeShort(student.last_seen_at);

  return (
    <li data-cursor={index}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onHover}
        className={cn(
          "w-full text-left px-3 py-2.5 flex items-start gap-2.5 text-sm transition border-l-2",
          active
            ? "bg-zinc-800/70 text-zinc-100 border-l-amber-400"
            : cursor
            ? "bg-zinc-900/70 text-zinc-100 border-l-transparent"
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
