import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AssignedTodoRow } from '@/hooks/useAssignedTodoFeed';

/**
 * Marking assigned work done.
 *
 * Finishing a bootcamp module (or any assignment whose progress lives outside
 * its assignment row) never wrote anything back to the row that put it on the
 * student's list, so the same item sat on Home for ever. The student can now
 * close it out explicitly: the source assignment and its classroom_items mirror
 * are both flipped to `completed`.
 *
 * Nothing is deleted. Progress rows, attempts and bootcamp state are untouched,
 * and the item keeps showing — as "completed" — in the classroom's Assigned
 * work panel. Only the "what to do next" surfaces stop counting it.
 */

/** Source tables that carry their own student-updatable `status` column. */
const STATUS_SOURCES = new Set([
  'homework_assignments',
  'ta_assignments',
  'guided_drill_assignments',
  'activity_assignments',
  'weekly_plan_items',
]);

export async function completeAssignedWork(
  row: Pick<AssignedTodoRow, 'sourceTable' | 'refId'>,
  studentId: string,
): Promise<void> {
  const nowIso = new Date().toISOString();

  if (STATUS_SOURCES.has(row.sourceTable)) {
    const { error } = await supabase
      .from(row.sourceTable as 'homework_assignments')
      .update({ status: 'completed' })
      .eq('id', row.refId)
      .eq('student_id', studentId);
    // A source row the student cannot update (or that no longer exists) must
    // not block the classroom_items mirror below, which is what the lists read.
    if (error) console.warn('[completeAssignedWork] source update failed', error.message);
  }

  const mirror = supabase
    .from('classroom_items')
    .update({ status: 'completed', completed_at: nowIso })
    .eq('student_id', studentId)
    .neq('status', 'completed');

  const { error: mirrorError } =
    row.sourceTable === 'classroom_items'
      ? await mirror.eq('id', row.refId)
      : await mirror.eq('source_table', row.sourceTable).eq('source_id', row.refId);

  if (mirrorError) throw mirrorError;
}

/** React-query wrapper: completes the row, then refreshes every assigned feed. */
export function useCompleteAssignedWork() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (row: Pick<AssignedTodoRow, 'sourceTable' | 'refId'>) => {
      if (!user) throw new Error('not signed in');
      await completeAssignedWork(row, user.id);
    },
    onSuccess: () => {
      for (const key of [
        ['classroom-items'],
        ['todo-feed:guided'],
        ['todo-feed:activity'],
        ['guided-drill-assignments'],
        ['student-assignments'],
        ['student-ta-assignments'],
        ['weekly-plan'],
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
