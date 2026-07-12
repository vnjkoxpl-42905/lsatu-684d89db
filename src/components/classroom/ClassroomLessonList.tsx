import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileUp,
  Lock,
  Megaphone,
  NotebookTabs,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import {
  useStudentAssignments,
  useStudentTAAssignments,
  type StudentAssignment,
  type StudentTAAssignment,
} from '@/hooks/useStudentAssignments';
import { useCurrentWeeklyPlan, type WeeklyPlanItem } from '@/hooks/useWeeklyPlan';
import {
  listAssignmentsForStudent,
  type GuidedDrill,
  type GuidedDrillAssignment,
} from '@/lib/guidedDrills';
import { resolveItemRoute } from '@/lib/classroomItems';
import { cn } from '@/lib/utils';

export type ClassroomSectionId =
  | 'curriculum'
  | 'bootcamps'
  | 'recaps'
  | 'assigned-work'
  | 'upload-work'
  | 'announcements';

export type ClassroomListItem =
  | {
      id: string;
      title: string;
      description?: string | null;
      date?: string | null;
      status?: string | null;
      kind: string;
      route?: string;
      locked?: boolean;
      classroomItem: ClassroomItem;
    }
  | {
      id: string;
      title: string;
      description?: string | null;
      date?: string | null;
      status?: string | null;
      kind: string;
      route?: string;
      locked?: boolean;
      weeklyPlanItem?: WeeklyPlanItem;
      assignment?: StudentAssignment;
      taAssignment?: StudentTAAssignment;
      guidedAssignment?: GuidedAssignmentWithDrill;
    };

type GuidedAssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

interface Props {
  selectedSection: ClassroomSectionId;
  selectedItemId: string | null;
  onSelectItem: (item: ClassroomListItem) => void;
}

const SECTION_LABEL: Record<ClassroomSectionId, string> = {
  curriculum: 'This Week',
  bootcamps: 'Bootcamps',
  recaps: 'Session Recaps',
  'assigned-work': 'Assigned Work',
  'upload-work': 'Upload Work',
  announcements: 'Announcements',
};

const EMPTY_COPY: Record<ClassroomSectionId, string> = {
  curriculum: 'No published plan yet. Check back after Joshua publishes one.',
  bootcamps: 'No active bootcamps right now.',
  recaps: 'Recaps from sessions with Joshua will show up here.',
  'assigned-work': 'No assigned drills or homework right now.',
  'upload-work': 'Upload a PDF or screenshot of work done outside LSAT U.',
  announcements: 'No new posts from Joshua right now.',
};

export function ClassroomLessonList({ selectedSection, selectedItemId, onSelectItem }: Props) {
  const { user } = useAuth();
  const { data: classroomItems = [], isLoading: itemsLoading } = useClassroomItems();
  const { data: weeklyPlan, isLoading: weeklyLoading } = useCurrentWeeklyPlan();
  const { assignments: homework, loading: homeworkLoading } = useStudentAssignments();
  const { assignments: taAssignments, loading: taLoading } = useStudentTAAssignments();
  const { data: guided = [], isLoading: guidedLoading } = useQuery<GuidedAssignmentWithDrill[]>({
    queryKey: ['guided-drill-assignments', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => (await listAssignmentsForStudent(user!.id)) as GuidedAssignmentWithDrill[],
  });

  const rows = useMemo(() => {
    const activeClassroomItems = classroomItems.filter((item) => item.status !== 'archived');
    const today = startOfDay(new Date());

    if (selectedSection === 'curriculum') {
      return (weeklyPlan?.items ?? []).map<ClassroomListItem>((item) => {
        const locked = item.unlock_at ? new Date(item.unlock_at) > new Date() : false;
        const linked = item.classroom_item_id
          ? classroomItems.find((classroomItem) => classroomItem.id === item.classroom_item_id)
          : null;
        return {
          id: `weekly-${item.id}`,
          title: item.title,
          description: item.instructions,
          date: item.day_date,
          status: isBefore(parseISO(item.day_date), today) && item.status !== 'completed'
            ? 'Past'
            : item.status.replace(/_/g, ' '),
          kind: item.estimated_minutes ? `${item.estimated_minutes} min` : 'Weekly plan',
          route: linked ? resolveItemRoute(linked) ?? undefined : undefined,
          locked,
          weeklyPlanItem: item,
          ...(linked ? { classroomItem: linked } : {}),
        } as ClassroomListItem;
      });
    }

    if (selectedSection === 'bootcamps') {
      return activeClassroomItems
        .filter((item) => item.type === 'bootcamp_module' && item.status !== 'completed')
        .map<ClassroomListItem>((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          date: item.unlock_at ?? item.created_at,
          status: item.status.replace(/_/g, ' '),
          kind: 'Bootcamp',
          route: resolveItemRoute(item) ?? undefined,
          classroomItem: item,
        }));
    }

    if (selectedSection === 'recaps') {
      return activeClassroomItems
        .filter((item) => item.type === 'session_recap' || item.type === 'smartboard_recap')
        .map<ClassroomListItem>((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          date: item.created_at,
          status: 'Posted',
          kind: item.type === 'smartboard_recap' ? 'Smartboard recap' : 'Session recap',
          classroomItem: item,
        }));
    }

    if (selectedSection === 'assigned-work') {
      const guidedRows = guided.map<ClassroomListItem>((assignment) => ({
        id: `guided-${assignment.id}`,
        title: assignment.guided_drill?.title || 'Guided drill',
        description: assignment.guided_drill?.question_count
          ? `${assignment.guided_drill.question_count} questions`
          : 'Guided drill',
        date: assignment.scheduled_for ?? assignment.assigned_at,
        status: assignment.status === 'completed' ? 'Done' : assignment.status.replace(/_/g, ' '),
        kind: assignment.guided_drill?.estimated_minutes
          ? `${assignment.guided_drill.estimated_minutes} min`
          : 'Guided drill',
        route: `/guided/${encodeURIComponent(assignment.id)}?returnTo=${encodeURIComponent('/classroom')}`,
        locked: assignment.unlock_at ? new Date(assignment.unlock_at) > new Date() : false,
        guidedAssignment: assignment,
      }));
      const homeworkRows = homework.map<ClassroomListItem>((assignment) => ({
        id: `homework-${assignment.id}`,
        title: assignment.set_title || 'Homework',
        description: `${assignment.question_qids?.length ?? 0} questions`,
        date: assignment.created_at,
        status: assignment.status.replace(/_/g, ' '),
        kind: 'Homework',
        route: `/classroom/${encodeURIComponent(assignment.id)}`,
        assignment,
      }));
      const taRows = taAssignments.map<ClassroomListItem>((assignment) => ({
        id: `ta-${assignment.id}`,
        title: assignment.title || 'TA assignment',
        description: assignment.pdf_url ? 'PDF attached' : 'From Joshua',
        date: assignment.assigned_at,
        status: assignment.status === 'viewed' ? 'in progress' : assignment.status,
        kind: 'TA assignment',
        route: `/classroom/ta/${encodeURIComponent(assignment.id)}`,
        taAssignment: assignment,
      }));
      return [...guidedRows, ...homeworkRows, ...taRows].sort((a, b) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      });
    }

    if (selectedSection === 'upload-work') {
      return [
        {
          id: 'upload-work',
          title: 'Upload outside work',
          description: 'Send Joshua a screenshot, score report, or PDF from work done elsewhere.',
          status: 'Open',
          kind: 'Upload',
          route: '/classroom/uploads',
        },
      ] satisfies ClassroomListItem[];
    }

    return activeClassroomItems
      .filter((item) => item.type === 'announcement' || item.type === 'note')
      .map<ClassroomListItem>((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        date: item.created_at,
        status: 'Posted',
        kind: item.type === 'announcement' ? 'Announcement' : 'Note',
        classroomItem: item,
      }));
  }, [classroomItems, guided, homework, selectedSection, taAssignments, weeklyPlan]);

  const loading =
    selectedSection === 'curriculum'
      ? weeklyLoading
      : selectedSection === 'assigned-work'
        ? homeworkLoading || taLoading || guidedLoading
        : itemsLoading;

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border px-5 py-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Classroom
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{SECTION_LABEL[selectedSection]}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card/30 p-4">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="mt-3 h-3 w-1/2 rounded bg-muted/70 animate-pulse" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/30 px-4 py-5 text-sm text-muted-foreground">
            {EMPTY_COPY[selectedSection]}
          </div>
        ) : (
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id}>
                <LessonRow
                  item={row}
                  active={selectedItemId === row.id}
                  onSelect={() => onSelectItem(row)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function LessonRow({
  item,
  active,
  onSelect,
}: {
  item: ClassroomListItem;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = iconFor(item);
  const date = item.date ? format(new Date(item.date), 'MMM d, yyyy') : null;
  const done = item.status === 'completed' || item.status === 'Done';

  return (
    <button
      type="button"
      disabled={!!item.locked}
      onClick={onSelect}
      className={cn(
        'group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ease-out active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55',
        active ? 'bg-card text-foreground shadow-sm' : 'hover:bg-card/50',
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
        {item.locked ? (
          <Lock className="h-4 w-4" />
        ) : done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</div>
        {item.description && (
          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{item.kind}</span>
          {date && <span>{date}</span>}
          {item.status && <span className="capitalize">{item.status}</span>}
        </div>
      </div>
      {!item.locked && (
        <ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function iconFor(item: ClassroomListItem) {
  if ('classroomItem' in item && item.classroomItem) {
    if (item.classroomItem.type === 'bootcamp_module') return BookOpen;
    if (item.classroomItem.type === 'announcement' || item.classroomItem.type === 'note') return Megaphone;
    if (item.classroomItem.type === 'session_recap' || item.classroomItem.type === 'smartboard_recap') {
      return NotebookTabs;
    }
  }
  if (item.kind === 'Upload') return FileUp;
  if (item.kind === 'TA assignment') return Sparkles;
  if (item.kind === 'Homework' || item.kind === 'Guided drill') return ClipboardList;
  return Circle;
}
