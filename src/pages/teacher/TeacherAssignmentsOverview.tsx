import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Flame,
  Megaphone,
  StickyNote,
  FileText,
  Sparkles,
} from 'lucide-react';
import { formatRelativeShort } from '@/lib/time';
import { useAllClassroomItems } from '@/hooks/useAllClassroomItems';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import { classifyItem, type AssignmentGroup, type AssignmentState } from '@/lib/assignmentGroups';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { bootcampDays } from '@/lib/bootcampDays';
import { cn } from '@/lib/utils';
import StudentAssignmentDetail from '@/components/teacher/StudentAssignmentDetail';

// Item C — roster-level overview. Each row groups all per-student
// classroom_items rows for a given (type, title, source). Inside the row
// is a strip of per-student pills; clicking one opens the detail sheet
// (Item D).

const TYPE_ICONS: Record<ClassroomItem['type'], React.ComponentType<{ className?: string }>> = {
  bootcamp_module: Flame,
  homework: BookOpen,
  announcement: Megaphone,
  note: StickyNote,
  session_recap: FileText,
  smartboard_recap: FileText,
  upload_summary: FileText,
  weekly_plan_task: FileText,
  drill: Sparkles,
};

const TYPE_LABELS: Record<ClassroomItem['type'], string> = {
  bootcamp_module: 'Bootcamp',
  homework: 'Homework',
  announcement: 'Announcement',
  note: 'Note',
  session_recap: 'Session recap',
  smartboard_recap: 'Smartboard recap',
  upload_summary: 'Upload summary',
  weekly_plan_task: 'Weekly plan',
  drill: 'Drill',
};

const STATE_TONE: Record<AssignmentState, { bg: string; ring: string; text: string; label: string }> = {
  completed: {
    bg: 'bg-emerald-500/15',
    ring: 'ring-emerald-400/40',
    text: 'text-emerald-300',
    label: 'Completed',
  },
  in_progress: {
    bg: 'bg-blue-500/15',
    ring: 'ring-blue-400/40',
    text: 'text-blue-300',
    label: 'In progress',
  },
  stuck: {
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-400/40',
    text: 'text-amber-300',
    label: 'Stuck',
  },
  not_started: {
    bg: 'bg-zinc-700/40',
    ring: 'ring-zinc-500/30',
    text: 'text-zinc-300',
    label: 'Not started',
  },
};

export default function TeacherAssignmentsOverview() {
  const { groups, totals, isLoading } = useAllClassroomItems();
  const { rows: students } = useHubStudents();
  const studentById = useMemo(() => {
    const m = new Map<string, HubStudentRow>();
    for (const s of students) m.set(s.class_id, s);
    return m;
  }, [students]);

  const [openSheet, setOpenSheet] = useState<{ item: ClassroomItem } | null>(null);

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 px-4 sm:px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 leading-tight">
            Assignments overview
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Every active assignment, grouped across students.
          </p>
        </div>
        <Link
          to="/teacher/library/assignments/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25"
        >
          <Plus className="w-3.5 h-3.5" /> New assignment
        </Link>
      </header>

      <RollupBar
        students={totals.uniqueStudents}
        completed={totals.completed}
        inProgress={totals.inProgress}
        stuck={totals.stuck}
        notStarted={totals.notStarted}
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3">
        {isLoading ? (
          <div className="text-xs text-zinc-500">Loading assignments…</div>
        ) : groups.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map((g) => (
            <GroupCard
              key={g.groupKey}
              group={g}
              studentById={studentById}
              onPillClick={(item) => setOpenSheet({ item })}
            />
          ))
        )}
      </div>

      <StudentAssignmentDetail
        item={openSheet?.item ?? null}
        student={openSheet ? studentById.get(openSheet.item.student_id) ?? null : null}
        onClose={() => setOpenSheet(null)}
      />
    </div>
  );
}

function RollupBar({
  students,
  completed,
  inProgress,
  stuck,
  notStarted,
}: {
  students: number;
  completed: number;
  inProgress: number;
  stuck: number;
  notStarted: number;
}) {
  const total = completed + inProgress + stuck + notStarted;
  return (
    <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-zinc-800/60 bg-zinc-950/60">
      <div className="flex items-center gap-5 flex-wrap text-xs">
        <Stat label="Students" value={students} icon={GraduationCap} />
        <span className="text-zinc-700">·</span>
        <Stat label="Items" value={total} />
        <Stat label="Completed" value={completed} tone="emerald" />
        <Stat label="In progress" value={inProgress} tone="blue" />
        <Stat label="Stuck" value={stuck} tone="amber" />
        <Stat label="Not started" value={notStarted} tone="slate" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: 'emerald' | 'blue' | 'amber' | 'slate';
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-300' :
    tone === 'blue' ? 'text-blue-300' :
    tone === 'amber' ? 'text-amber-300' :
    tone === 'slate' ? 'text-zinc-300' :
    'text-zinc-100';
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500 self-center" />}
      <span className={cn('font-semibold tabular-nums', toneClass)}>{value}</span>
      <span className="text-zinc-500">{label}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-12 text-center text-sm text-zinc-500">
      No assignments yet. Click <span className="text-zinc-300">New assignment</span> to create one.
    </div>
  );
}

function GroupCard({
  group,
  studentById,
  onPillClick,
}: {
  group: AssignmentGroup;
  studentById: Map<string, HubStudentRow>;
  onPillClick: (item: ClassroomItem) => void;
}) {
  const Icon = TYPE_ICONS[group.type];
  const typeLabel = TYPE_LABELS[group.type];
  const subtitle = useMemo(() => {
    if (group.type !== 'bootcamp_module') return null;
    const meta = (group.items[0]?.metadata_json ?? {}) as {
      assigned_day_ids?: number[];
      bootcamp_id?: string;
    };
    if (!meta.bootcamp_id) return null;
    const ids = meta.assigned_day_ids;
    if (!ids || ids.length === 0) return 'All days';
    const full = bootcampDays(meta.bootcamp_id)?.length ?? 0;
    if (ids.length === full) return 'All days';
    const sorted = [...ids].sort((a, b) => a - b);
    return contiguous(sorted)
      ? `Days ${sorted[0]}–${sorted[sorted.length - 1]}`
      : `${ids.length} days`;
  }, [group]);

  const items = useMemo(
    () => [...group.items].sort((a, b) => {
      const an = studentById.get(a.student_id)?.display_name ?? '';
      const bn = studentById.get(b.student_id)?.display_name ?? '';
      return an.localeCompare(bn);
    }),
    [group, studentById],
  );

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Icon className="w-3.5 h-3.5 text-zinc-400 self-center" />
            <span className="text-sm font-medium text-zinc-100 truncate">{group.title}</span>
            {subtitle && (
              <span className="text-[11px] text-zinc-400">· {subtitle}</span>
            )}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mt-0.5">
            {typeLabel} · {group.stats.total} {group.stats.total === 1 ? 'student' : 'students'}
            {' · '}created {formatRelativeShort(group.latestCreatedAt)}
          </div>
        </div>
        <ProgressBar stats={group.stats} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const student = studentById.get(item.student_id);
          const state = classifyItem(item);
          return (
            <StudentPill
              key={item.id}
              name={student?.display_name ?? null}
              email={student?.email ?? null}
              state={state}
              onClick={() => onPillClick(item)}
              progressMeta={
                item.type === 'bootcamp_module'
                  ? bootcampMetaFor(item)
                  : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function contiguous(sortedAsc: number[]): boolean {
  for (let i = 1; i < sortedAsc.length; i++) {
    if (sortedAsc[i] !== sortedAsc[i - 1] + 1) return false;
  }
  return true;
}

function bootcampMetaFor(item: ClassroomItem): { done: number; total: number } | null {
  const meta = (item.metadata_json ?? {}) as {
    bootcamp_id?: string;
    assigned_day_ids?: number[];
    progress?: { completedDays?: number[]; totalDays?: number };
  };
  const done = meta.progress?.completedDays?.length ?? 0;
  const assigned = meta.assigned_day_ids?.length;
  if (assigned) return { done, total: assigned };
  if (meta.bootcamp_id) {
    const full = bootcampDays(meta.bootcamp_id)?.length;
    if (full) return { done, total: full };
  }
  return null;
}

function ProgressBar({ stats }: { stats: AssignmentGroup['stats'] }) {
  const total = Math.max(stats.total, 1);
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
      <div className="flex h-1.5 w-32 rounded-full overflow-hidden bg-zinc-800">
        {stats.completed > 0 && (
          <div className="bg-emerald-400/70" style={{ width: seg(stats.completed) }} />
        )}
        {stats.inProgress > 0 && (
          <div className="bg-blue-400/70" style={{ width: seg(stats.inProgress) }} />
        )}
        {stats.stuck > 0 && (
          <div className="bg-amber-400/70" style={{ width: seg(stats.stuck) }} />
        )}
      </div>
      <div className="text-[10px] text-zinc-500 tabular-nums">
        {stats.completed} done · {stats.inProgress + stats.stuck} active
      </div>
    </div>
  );
}

function StudentPill({
  name,
  email,
  state,
  onClick,
  progressMeta,
}: {
  name: string | null;
  email: string | null;
  state: AssignmentState;
  onClick: () => void;
  progressMeta: { done: number; total: number } | null;
}) {
  const tone = STATE_TONE[state];
  const initials = initialsOf(name, email);
  const tooltip = [
    name ?? email ?? 'Student',
    tone.label,
    progressMeta ? `${progressMeta.done}/${progressMeta.total} days` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={cn(
        'h-7 min-w-[28px] px-2 rounded-md text-[11px] font-semibold tabular-nums ring-1 transition-colors',
        tone.bg,
        tone.ring,
        tone.text,
        'hover:brightness-110',
      )}
    >
      {initials}
    </button>
  );
}

function initialsOf(name: string | null, email: string | null): string {
  const source = (name ?? email ?? '').trim();
  if (!source) return '??';
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
