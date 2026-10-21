import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WeeklyPlan {
  id: string;
  student_id: string;
  created_by: string;
  title: string;
  week_start: string;
  week_end: string;
  status: 'draft' | 'published' | 'archived';
  ai_generated: boolean;
  rationale: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlanItem {
  id: string;
  weekly_plan_id: string;
  student_id: string;
  classroom_item_id: string | null;
  day_date: string;
  title: string;
  instructions: string | null;
  estimated_minutes: number | null;
  unlock_at: string | null;
  due_at: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped';
  sort_order: number;
  metadata_json: Record<string, unknown>;
}

/**
 * Returns the current published weekly plan for the signed-in student,
 * plus its items grouped by date. RLS restricts students to published.
 */
export function useCurrentWeeklyPlan() {
  const { user } = useAuth();
  return useQuery<{ plan: WeeklyPlan | null; items: WeeklyPlanItem[] }>({
    queryKey: ['current-weekly-plan', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: plans, error: pErr } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('status', 'published')
        .order('week_start', { ascending: false })
        .limit(1);
      if (pErr) throw pErr;
      const plan = (plans?.[0] ?? null) as WeeklyPlan | null;
      if (!plan) return { plan: null, items: [] };
      const { data: items, error: iErr } = await supabase
        .from('weekly_plan_items')
        .select('*')
        .eq('weekly_plan_id', plan.id)
        .order('day_date', { ascending: true })
        .order('sort_order', { ascending: true });
      if (iErr) throw iErr;
      return { plan, items: (items ?? []) as WeeklyPlanItem[] };
    },
  });
}

/**
 * Admin: full plan list for a student, including drafts.
 */
export function useStudentWeeklyPlans(studentId: string | null) {
  return useQuery<WeeklyPlan[]>({
    queryKey: ['weekly-plans-admin', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('student_id', studentId)
        .order('week_start', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WeeklyPlan[];
    },
  });
}
