import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeacherTodoDismissal {
  source_kind: string;
  source_id: string;
  dismissed_at: string;
  expires_at: string | null;
}

interface SupabaseResult<T> {
  data: T | null;
  error: Error | null;
}

interface DismissalsSelectBuilder extends PromiseLike<SupabaseResult<TeacherTodoDismissal[]>> {
  select(columns: string): DismissalsSelectBuilder;
  eq(column: string, value: string): DismissalsSelectBuilder;
  or(filter: string): DismissalsSelectBuilder;
}

interface DismissalsTable {
  select(columns: string): DismissalsSelectBuilder;
  upsert(
    value: Record<string, unknown>,
    options: { onConflict: string },
  ): PromiseLike<{ error: Error | null }>;
}

const todoDismissalsTable = () =>
  (supabase as unknown as { from: (table: string) => DismissalsTable }).from('teacher_todo_dismissals');

export const teacherTodoDismissalsQueryKey = (adminId: string | undefined) => ['teacher-todo-dismissals', adminId] as const;

export function useTeacherTodoDismissals() {
  const { user } = useAuth();
  return useQuery<TeacherTodoDismissal[]>({
    queryKey: teacherTodoDismissalsQueryKey(user?.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await todoDismissalsTable()
        .select('source_kind,source_id,dismissed_at,expires_at')
        .eq('admin_user_id', user!.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      if (error) throw error;
      return (data ?? []) as TeacherTodoDismissal[];
    },
  });
}

/**
 * Dismiss a to-do outside React Query, for callers (like the assignment offer
 * card in chat) that act on an item without owning the queue.
 */
export async function dismissTeacherTodo(input: {
  adminUserId: string;
  sourceKind: string;
  sourceId: string;
  expiresAt?: string | null;
}) {
  const { error } = await todoDismissalsTable().upsert(
    {
      admin_user_id: input.adminUserId,
      source_kind: input.sourceKind,
      source_id: input.sourceId,
      expires_at: input.expiresAt ?? null,
      dismissed_at: new Date().toISOString(),
    },
    { onConflict: 'admin_user_id,source_kind,source_id' },
  );
  if (error) throw error;
}


export function useDismissTeacherTodo() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sourceKind: string; sourceId: string; expiresAt?: string | null }) => {
      if (!user?.id) throw new Error('Sign in required');
      const { error } = await todoDismissalsTable().upsert(
        {
          admin_user_id: user.id,
          source_kind: input.sourceKind,
          source_id: input.sourceId,
          expires_at: input.expiresAt ?? null,
          dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'admin_user_id,source_kind,source_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      // Dismissals are the queue's only own query; the queue itself is derived,
      // so this one key is what makes the item disappear.
      qc.invalidateQueries({ queryKey: teacherTodoDismissalsQueryKey(user?.id) });
    },
  });
}
