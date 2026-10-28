import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StudentSession } from '@/hooks/useStudentSessions';
import { useAuth } from '@/contexts/AuthContext';

/**
 * The single next upcoming scheduled session across all students, used only
 * for the quiet "Next session" cue on Teacher Desk. Returns null when nothing
 * is scheduled — the cue is then omitted rather than faked.
 */
export function useNextSession() {
  const { user } = useAuth();
  return useQuery<StudentSession | null>({
    queryKey: ['desk-next-session'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_sessions')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      const rows = (data ?? []) as StudentSession[];
      return rows[0] ?? null;
    },
  });
}
