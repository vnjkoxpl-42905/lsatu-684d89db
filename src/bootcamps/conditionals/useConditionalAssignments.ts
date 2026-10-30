import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { conditionalTeacherPreview, readConditionalAssignments, type ConditionalAssignmentRow } from './assignments';

export function useConditionalAssignments(userId: string | undefined, isAdmin: boolean) {
  const query = useQuery({
    queryKey: ['conditional-assignments', userId, isAdmin],
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (isAdmin) return { assignments: [await conditionalTeacherPreview()], unavailableAssignments: [] };
      const { data, error } = await supabase.from('classroom_items')
        .select('id,student_id,type,title,description,source_table,source_id,metadata_json,status,visible_to_student,unlock_at')
        .eq('student_id', userId!).eq('type', 'bootcamp_module').eq('visible_to_student', true)
        .in('status', ['assigned', 'in_progress', 'completed'])
        .order('priority', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return readConditionalAssignments((data ?? []) as ConditionalAssignmentRow[], userId!);
    },
  });
  return { ...query, data: query.data?.assignments, unavailableAssignments: query.data?.unavailableAssignments ?? [] };
}
