import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentAssignments, useStudentTAAssignments } from '@/hooks/useStudentAssignments';
import { listAssignmentsForStudent as listGuidedForStudent, type GuidedDrill, type GuidedDrillAssignment } from '@/lib/guidedDrills';
import { listStudentAssignments as listActivityForStudent } from '@/features/activity-centre/api/activitiesClient';

/**
 * A unified read-only "assigned" row surfaced in the student's Today list.
 * Status is derived from the underlying source row so completing work on the
 * assignment page reflects here without any extra plumbing.
 */
export interface AssignedTodoRow {
  key: string;
  kind: 'homework' | 'ta' | 'activity' | 'guided';
  refId: string;
  title: string;
  subtitle: string;
  status: 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  route: string;
}

type GuidedRow = GuidedDrillAssignment & { guided_drill: GuidedDrill };

function normalizeStatus(raw: string | null | undefined): AssignedTodoRow['status'] {
  if (raw === 'completed') return 'completed';
  if (raw === 'assigned') return 'assigned';
  return 'in_progress';
}

/**
 * Merges homework, TA, activity, and guided-drill assignments into one list of
 * virtual todo rows. Empty and cheap when the student has none.
 */
export function useAssignedTodoFeed(): {
  rows: AssignedTodoRow[];
  loading: boolean;
} {
  const { user } = useAuth();
  const { assignments: hw, loading: hwLoading } = useStudentAssignments();
  const { assignments: ta, loading: taLoading } = useStudentTAAssignments();

  const { data: guided = [], isLoading: guidedLoading } = useQuery<GuidedRow[]>({
    queryKey: ['todo-feed:guided', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => (await listGuidedForStudent(user!.id)) as GuidedRow[],
  });

  const { data: activities = [], isLoading: actLoading } = useQuery({
    queryKey: ['todo-feed:activity', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => listActivityForStudent(user!.id),
  });

  const rows = useMemo<AssignedTodoRow[]>(() => {
    const out: AssignedTodoRow[] = [];
    for (const a of hw) {
      out.push({
        key: `hw-${a.id}`,
        kind: 'homework',
        refId: a.id,
        title: a.set_title || 'Homework',
        subtitle: `${a.question_qids?.length ?? 0} questions${a.score != null ? ` · ${Math.round(a.score)}%` : ''}`,
        status: normalizeStatus(a.status),
        createdAt: a.created_at,
        route: `/classroom/${encodeURIComponent(a.id)}`,
      });
    }
    for (const a of ta) {
      out.push({
        key: `ta-${a.id}`,
        kind: 'ta',
        refId: a.id,
        title: a.title || 'From Joshua',
        subtitle: a.pdf_url ? 'PDF attached' : 'TA assignment',
        status: a.status === 'viewed' ? 'in_progress' : normalizeStatus(a.status),
        createdAt: a.assigned_at,
        route: `/classroom/ta/${encodeURIComponent(a.id)}`,
      });
    }
    for (const g of guided) {
      out.push({
        key: `g-${g.id}`,
        kind: 'guided',
        refId: g.id,
        title: g.guided_drill?.title || 'Guided drill',
        subtitle: `${g.guided_drill?.question_count ?? '?'} questions${g.guided_drill?.estimated_minutes ? ` · ${g.guided_drill.estimated_minutes} min` : ''}`,
        status: g.status === 'completed' ? 'completed' : g.status === 'assigned' ? 'assigned' : 'in_progress',
        createdAt: g.assigned_at,
        route: `/guided/${encodeURIComponent(g.id)}?returnTo=${encodeURIComponent('/schedule')}`,
      });
    }
    for (const a of activities) {
      out.push({
        key: `act-${a.id}`,
        kind: 'activity',
        refId: a.id,
        title: a.title || 'Activity',
        subtitle: a.subtitle || 'Activity',
        status: normalizeStatus(a.status),
        createdAt: a.created_at,
        route: `/activities/${encodeURIComponent(a.id)}`,
      });
    }
    // Open work first, then completed; newest within each bucket.
    out.sort((x, y) => {
      const s = (x.status === 'completed' ? 1 : 0) - (y.status === 'completed' ? 1 : 0);
      if (s !== 0) return s;
      return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
    });
    return out;
  }, [hw, ta, guided, activities]);

  return {
    rows,
    loading: hwLoading || taLoading || guidedLoading || actLoading,
  };
}
