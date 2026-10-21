import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  FileText,
  Trash2,
  Megaphone,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatRelativeShort } from '@/lib/time';
import {
  useAdminTAAssignmentsForStudent,
  type StudentTAAssignment,
} from '@/hooks/useStudentAssignments';
import { useStudentClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface Props {
  studentId: string;
}

interface HomeworkRow {
  id: string;
  set_title: string;
  status: 'assigned' | 'in_progress' | 'completed';
  score: number | null;
  created_at: string;
  completed_at: string | null;
  question_qids: string[] | null;
}

const HW_STATUS_ICON = {
  assigned: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
};

const TA_STATUS_ICON = {
  assigned: Circle,
  viewed: PlayCircle,
  completed: CheckCircle2,
};

type PendingDelete =
  | { kind: 'homework'; id: string; title: string }
  | { kind: 'ta'; id: string; title: string }
  | { kind: 'classroom'; id: string; title: string };

/**
 * Center-panel "Assignments" tab. Real homework_assignments + ta_assignments
 * + classroom_items (posts/bootcamps) for the selected student. Admins can
 * unassign / delete each row, which removes it from the student's view.
 */
export default function HubAssignments({ studentId }: Props) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: homework, isLoading: hwLoading, isError: hwError, refetch: refetchHomework } = useQuery<HomeworkRow[]>({
    queryKey: ['hub-homework', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework_assignments')
        .select('id, set_title, status, score, created_at, completed_at, question_qids')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as HomeworkRow[];
    },
  });

  const { assignments: taAssignments, loading: taLoading, error: taError, refresh: refreshTA } =
    useAdminTAAssignmentsForStudent(studentId);

  const { data: classroomItems, isLoading: ciLoading, isError: ciError, refetch: refetchItems } =
    useStudentClassroomItems(studentId);
  const failedSources = [hwError && 'homework', taError && 'TA assignments', ciError && 'posts and bootcamps']
    .filter((source): source is string => typeof source === 'string');

  const posts = (classroomItems ?? []).filter(
    (i) => i.type !== 'drill' && i.type !== 'homework',
  );

  const hasAny =
    (homework?.length ?? 0) > 0 ||
    taAssignments.length > 0 ||
    posts.length > 0;

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      let error: { message: string } | null = null;
      if (pending.kind === 'homework') {
        const r = await supabase
          .from('homework_assignments')
          .delete()
          .eq('id', pending.id);
        error = r.error;
        if (!error) await qc.invalidateQueries({ queryKey: ['hub-homework', studentId] });
      } else if (pending.kind === 'ta') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await supabase
          .from('ta_assignments')
          .delete()
          .eq('id', pending.id);
        error = r.error;
        if (!error) await refreshTA();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await supabase
          .from('classroom_items')
          .delete()
          .eq('id', pending.id);
        error = r.error;
        if (!error)
          await qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      }
      if (error) {
        console.error('[hub:assignments:delete] failed', error);
        toast.error('Could not unassign', { description: error.message });
      } else {
        toast.success('Removed from student');
        setPending(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (!hwLoading && !taLoading && !ciLoading && !hasAny && failedSources.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-6 py-12">
        <div className="max-w-sm space-y-2">
          <GraduationCap className="w-6 h-6 text-muted-foreground/70 mx-auto" />
          <div className="text-sm font-medium">No homework, TA assignments, or classroom posts yet</div>
          <p className="text-xs text-muted-foreground">
            Homework, bootcamps, and posts you assign will show up here so you
            can edit or unassign them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {failedSources.length > 0 && (
        <div role="alert" className="text-xs text-destructive">
          Could not confirm {failedSources.join(', ')}. This list may be incomplete.
          <button type="button" className="ml-2 underline" onClick={() => { void refetchHomework(); void refreshTA(); void refetchItems(); }}>Try again</button>
        </div>
      )}
      <Section
        title="Homework"
        icon={GraduationCap}
        loading={hwLoading}
        error={hwError}
        empty={!hwLoading && (homework?.length ?? 0) === 0}
      >
        {homework?.map((h) => {
          const Icon = HW_STATUS_ICON[h.status];
          const total = Array.isArray(h.question_qids) ? h.question_qids.length : null;
          return (
            <Row
              key={h.id}
              title={h.set_title || 'Untitled set'}
              status={h.status}
              meta={[
                total ? `${total} questions` : null,
                h.score != null ? `${h.score}% score` : null,
                h.completed_at
                  ? `Completed ${formatRelativeShort(h.completed_at)}`
                  : `Assigned ${formatRelativeShort(h.created_at)}`,
              ]
                .filter((x): x is string => !!x)
                .join(' · ')}
              Icon={Icon}
              onDelete={() =>
                setPending({
                  kind: 'homework',
                  id: h.id,
                  title: h.set_title || 'this homework',
                })
              }
            />
          );
        })}
      </Section>

      <Section
        title="TA assignments"
        icon={Sparkles}
        loading={taLoading}
        error={!!taError}
        empty={!taLoading && taAssignments.length === 0}
      >
        {taAssignments.map((a: StudentTAAssignment) => {
          const Icon = TA_STATUS_ICON[a.status];
          return (
            <Row
              key={a.id}
              title={a.title || 'Untitled assignment'}
              status={a.status}
              meta={[
                a.completed_at
                  ? `Completed ${formatRelativeShort(a.completed_at)}`
                  : a.viewed_at
                    ? `Viewed ${formatRelativeShort(a.viewed_at)}`
                    : `Assigned ${formatRelativeShort(a.assigned_at)}`,
                a.pdf_url ? 'PDF attached' : null,
              ]
                .filter((x): x is string => !!x)
                .join(' · ')}
              Icon={a.pdf_url ? FileText : Icon}
              onDelete={() =>
                setPending({
                  kind: 'ta',
                  id: a.id,
                  title: a.title || 'this TA assignment',
                })
              }
            />
          );
        })}
      </Section>

      <Section
        title="Posts & bootcamps"
        icon={Megaphone}
        loading={ciLoading}
        error={ciError}
        empty={!ciLoading && posts.length === 0}
      >
        {posts.map((it: ClassroomItem) => {
          const Icon = it.type === 'bootcamp_module' ? BookOpen : Megaphone;
          return (
            <Row
              key={it.id}
              title={it.title || 'Untitled'}
              status={it.status}
              meta={[
                labelForType(it.type),
                it.visible_to_student ? null : 'hidden',
                `Created ${formatRelativeShort(it.created_at)}`,
              ]
                .filter((x): x is string => !!x)
                .join(' · ')}
              Icon={Icon}
              onDelete={() =>
                setPending({
                  kind: 'classroom',
                  id: it.id,
                  title: it.title || 'this item',
                })
              }
            />
          );
        })}
      </Section>

      <AlertDialog
        open={!!pending}
        onOpenChange={(o) => !o && !deleting && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign from student?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `"${pending.title}" will be removed from the student's view immediately. This can't be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDelete();
                }}
              >
                {deleting ? 'Removing…' : 'Unassign'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function labelForType(t: ClassroomItem['type']): string {
  switch (t) {
    case 'bootcamp_module':
      return 'Bootcamp';
    case 'announcement':
      return 'Announcement';
    case 'note':
      return 'Note';
    case 'session_recap':
      return 'Session recap';
    case 'smartboard_recap':
      return 'Smartboard recap';
    case 'upload_summary':
      return 'Upload summary';
    case 'weekly_plan_task':
      return 'Weekly plan';
    default:
      return t;
  }
}

function Section({
  title,
  icon: HeaderIcon,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  error: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <HeaderIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {title}
        </h3>
      </div>
      <div className="space-y-1.5">
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : empty && error ? (
          <div className="text-xs text-destructive">Could not confirm this source.</div>
        ) : empty ? (
          <div className="text-xs text-muted-foreground italic">None.</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Row({
  title,
  status,
  meta,
  Icon,
  onDelete,
}: {
  title: string;
  status: string;
  meta: string;
  Icon: React.ComponentType<{ className?: string }>;
  onDelete?: () => void;
}) {
  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-card/40">
      <Icon
        className={
          status === 'completed'
            ? 'w-4 h-4 text-emerald-500 mt-0.5 shrink-0'
            : status === 'in_progress' || status === 'viewed'
              ? 'w-4 h-4 text-blue-500 mt-0.5 shrink-0'
              : 'w-4 h-4 text-muted-foreground mt-0.5 shrink-0'
        }
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{title}</div>
        {meta && (
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{meta}</div>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 mt-1">
        {status.replace('_', ' ')}
      </span>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Unassign ${title}`}
          className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
