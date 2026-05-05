import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import { ClassroomSection, EmptyHint } from './ClassroomSection';
import {
  useStudentAssignments,
  useStudentTAAssignments,
  type AssignmentStatus,
  type TAAssignmentStatus,
} from '@/hooks/useStudentAssignments';

const ACTION_BY_STATUS: Record<AssignmentStatus | TAAssignmentStatus, string> = {
  assigned: 'Start',
  in_progress: 'Continue',
  viewed: 'Continue',
  completed: 'Review',
};

export function AssignedWorkSection() {
  const navigate = useNavigate();
  const { assignments: hw, loading: hwLoading } = useStudentAssignments();
  const { assignments: ta, loading: taLoading } = useStudentTAAssignments();

  const loading = hwLoading || taLoading;
  const hasNone = !loading && hw.length === 0 && ta.length === 0;

  return (
    <ClassroomSection title="Assigned work">
      {loading ? (
        <EmptyHint>Loading assigned work…</EmptyHint>
      ) : hasNone ? (
        <EmptyHint>No assigned drills or homework right now.</EmptyHint>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {hw.map((a) => (
            <button
              key={`hw-${a.id}`}
              type="button"
              onClick={() => navigate(`/classroom/${encodeURIComponent(a.id)}`)}
              className="group flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 hover:border-border transition-colors text-left"
            >
              <ClipboardList className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.set_title || 'Homework'}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {a.question_qids?.length ?? 0} questions
                  {a.score != null ? ` · ${a.score}%` : ''}
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 mt-1">
                {a.status.replace('_', ' ')}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
          {ta.map((a) => (
            <button
              key={`ta-${a.id}`}
              type="button"
              onClick={() => navigate(`/classroom/ta/${encodeURIComponent(a.id)}`)}
              className="group flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 hover:border-border transition-colors text-left"
            >
              <Sparkles className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.title || 'TA assignment'}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {a.pdf_url ? 'PDF attached' : 'From Joshua'}
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 mt-1">
                {a.status}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </ClassroomSection>
  );
}

export { ACTION_BY_STATUS };
