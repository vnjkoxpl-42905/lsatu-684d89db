import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchScheduleTemplates,
  setStudentSchedule,
  type ScheduleTemplate,
} from '@/lib/scheduleTemplate';

/**
 * Which week each student is on.
 *
 * A schedule is the shape of the week; a curriculum is the drills that fill
 * it. Kept apart here for the same reason they are apart in the database: a
 * student can be on a week before Joshua has decided their drill order.
 */

export const SCHEDULE_TEMPLATES_QUERY_KEY = ['schedule-templates'] as const;
export const STUDENT_SCHEDULES_QUERY_KEY = ['student-schedules'] as const;

/** Postgres "relation does not exist" — the migration has not landed here yet. */
const UNDEPLOYED = '42P01';

export function useScheduleTemplates() {
  return useQuery({
    queryKey: SCHEDULE_TEMPLATES_QUERY_KEY,
    queryFn: fetchScheduleTemplates,
    staleTime: 5 * 60_000,
  });
}

/** studentId -> schedule_template_id, for everyone who has been put on one. */
export function useStudentSchedules() {
  return useQuery({
    queryKey: STUDENT_SCHEDULES_QUERY_KEY,
    queryFn: async (): Promise<Record<string, string>> => {
      const db = supabase as never as { from: (t: string) => any };
      const { data, error } = await db
        .from('student_schedules')
        .select('student_id, schedule_template_id');

      // Degrade to "nobody is on a schedule" rather than breaking the dossier
      // when code ships ahead of the migration.
      if (error) {
        if (error.code === UNDEPLOYED) return {};
        throw error;
      }

      const out: Record<string, string> = {};
      for (const row of (data ?? []) as Array<{
        student_id: string;
        schedule_template_id: string;
      }>) {
        out[row.student_id] = row.schedule_template_id;
      }
      return out;
    },
    staleTime: 60_000,
  });
}

export function useSetStudentSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; scheduleTemplateId: string | null }) => {
      await setStudentSchedule(input.studentId, input.scheduleTemplateId);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_SCHEDULES_QUERY_KEY });
    },
  });
}

/** The schedule a student is on, or null when they are on the default week. */
export function useStudentSchedule(studentId: string): {
  schedule: ScheduleTemplate | null;
  templates: ScheduleTemplate[];
  isLoading: boolean;
} {
  const { data: templates, isLoading: loadingTemplates } = useScheduleTemplates();
  const { data: assignments, isLoading: loadingAssignments } = useStudentSchedules();

  const assignedId = assignments?.[studentId];
  return {
    schedule: templates?.find((t) => t.id === assignedId) ?? null,
    templates: templates ?? [],
    isLoading: loadingTemplates || loadingAssignments,
  };
}
