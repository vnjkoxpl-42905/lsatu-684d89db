import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleEventRow {
  id: string;
  google_event_id: string | null;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  status: string;
  html_link: string | null;
  source: string;
  deleted_at: string | null;
}

export const scheduleEventsQueryKey = ['schedule_events'] as const;

export function getTeacherCalendarTodoWindow(now = new Date()) {
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    startsAfter: new Date(now.getTime() - dayMs).toISOString(),
    startsBefore: new Date(now.getTime() + dayMs).toISOString(),
    endsAfter: now.toISOString(),
  };
}

export function useUpcomingScheduleEvents(enabled = true) {
  return useQuery<ScheduleEventRow[]>({
    queryKey: scheduleEventsQueryKey,
    enabled,
    refetchInterval: () => (typeof document !== 'undefined' && document.visibilityState === 'visible' ? 60_000 : false),
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const window = getTeacherCalendarTodoWindow();
      const { data, error } = await supabase
        .from('schedule_events' as never)
        .select('*')
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .gt('end_at', window.endsAfter)
        .gte('start_at', window.startsAfter)
        .lte('start_at', window.startsBefore)
        .order('start_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ScheduleEventRow[];
    },
  });
}

export function useGoogleCalendarBackgroundSync(enabled = true) {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gcal-sync-pull', { body: {} });
      if (error) throw error;
      if ((data as { ok?: boolean; error?: string } | null)?.ok === false) {
        throw new Error((data as { error?: string }).error ?? 'Calendar sync failed');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleEventsQueryKey }),
  });
  const { mutate } = sync;

  useEffect(() => {
    if (!enabled) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    mutate();
    const id = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') mutate();
    }, 120_000);
    return () => window.clearInterval(id);
  }, [enabled, mutate]);

  return sync;
}
