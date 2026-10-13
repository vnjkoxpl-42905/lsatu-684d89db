import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import {
  groupAssignments,
  type AssignmentGroup,
  type AssignmentGroupStats,
} from '@/lib/assignmentGroups';

// Item C — admin-scoped read across every classroom_items row this admin
// has created. Different from useStudentClassroomItems (single student)
// and useClassroomItems (signed-in student's own visible rows). RLS
// restricts to admin rows; we filter by created_by for safety even when
// an admin has multi-tenant visibility.

export interface UseAllClassroomItemsResult {
  items: ClassroomItem[];
  groups: AssignmentGroup[];
  totals: AssignmentGroupStats & { uniqueStudents: number };
  isLoading: boolean;
  error: unknown;
}

export function useAllClassroomItems(): UseAllClassroomItemsResult {
  const { user } = useAuth();
  const adminId = user?.id;

  const query = useQuery<ClassroomItem[]>({
    queryKey: ['classroom-items-by-admin', adminId],
    enabled: !!adminId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_items')
        .select('*')
        .eq('created_by', adminId!)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClassroomItem[];
    },
  });

  const items = query.data ?? [];

  return useMemo(() => {
    const groups = groupAssignments(items);
    const totals = groups.reduce<AssignmentGroupStats & { uniqueStudents: number }>(
      (acc, g) => {
        acc.total += g.stats.total;
        acc.notStarted += g.stats.notStarted;
        acc.inProgress += g.stats.inProgress;
        acc.completed += g.stats.completed;
        acc.stuck += g.stats.stuck;
        return acc;
      },
      { total: 0, notStarted: 0, inProgress: 0, completed: 0, stuck: 0, uniqueStudents: 0 },
    );
    totals.uniqueStudents = new Set(items.map((i) => i.student_id)).size;
    return {
      items,
      groups,
      totals,
      isLoading: query.isLoading,
      error: query.error,
    };
  }, [items, query.isLoading, query.error]);
}
