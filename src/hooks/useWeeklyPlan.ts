import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { localDayISO } from '@/lib/localDate';
import type { PlanRelation } from '@/lib/weeklyPlanWeek';
import { loadPlanItems, loadPrescribedPlan, type PlanDb } from '@/lib/weeklyPlanRead';

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
 * Returns the signed-in student's prescribed week: the published plan whose
 * dates contain today, else the next upcoming one, else the latest past one.
 * The student's own to-do plan (`__personal__`) is never picked, and the read
 * is scoped to the student's own rows even for an account RLS lets see more.
 * See loadPrescribedPlan for why far-future plans cannot crowd this week out.
 */
export function useCurrentWeeklyPlan() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery<{ plan: WeeklyPlan | null; items: WeeklyPlanItem[]; relation: PlanRelation | null }>({
    queryKey: ['current-weekly-plan', userId],
    enabled: !!userId,
    // The query captures the user id it was started for; a late answer for a
    // previous account lands under that account's key, never this one.
    queryFn: () => loadPrescribedPlan(supabase as unknown as PlanDb, userId as string, localDayISO()),
  });
}

/**
 * Admin: the items of one plan with their stored status, so the teacher sees
 * the same week the student scans. Keyed and scoped by the selected student;
 * a plan that is not that student's is never read.
 */
export function useWeeklyPlanItems(plan: Pick<WeeklyPlan, 'id' | 'student_id'> | null, studentId: string | null) {
  const matches = !!plan && !!studentId && plan.student_id === studentId;
  return useQuery<WeeklyPlanItem[]>({
    queryKey: ['weekly-plan-items', studentId, plan?.id ?? null],
    enabled: matches,
    queryFn: () => loadPlanItems(supabase as unknown as PlanDb, plan as WeeklyPlan, studentId as string),
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
