import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MetricKind =
  | 'overall_accuracy'
  | 'accuracy_by_type'
  | 'timing_by_type'
  | 'pt_score'
  | 'section_score';

export interface ExternalMetric {
  id: string;
  student_id: string;
  source_upload_id: string;
  source_platform: string | null;
  metric_kind: MetricKind;
  question_type: string | null;
  first_accuracy: number | null;
  avg_time_ms: number | null;
  sample_size: number | null;
  pt_number: string | null;
  scaled_score: number | null;
  period_label: string | null;
  captured_at: string | null;
  created_at: string;
}

export interface GroupedExternalMetrics {
  overallAccuracy: ExternalMetric | null;
  accuracyByType: ExternalMetric[];
  timingByType: ExternalMetric[];
  ptScores: ExternalMetric[];
  sectionScores: ExternalMetric[];
  latestCapturedAt: string | null;
  sources: string[];
  hasAny: boolean;
}

function group(rows: ExternalMetric[]): GroupedExternalMetrics {
  const byKind = (k: MetricKind) => rows.filter((r) => r.metric_kind === k);
  const overall = byKind('overall_accuracy');
  const dated = rows
    .map((r) => r.captured_at ?? r.created_at)
    .filter(Boolean)
    .sort()
    .reverse();
  return {
    overallAccuracy: overall[0] ?? null,
    accuracyByType: byKind('accuracy_by_type'),
    timingByType: byKind('timing_by_type'),
    ptScores: byKind('pt_score'),
    sectionScores: byKind('section_score'),
    latestCapturedAt: dated[0] ?? null,
    sources: Array.from(new Set(rows.map((r) => r.source_platform).filter(Boolean) as string[])),
    hasAny: rows.length > 0,
  };
}

/**
 * Student-side: metrics parsed out of external work uploads (7Sage, PT
 * results). Grouped for display alongside the on-the-fly analytics derived
 * from the attempts table. These are shown as a distinct "imported" layer,
 * never blended into in-app accuracy numbers.
 */
export function useStudentExternalMetrics(studentId?: string) {
  const { user } = useAuth();
  const id = studentId ?? user?.id ?? null;
  const query = useQuery<ExternalMetric[]>({
    queryKey: ['external-metrics', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_external_metrics')
        .select('*')
        .eq('student_id', id as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExternalMetric[];
    },
  });
  return { ...query, grouped: group(query.data ?? []) };
}
