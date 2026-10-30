import { useMemo, useState } from 'react';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelativeShort } from '@/lib/time';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';

/**
 * Roster pane shared by desk library surfaces (Assignments, Bootcamps).
 * Mirrors the desk People surface's white/glass look so all desk panes feel
 * like the same product.
 */
export function DeskStudentPicker({
  selectedId,
  onSelect,
  label = 'Pick a student',
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  label?: string;
}) {
  const { rows, loading } = useHubStudents();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => {
      const name = (s.display_name ?? '').toLowerCase();
      const email = (s.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, query]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-black/10 bg-white/20 backdrop-blur lg:w-[280px]">
      <div className="shrink-0 border-b border-black/10 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
          {label}
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students"
            className="h-8 border-black/15 bg-white/40 pl-8 text-sm text-black placeholder:text-black/35 focus-visible:border-black/35 focus-visible:ring-black/10"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ul className="divide-y divide-black/10" aria-label="Loading students">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-full bg-black/10" />
                <Skeleton className="h-3 w-1/2 bg-black/10" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-black/45">
            {query ? 'No matches.' : 'No students yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-black/10">
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
    </aside>
  );
}

function StudentRow({
  student,
  active,
  onClick,
}: {
  student: HubStudentRow;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition',
          active
            ? 'border-l-black bg-white/40 text-black'
            : 'border-l-transparent text-black/70 hover:bg-white/25',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white/30">
          <User className="h-3.5 w-3.5 text-black/45" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {student.display_name?.trim() || 'Unnamed'}
          </div>
          <div className="truncate text-[11px] text-black/45">
            {formatRelativeShort(student.last_seen_at) || 'No activity'}
          </div>
        </div>
      </button>
    </li>
  );
}

export default DeskStudentPicker;
