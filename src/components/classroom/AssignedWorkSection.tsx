import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import { ClassroomSection, EmptyHint } from './ClassroomSection';
import {
  useStudentAssignments,
  useStudentTAAssignments,
  type AssignmentStatus,
  type TAAssignmentStatus,
} from '@/hooks/useStudentAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { listAssignmentsForStudent, type GuidedDrill, type GuidedDrillAssignment } from '@/lib/guidedDrills';

type GuidedAssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

const ACTION_BY_STATUS: Record<AssignmentStatus | TAAssignmentStatus, string> = {
  assigned: 'Start',
  in_progress: 'Continue',
  viewed: 'Continue',
  completed: 'Review',
};

const STATUS_LABEL: Record<AssignmentStatus | TAAssignmentStatus, string> = {
  assigned: 'Not started',
  in_progress: 'In progress',
  viewed: 'In progress',
  completed: 'Done',
};

export function AssignedWorkSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assignments: hw, loading: hwLoading } = useStudentAssignments();
  const { assignments: ta, loading: taLoading } = useStudentTAAssignments();
  const { data: guided = [], isLoading: guidedLoading } = useQuery<GuidedAssignmentWithDrill[]>({
    queryKey: ['guided-drill-assignments', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => (
      await listAssignmentsForStudent(user!.id) as GuidedAssignmentWithDrill[]
    ),
  });

  const loading = hwLoading || taLoading || guidedLoading;
  const hasNone = !loading && hw.length === 0 && ta.length === 0 && guided.length === 0;

  return (
    <ClassroomSection title="Assigned work">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30">
              <div className="w-4 h-4 mt-0.5 shrink-0 rounded bg-muted animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 rounded bg-muted animate-pulse w-3/4" />
                <div className="h-2.5 rounded bg-muted/60 animate-pulse w-1/2" />
              </div>
              <div className="h-2.5 rounded bg-muted/60 animate-pulse w-14 mt-1 shrink-0" />
            </div>
          ))}
        </div>
      ) : hasNone ? (
        <EmptyHint>No assigned drills or homework right now.</EmptyHint>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {guided.map((a) => (
            <button
              key={`guided-${a.id}`}
              type="button"
              onClick={() => navigate(`/guided/${encodeURIComponent(a.id)}?returnTo=${encodeURIComponent('/classroom')}`)}
              className="group flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 hover:border-border transition ease-out active:scale-[0.98] text-left"
            >
              <ClipboardList className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.guided_drill?.title || 'Guided drill'}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {/*
                    A pinned or trimmed assignment is not the drill's own
                    length. Read the assignment first, or a five-question set
                    advertises itself as ten and the student stops trusting the
                    number.
                  */}
                  {a.question_qids?.length || a.question_count || a.guided_drill?.question_count || '?'} questions
                  {a.guided_drill?.estimated_minutes ? ` · ${a.guided_drill.estimated_minutes} min` : ''}
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 mt-1">
                {a.status === 'completed' ? 'Done' : a.status === 'assigned' ? 'Not started' : 'In progress'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
            </button>
          ))}
          {hw.map((a) => (
            <button
              key={`hw-${a.id}`}
              type="button"
              onClick={() => navigate(`/classroom/${encodeURIComponent(a.id)}`)}
              className="group flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 hover:border-border transition ease-out active:scale-[0.98] text-left"
            >
              <ClipboardList className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.set_title || 'Homework'}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {a.question_qids?.length ?? 0} questions
                  {a.score != null ? ` · ${Math.round(a.score)}%` : ''}
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 mt-1">
                {STATUS_LABEL[a.status] ?? 'Open'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
            </button>
          ))}
          {ta.map((a) => (
            <button
              key={`ta-${a.id}`}
              type="button"
              onClick={() => navigate(`/classroom/ta/${encodeURIComponent(a.id)}`)}
              className="group flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 hover:border-border transition ease-out active:scale-[0.98] text-left"
            >
              <Sparkles className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.title || 'TA assignment'}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {a.pdf_url ? 'PDF attached' : 'From Joshua'}
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 mt-1">
                {STATUS_LABEL[a.status] ?? 'Open'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
            </button>
          ))}
        </div>
      )}
    </ClassroomSection>
  );
}

export { ACTION_BY_STATUS };
