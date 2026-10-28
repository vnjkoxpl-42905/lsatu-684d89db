import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { WeeklyPlanItem } from '@/hooks/useWeeklyPlan';

/**
 * A student's interactive to-do item. Extends the plan-item shape with the
 * self-management fields added in the student_todo_selfmanage migration.
 */
export interface TodoItem extends WeeklyPlanItem {
  source: 'admin' | 'self';
  google_event_id: string | null;
}

export interface AddTaskInput {
  title: string;
  day_date: string; // yyyy-MM-dd
  instructions?: string | null;
  estimated_minutes?: number | null;
}

/**
 * Source of truth for the student's to-do list. Reads every weekly_plan_item the
 * student can see (admin-published plans + their durable personal plan) and
 * exposes optimistic mutations for check-off, move-day, add and delete. Realtime
 * keeps a second tab / device in sync. Errors surface as toasts, never swallowed.
 */
export function useStudentTodo(): {
  items: TodoItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  moveToDay: (id: string, day: string) => Promise<void>;
  addTask: (input: AddTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
} {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('weekly_plan_items')
      .select('*')
      .eq('student_id', user.id)
      .order('day_date', { ascending: true })
      .order('sort_order', { ascending: true });
    if (err) {
      console.error('[student-todo:list] failed', { userId: user.id, error: err });
      setError(err.message);
    } else {
      setItems((data ?? []) as unknown as TodoItem[]);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: any change to this student's items refreshes the list.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`student-todo-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_plan_items', filter: `student_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const toggleComplete = useCallback(
    async (id: string) => {
      const current = items.find((i) => i.id === id);
      if (!current) return;
      const next = current.status === 'completed' ? 'assigned' : 'completed';
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: next } : i)));
      const { error: err } = await supabase
        .from('weekly_plan_items')
        .update({ status: next })
        .eq('id', id);
      if (err) {
        console.error('[student-todo:toggle] failed', { id, error: err });
        toast.error('Could not update that task. Try again.');
        void refresh();
      }
    },
    [items, refresh],
  );

  const moveToDay = useCallback(
    async (id: string, day: string) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, day_date: day } : i)));
      const { error: err } = await supabase
        .from('weekly_plan_items')
        .update({ day_date: day })
        .eq('id', id);
      if (err) {
        console.error('[student-todo:move] failed', { id, day, error: err });
        toast.error('Could not move that task. Try again.');
        void refresh();
      }
    },
    [refresh],
  );

  const addTask = useCallback(
    async (input: AddTaskInput) => {
      if (!user) return;
      const title = input.title.trim();
      if (!title) return;
      // Resolve (or lazily create) the durable personal plan that hosts self tasks.
      const { data: planId, error: planErr } = await (supabase.rpc as any)('get_or_create_personal_plan', {
        p_student: user.id,
      });
      if (planErr || !planId) {
        console.error('[student-todo:add:plan] failed', { error: planErr });
        toast.error('Could not add that task. Try again.');
        return;
      }
      const { error: err } = await (supabase.from('weekly_plan_items') as any).insert({
        weekly_plan_id: planId as string,
        student_id: user.id,
        day_date: input.day_date,
        title,
        instructions: input.instructions ?? null,
        estimated_minutes: input.estimated_minutes ?? null,
        source: 'self',
        status: 'assigned',
      });
      if (err) {
        console.error('[student-todo:add] failed', { error: err });
        toast.error('Could not add that task. Try again.');
        return;
      }
      await refresh();
    },
    [user, refresh],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const prev = items;
      setItems((cur) => cur.filter((i) => i.id !== id));
      const { error: err } = await supabase.from('weekly_plan_items').delete().eq('id', id);
      if (err) {
        console.error('[student-todo:delete] failed', { id, error: err });
        toast.error('Could not delete that task. Try again.');
        setItems(prev);
      }
    },
    [items],
  );

  return { items, loading, error, refresh, toggleComplete, moveToDay, addTask, deleteTask };
}
