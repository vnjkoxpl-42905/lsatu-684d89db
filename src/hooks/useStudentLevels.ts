import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { coerceStudentLevel, type StudentLevel } from '@/lib/studentLevel';

/**
 * The proficiency band Joshua has set for each student.
 *
 * Deliberately a direct `profiles` select rather than a field on
 * `useHubStudents`: that hook goes through the `admin-manage-users` edge
 * function, so adding a column there would need a function redeploy to ship a
 * UI change. Admins already read profiles directly in TeacherStudentDetail and
 * HubSnapshot, so this follows an established path.
 *
 * proficiency_level is newer than the auto-generated Supabase types, which are
 * not hand-editable, so both queries cast at the call site.
 */

export const STUDENT_LEVELS_QUERY_KEY = ['student-levels'] as const;

type LooseProfiles = {
  select: (cols: string) => Promise<{
    data: Array<Record<string, unknown>> | null;
    error: unknown;
  }>;
  update: (values: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: unknown }>;
  };
};

const profiles = () => supabase.from('profiles') as never as LooseProfiles;

export function useStudentLevels() {
  return useQuery({
    queryKey: STUDENT_LEVELS_QUERY_KEY,
    queryFn: async (): Promise<Record<string, StudentLevel | null>> => {
      const { data, error } = await profiles().select('class_id, proficiency_level');
      if (error) throw error;
      const out: Record<string, StudentLevel | null> = {};
      for (const row of data ?? []) {
        out[row.class_id as string] = coerceStudentLevel(row.proficiency_level, null);
      }
      return out;
    },
    staleTime: 60_000,
  });
}

export function useSetStudentLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; level: StudentLevel | null }) => {
      const { error } = await profiles()
        .update({ proficiency_level: input.level })
        .eq('class_id', input.studentId);
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_LEVELS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['teacher-student-profile', input.studentId] });
      queryClient.invalidateQueries({ queryKey: ['hub-students'] });
    },
  });
}
