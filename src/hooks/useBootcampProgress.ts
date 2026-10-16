import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { updateClassroomItem } from '@/lib/classroomItems';
import { classroomItemMatchesBootcamp } from '@/lib/bootcamps';

/**
 * Autosaves bootcamp progress back to the student's classroom_items row
 * for the matching bootcamp_id. Without this, teachers have no visibility
 * into how far the student has gotten — only localStorage knew.
 *
 * Behavior:
 *   - On first call with completedDays > 0, flips status to 'in_progress'.
 *   - Debounces writes (~1s) to avoid hammering the DB.
 *   - When completedDays.length >= totalDays, sets status='completed'
 *     and completed_at = now().
 */
export function useBootcampProgress(opts: {
  bootcampId: string;
  completedDays: number[];
  totalDays: number;
  enabled?: boolean;
}) {
  const { bootcampId, completedDays, totalDays, enabled = true } = opts;
  const { user } = useAuth();
  const lastWriteRef = useRef<string>('');

  // Find the active classroom_items row for this student + bootcamp
  const { data: item } = useQuery<{ id: string; metadata: Record<string, unknown> } | null>({
    queryKey: ['bootcamp-item', user?.id, bootcampId],
    enabled: enabled && !!user && !!bootcampId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_items')
        .select('id, source_id, metadata_json, status')
        .eq('student_id', user!.id)
        .eq('type', 'bootcamp_module')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const match = (data ?? []).find((r) =>
        classroomItemMatchesBootcamp(
          {
            source_id: r.source_id,
            metadata_json: r.metadata_json as Record<string, unknown> | null,
          },
          bootcampId,
        ),
      );
      return match ? { id: match.id, metadata: (match.metadata_json as Record<string, unknown>) ?? {} } : null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!enabled || !user || !item || totalDays <= 0 || completedDays.length === 0) return;
    const sorted = [...new Set(completedDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= totalDays))].sort((a, b) => a - b);
    const percent = Math.round((sorted.length / totalDays) * 100);
    const allDone = sorted.length >= totalDays;
    const signature = `${user.id}|${item.id}|${bootcampId}|${totalDays}|${sorted.join(',')}|${allDone}`;
    if (signature === lastWriteRef.current) return;

    const t = setTimeout(async () => {
      try {
        const patch: Parameters<typeof updateClassroomItem>[1] = {
          metadata_json: {
            ...item.metadata,
            bootcamp_id: bootcampId,
            progress: {
              ...((item.metadata.progress as Record<string, unknown>) ?? {}),
              completedDays: sorted,
              totalDays,
              percent,
              lastDayAt: new Date().toISOString(),
            },
          },
        };
        if (allDone) {
          patch.status = 'completed';
          patch.completed_at = new Date().toISOString();
        } else if (sorted.length > 0) {
          patch.status = 'in_progress';
        }
        await updateClassroomItem(item.id, patch);
        lastWriteRef.current = signature;
      } catch (e) {
        console.warn('[useBootcampProgress] save failed', e);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [item, user?.id, enabled, bootcampId, completedDays, totalDays]);
}
