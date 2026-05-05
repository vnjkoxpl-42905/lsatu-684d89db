import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatRelativeShort } from '@/lib/time';
import { useAdminTAAssignmentsForStudent, type StudentTAAssignment } from '@/hooks/useStudentAssignments';

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

/**
 * Center-panel "Assignments" tab. Real homework_assignments + ta_assignments
 * for the selected student. Admin RLS allows direct reads.
 */
export default function HubAssignments({ studentId }: Props) {
  const { data: homework, isLoading: hwLoading } = useQuery<HomeworkRow[]>({
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

  const { assignments: taAssignments, loading: taLoading } =
    useAdminTAAssignmentsForStudent(studentId);

  const hasAny = (homework?.length ?? 0) > 0 || taAssignments.length > 0;

  if (!hwLoading && !taLoading && !hasAny) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-6 py-12">
        <div className="max-w-sm space-y-2">
          <GraduationCap className="w-6 h-6 text-muted-foreground/70 mx-auto" />
          <div className="text-sm font-medium">No assignments yet</div>
          <p className="text-xs text-muted-foreground">
            Homework drills and TA-generated assignments will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      <Section
        title="Homework"
        icon={GraduationCap}
        loading={hwLoading}
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
            />
          );
        })}
      </Section>

      <Section
        title="TA assignments"
        icon={Sparkles}
        loading={taLoading}
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
            />
          );
        })}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon: HeaderIcon,
  loading,
  empty,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
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
}: {
  title: string;
  status: string;
  meta: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-card/40">
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
    </div>
  );
}
