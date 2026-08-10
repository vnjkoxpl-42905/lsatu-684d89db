import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { format, parseISO, startOfDay } from 'date-fns';
import HubStudentList from '@/components/hub/HubStudentList';
import { useSelectedHubStudent } from '@/hooks/useHubStudents';
import { supabase } from '@/integrations/supabase/client';
import StudentSchedulePanel from '@/components/teacher/schedule/StudentSchedulePanel';
import WeeklyHoursEditor from '@/components/teacher/schedule/WeeklyHoursEditor';

export default function TeacherSchedule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const eventId = searchParams.get('event');
  const selected = useSelectedHubStudent(studentId);
  const focusedEventQuery = useQuery({
    queryKey: ['schedule_events', 'focus', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_events' as never)
        .select('id,google_event_id,title,description,location,start_at,end_at,html_link,status')
        .or(`id.eq.${eventId},google_event_id.eq.${eventId}`)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        google_event_id: string | null;
        title: string;
        description: string | null;
        location: string | null;
        start_at: string;
        end_at: string;
        html_link: string | null;
        status: string;
      } | null;
    },
  });

  // Everything else the month grid needed now lives in StudentSchedulePanel.
  // This page keeps only the student picker and the focused-event header.
  const focusedDate = useMemo(() => {
    const event = focusedEventQuery.data;
    return event ? startOfDay(parseISO(event.start_at)) : null;
  }, [focusedEventQuery.data]);

  const setStudentId = (id: string) =>
    setSearchParams((p) => {
      const c = new URLSearchParams(p);
      c.set('student', id);
      return c;
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-black/12 overflow-y-auto">
        <div className="px-4 py-3 border-b border-black/12 flex items-center gap-2 text-black/55">
          <CalendarDays className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Student schedules
          </span>
        </div>
        <HubStudentList selectedId={studentId} onSelect={setStudentId} />
      </aside>

      <section className="p-6 space-y-5 overflow-y-auto">
        <div className="rounded-xl border border-black/12 bg-white/20 p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[#11181c]">Your teaching availability</h2>
            <p className="mt-1 text-xs text-black/50">
              These hours belong to you. Student assignments appear only after you select a student below.
            </p>
          </div>
          <WeeklyHoursEditor />
        </div>

        {focusedEventQuery.data ? (
          <div className="rounded-xl border border-teacher-accent/30 bg-teacher-accent/10 p-4 text-[#11181c]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-teacher-accent-strong">Google Calendar event</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{focusedEventQuery.data.title}</h2>
            <div className="mt-2 text-sm text-black/60">
              {format(parseISO(focusedEventQuery.data.start_at), 'EEE, MMM d · h:mm a')} - {format(parseISO(focusedEventQuery.data.end_at), 'h:mm a')}
            </div>
            {focusedEventQuery.data.location ? <div className="mt-1 text-sm text-black/55">{focusedEventQuery.data.location}</div> : null}
            {focusedEventQuery.data.description ? (
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-black/60">{focusedEventQuery.data.description}</div>
            ) : null}
            {focusedEventQuery.data.html_link ? (
              <a href={focusedEventQuery.data.html_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-teacher-accent-strong underline">
                Open in Google Calendar
              </a>
            ) : null}
          </div>
        ) : null}

        {!studentId ? (
          <div className="rounded-lg border border-dashed border-black/12 px-4 py-12 text-center text-sm text-black/45">
            Select a student to view or organize that student's calendar.
          </div>
        ) : (
          <StudentSchedulePanel
            studentId={studentId}
            studentName={selected?.display_name ?? null}
            studentEmail={selected?.email ?? null}
            focusDate={focusedDate}
          />
        )}
      </section>
    </div>
  );
}
