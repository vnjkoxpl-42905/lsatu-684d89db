import { useMemo, useState } from 'react';
import {
  BookOpen,
  Flame,
  GraduationCap,
  Megaphone,
  Sparkles,
  StickyNote,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudentClassroomItems } from '@/hooks/useClassroomItems';
import { useHubStudents } from '@/hooks/useHubStudents';
import { classifyItem, type AssignmentState } from '@/lib/assignmentGroups';
import { resolveItemRoute } from '@/lib/classroomItems';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { formatRelativeShort } from '@/lib/time';
import { cn } from '@/lib/utils';
import StudentAssignmentDetail from '@/components/teacher/StudentAssignmentDetail';
import { DeskStudentPicker } from './DeskStudentPicker';

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
  activity: GraduationCap,
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
  activity: 'Activity',
};

const STATE_TONE: Record<AssignmentState, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-700', label: 'Completed' },
  in_progress: { bg: 'bg-sky-500/15', text: 'text-sky-700', label: 'In progress' },
  stuck: { bg: 'bg-rose-500/15', text: 'text-rose-700', label: 'Stuck' },
  not_started: { bg: 'bg-black/8', text: 'text-black/60', label: 'Not started' },
};

export function DeskLibraryAssignmentsSurface() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const { rows: students } = useHubStudents();
  const student = students.find((s) => s.class_id === studentId) ?? null;
  const { data: items = [], isLoading } = useStudentClassroomItems(studentId);
  const [openItem, setOpenItem] = useState<ClassroomItem | null>(null);
  const navigate = useNavigate();

  const visible = useMemo(
    () => items.filter((i) => i.status !== 'archived'),
    [items],
  );

  return (
    <div className="flex h-full w-full">
      <DeskStudentPicker selectedId={studentId} onSelect={setStudentId} />
      <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-black">Assignments</h2>
            <p className="text-xs text-black/55">
              {student
                ? `Everything currently assigned to ${student.display_name?.trim() || 'this student'}.`
                : 'Pick a student to see their assignments.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/teacher?ws=library&tab=bootcamps')}
            className="inline-flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/30"
          >
            New assignment
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!studentId ? (
            <EmptyHint>Pick a student on the left.</EmptyHint>
          ) : isLoading ? (
            <div className="text-xs text-black/45">Loading…</div>
          ) : visible.length === 0 ? (
            <EmptyHint>No active assignments yet for this student.</EmptyHint>
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => (
                <AssignmentRow
                  key={item.id}
                  item={item}
                  onOpen={() => setOpenItem(item)}
                />
              ))}
            </ul>
          )}
        </div>

        <StudentAssignmentDetail
          item={openItem}
          student={student}
          onClose={() => setOpenItem(null)}
        />
      </section>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-black/45">
      {children}
    </div>
  );
}

function AssignmentRow({ item, onOpen }: { item: ClassroomItem; onOpen: () => void }) {
  const Icon = TYPE_ICONS[item.type];
  const state = classifyItem(item);
  const tone = STATE_TONE[state];
  const route = resolveItemRoute(item);
  return (
    <li className="flex items-center gap-3 border border-black/12 bg-white/35 px-4 py-3 transition hover:border-black/30 hover:bg-white/55">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-black/10 bg-white/40">
          <Icon className="h-4 w-4 text-black/60" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-black">{item.title}</span>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', tone.bg, tone.text)}>
              {tone.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-black/45">
            <span>{TYPE_LABELS[item.type]}</span>
            <span className="h-1 w-1 rounded-full bg-black/25" />
            <span>{formatRelativeShort(item.updated_at) || 'just now'}</span>
          </div>
        </div>
      </button>
      {route && (
        <a
          href={route}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 border border-black/12 p-1.5 text-black/55 transition hover:border-black/35 hover:text-black"
          title="Open student view"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
        </a>
      )}
    </li>
  );
}

export default DeskLibraryAssignmentsSurface;
