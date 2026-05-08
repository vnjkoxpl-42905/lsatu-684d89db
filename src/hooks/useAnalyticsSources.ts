import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsSource {
  id: string;
  student_id: string;
  source_name: '7sage' | 'lawhub' | 'other';
  source_url: string | null;
  embed_status: 'unknown' | 'allowed' | 'blocked' | 'external_only';
  last_imported_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useAnalyticsSources(studentId: string | null) {
  return useQuery<AnalyticsSource[]>({
    queryKey: ['analytics-sources', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_analytics_sources')
        .select('*')
        .eq('student_id', studentId)
        .order('source_name');
      if (error) throw error;
      return (data ?? []) as AnalyticsSource[];
    },
  });
}

export function useUpsertAnalyticsSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<AnalyticsSource> & { student_id: string; source_name: string }) => {
      const { data, error } = await supabase
        .from('student_analytics_sources')
        .upsert(row, { onConflict: 'student_id,source_name' })
        .select()
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['analytics-sources'] });
      return data as AnalyticsSource;
    },
  });
}
