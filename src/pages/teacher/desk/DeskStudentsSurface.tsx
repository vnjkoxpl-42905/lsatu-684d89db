import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AlertTriangle, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelativeShort } from '@/lib/time';
import { track } from '@/lib/analytics';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';

export function DeskStudentsSurface() {
  const { rows, loading, error, refresh } = useHubStudents();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((student) => {
      const name = (student.display_name ?? '').toLowerCase();
      const email = (student.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [rows, query]);

  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [cursor, filtered.length]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const handle = window.setTimeout(() => {
      track('hub_search_used', { query_length: trimmed.length, surface: 'teacher_desk_students' });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-cursor="${cursor}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [cursor]);

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (filtered.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((index) => (index + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((index) => (index - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = filtered[cursor];
      if (target) setSelectedId(target.class_id);
    }
  };

  return (
    <section
      className="flex h-full w-full max-w-4xl flex-col border border-black/12 bg-white/25 shadow-[0_20px_80px_rgba(17,24,28,0.10)] backdrop-blur"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      aria-label="Students workspace"
    >
      <div className="border-b border-black/10 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">Students</div>
            <h2 className="mt-1 text-xl font-semibold text-black">Roster</h2>
          </div>
          <div className="text-xs font-semibold text-black/45">{rows.length} students</div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" strokeWidth={1.5} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && query) {
                event.preventDefault();
                setQuery('');
              }
            }}
            placeholder="Search students"
            className="border-black/15 bg-white/30 pl-9 text-sm text-black placeholder:text-black/35 focus-visible:border-black/35 focus-visible:ring-black/10"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ul className="divide-y divide-black/10" aria-label="Loading students">
            {[0, 1, 2, 3, 4].map((item) => (
              <li key={item} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full bg-black/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2 bg-black/10" />
                  <Skeleton className="h-3 w-1/3 bg-black/10" />
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="p-5">
            <div className="flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>Failed to load students.</span>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-3 text-xs font-semibold text-black/55 underline underline-offset-4 hover:text-black"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-sm text-black/45">{query ? 'No matching students.' : 'No students yet.'}</div>
        ) : (
          <ul ref={listRef} className="divide-y divide-black/10">
            {filtered.map((student, index) => (
              <StudentRow
                key={student.class_id}
                index={index}
                student={student}
                active={student.class_id === selectedId}
                cursor={index === cursor}
                onClick={() => setSelectedId(student.class_id)}
                onHover={() => setCursor(index)}
              />
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-black/10 px-5 py-3 text-xs text-black/45">
        Deep student profile in-desk is a follow-up.
      </div>
    </section>
  );
}

function StudentRow({
  index,
  student,
  active,
  cursor,
  onClick,
  onHover,
}: {
  index: number;
  student: HubStudentRow;
  active: boolean;
  cursor: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  const lastSeen = formatRelativeShort(student.last_seen_at);

  return (
    <li data-cursor={index}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onHover}
        className={cn(
          'flex w-full items-start gap-3 border-l-2 px-5 py-4 text-left transition',
          active
            ? 'border-l-black bg-white/35 text-black'
            : cursor
              ? 'border-l-transparent bg-white/20 text-black'
              : 'border-l-transparent text-black/75 hover:bg-white/20',
        )}
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white/25">
          <User className="h-4 w-4 text-black/45" strokeWidth={1.5} />
          {student.has_unread_from_student && (
            <span aria-label="Unread message" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-[#c3cace]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold">{student.display_name?.trim() || 'Unnamed'}</span>
            {student.assignments_total > 0 && (
              <span className="shrink-0 text-xs font-semibold tabular-nums text-black/50">
                {student.assignments_completed}/{student.assignments_total}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-black/45">
            <span className="truncate">{student.email || 'No email'}</span>
            <span className="h-1 w-1 rounded-full bg-black/25" />
            <span className="shrink-0">{lastSeen}</span>
          </div>
        </div>
      </button>
    </li>
  );
}
