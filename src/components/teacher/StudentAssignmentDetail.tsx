import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Mail, User, Calendar, BookOpen, Flame, FileText, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import type { HubStudentRow } from '@/hooks/useHubStudents';
import {
  bootcampProgressByDay,
  classifyItem,
  type AssignmentState,
  type DayProgress,
} from '@/lib/assignmentGroups';
import { resolveItemRoute } from '@/lib/classroomItems';
import { formatRelativeShort } from '@/lib/time';
import { cn } from '@/lib/utils';

// Item D — per-student assignment detail. Opens as a right-side Sheet.
// For bootcamp items: renders the day-by-day grid sourced from
// metadata_json.progress.completedDays + assigned_day_ids. For other
// types: header + status, with the route into the source surface.

interface Props {
  item: ClassroomItem | null;
  student: HubStudentRow | null;
  onClose: () => void;
}

const STATE_TONE: Record<AssignmentState, { bg: string; text: string; ring: string; label: string }> = {
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', ring: 'ring-emerald-400/40', label: 'Completed' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-300', ring: 'ring-blue-400/40', label: 'In progress' },
  stuck: { bg: 'bg-rose-500/15', text: 'text-rose-300', ring: 'ring-rose-400/40', label: 'Stuck' },
  not_started: { bg: 'bg-zinc-700/40', text: 'text-zinc-300', ring: 'ring-zinc-500/30', label: 'Not started' },
};

export default function StudentAssignmentDetail({ item, student, onClose }: Props) {
  const open = !!item;
  const state: AssignmentState = item ? classifyItem(item) : 'not_started';
  const tone = STATE_TONE[state];

  const bootcampId = item ? readBootcampId(item) : null;
  const dayProgress: DayProgress[] = useMemo(() => {
    if (!item || !bootcampId) return [];
    return bootcampProgressByDay(item, bootcampId);
  }, [item, bootcampId]);

  const lastTouchedIso = item ? readLastTouched(item) : null;
  const route = item ? resolveItemRoute(item) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        {item && (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium text-zinc-100">
                  {student?.display_name?.trim() || 'Student'}
                </span>
                {student?.email && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{student.email}</span>
                  </>
                )}
              </div>
              <SheetTitle className="flex items-center gap-2 text-base">
                <TypeIcon type={item.type} />
                <span className="truncate">{item.title}</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-500">
                {scheduleDescription(item)}
              </SheetDescription>
            </SheetHeader>

            <section className="mt-4">
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ring-1',
                  tone.bg,
                  tone.text,
                  tone.ring,
                )}
              >
                {tone.label}
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">
                {lastTouchedIso
                  ? `Last activity ${formatRelativeShort(lastTouchedIso)}`
                  : 'No activity yet.'}
              </div>
            </section>

            {bootcampId ? (
              <DayGrid days={dayProgress} />
            ) : (
              <NonBootcampDetail item={item} />
            )}

            <section className="mt-6 pt-4 border-t border-zinc-800 space-y-2">
              {route && (
                <Link
                  to={route}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100"
                >
                  Open student's view <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TypeIcon({ type }: { type: ClassroomItem['type'] }) {
  if (type === 'bootcamp_module') return <Flame className="w-4 h-4 text-amber-300" aria-hidden />;
  if (type === 'homework') return <BookOpen className="w-4 h-4 text-zinc-300" aria-hidden />;
  return <FileText className="w-4 h-4 text-zinc-300" aria-hidden />;
}

function scheduleDescription(item: ClassroomItem): string {
  const parts: string[] = [];
  if (item.unlock_at) parts.push(`Unlocks ${format(new Date(item.unlock_at), 'MMM d')}`);
  if (item.due_at) parts.push(`Due ${format(new Date(item.due_at), 'MMM d')}`);
  if (parts.length === 0) parts.push('No schedule set');
  return parts.join(' · ');
}

function DayGrid({ days }: { days: DayProgress[] }) {
  if (days.length === 0) return null;
  const assigned = days.filter((d) => d.state !== 'not_assigned');
  const done = assigned.filter((d) => d.state === 'done').length;
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
          Day-by-day
        </h3>
        <span className="text-[11px] text-zinc-400 tabular-nums">
          {done} of {assigned.length} assigned days complete
        </span>
      </div>
      <ul className="space-y-1.5">
        {days.map((d) => (
          <li
            key={d.day}
            className={cn(
              'flex items-center gap-2.5 rounded-md border px-2.5 py-1.5',
              d.state === 'done' && 'border-emerald-500/30 bg-emerald-500/5',
              d.state === 'in_progress' && 'border-blue-500/30 bg-blue-500/5',
              d.state === 'untouched' && 'border-zinc-800 bg-zinc-900/30',
              d.state === 'not_assigned' && 'border-zinc-800/50 bg-transparent opacity-50',
            )}
          >
            <DayGlyph state={d.state} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-zinc-100 tabular-nums">
                  Day {d.day}
                </span>
                <span className="text-[11px] text-zinc-400">{d.label}</span>
              </div>
              <div className="text-[11px] text-zinc-500 truncate">{d.focus}</div>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {d.state === 'done' && 'Done'}
              {d.state === 'in_progress' && 'Active'}
              {d.state === 'untouched' && 'Untouched'}
              {d.state === 'not_assigned' && 'Not assigned'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DayGlyph({ state }: { state: DayProgress['state'] }) {
  if (state === 'done') {
    return (
      <span className="w-5 h-5 rounded-full bg-emerald-500/80 inline-flex items-center justify-center text-[10px] text-emerald-50 font-bold">
        ✓
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span className="w-5 h-5 rounded-full ring-2 ring-blue-400/70 inline-flex items-center justify-center text-[10px] text-blue-200 font-bold">
        ◐
      </span>
    );
  }
  if (state === 'not_assigned') {
    return <span className="w-5 h-5 rounded-full bg-zinc-800/50" />;
  }
  return <span className="w-5 h-5 rounded-full ring-1 ring-zinc-700" />;
}

function NonBootcampDetail({ item }: { item: ClassroomItem }) {
  return (
    <section className="mt-5 space-y-3">
      {item.description && (
        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{item.description}</p>
      )}
      <div className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
        <Calendar className="w-3 h-3" />
        Created {formatRelativeShort(item.created_at)}
      </div>
    </section>
  );
}

function readBootcampId(item: ClassroomItem): string | null {
  if (item.type !== 'bootcamp_module') return null;
  const meta = (item.metadata_json ?? {}) as { bootcamp_id?: string };
  return meta.bootcamp_id ?? null;
}

function readLastTouched(item: ClassroomItem): string | null {
  const meta = (item.metadata_json ?? {}) as { progress?: { lastDayAt?: string } };
  return meta.progress?.lastDayAt ?? item.updated_at ?? null;
}
