import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import { useStudentClassroomItems, type ClassroomItem, type ClassroomItemType } from '@/hooks/useClassroomItems';
import { useSelectedHubStudent } from '@/hooks/useHubStudents';
import { createClassroomItem, resolveItemRoute } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import StudentBookingPanel from '@/components/teacher/schedule/StudentBookingPanel';

const QUICK_TYPES: { value: ClassroomItemType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'session_recap', label: 'Recap' },
];

export default function TeacherSchedule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const eventId = searchParams.get('event');
  const selected = useSelectedHubStudent(studentId);
  const { data: items = [], isLoading } = useStudentClassroomItems(studentId);
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

  const [monthAnchor, setMonthAnchor] = useState<Date>(new Date());
  const [pickedDay, setPickedDay] = useState<Date | null>(null);

  const [type, setType] = useState<ClassroomItemType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const event = focusedEventQuery.data;
    if (!event) return;
    const day = startOfDay(parseISO(event.start_at));
    setMonthAnchor(day);
    setPickedDay(day);
  }, [focusedEventQuery.data]);

  const setStudentId = (id: string) =>
    setSearchParams((p) => {
      const c = new URLSearchParams(p);
      c.set('student', id);
      return c;
    });

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
    const out: Date[] = [];
    let d = start;
    while (d <= end) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [monthAnchor]);

  const itemDate = (it: ClassroomItem) => {
    const raw = it.due_at ?? it.unlock_at ?? it.created_at;
    return startOfDay(new Date(raw));
  };

  const itemsByDay = useMemo(() => {
    const m = new Map<string, ClassroomItem[]>();
    for (const it of items) {
      if (it.status === 'archived') continue;
      const key = format(itemDate(it), 'yyyy-MM-dd');
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    return m;
  }, [items]);

  const submitQuick = async () => {
    if (!user || !studentId || !pickedDay || !title.trim()) {
      toast.error('Title required');
      return;
    }
    setSubmitting(true);
    try {
      const unlockAt = startOfDay(pickedDay).toISOString();
      const dueAt = endOfDay(pickedDay).toISOString();
      const item = await createClassroomItem({
        studentId,
        createdBy: user.id,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        unlockAt,
        dueAt,
        visibleToStudent: true,
        status: 'assigned',
      });
      const notify = await notifyStudentOfClassroomItem({
        adminUserId: user.id,
        studentId,
        title: title.trim(),
        description: description.trim() || undefined,
        route: resolveItemRoute(item) ?? `/classroom/item/${item.id}`,
      });
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });

      const summary = summarizeNotifyResult(notify);
      if (notify.inbox_ok && notify.bell_ok && notify.email_ok) {
        toast.success(summary);
      } else {
        toast.warning(summary, {
          description: notify.email_error ?? notify.inbox_error ?? notify.bell_error,
        });
      }
      setTitle('');
      setDescription('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assign failed');
    } finally {
      setSubmitting(false);
    }
  };

  const pickedKey = pickedDay ? format(pickedDay, 'yyyy-MM-dd') : null;
  const pickedItems = pickedKey ? itemsByDay.get(pickedKey) ?? [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <CalendarDays className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList selectedId={studentId} onSelect={setStudentId} />
      </aside>

      <section className="p-6 space-y-5 overflow-y-auto">
        {focusedEventQuery.data ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-zinc-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Google Calendar event</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{focusedEventQuery.data.title}</h2>
            <div className="mt-2 text-sm text-zinc-300">
              {format(parseISO(focusedEventQuery.data.start_at), 'EEE, MMM d · h:mm a')} - {format(parseISO(focusedEventQuery.data.end_at), 'h:mm a')}
            </div>
            {focusedEventQuery.data.location ? <div className="mt-1 text-sm text-zinc-400">{focusedEventQuery.data.location}</div> : null}
            {focusedEventQuery.data.description ? (
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{focusedEventQuery.data.description}</div>
            ) : null}
            {focusedEventQuery.data.html_link ? (
              <a href={focusedEventQuery.data.html_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-amber-200 underline">
                Open in Google Calendar
              </a>
            ) : null}
          </div>
        ) : null}

        {!studentId ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-12 text-center text-sm text-zinc-500">
            Select a student to view their schedule.
          </div>
        ) : (
          <>
            <StudentBookingPanel
              studentId={studentId}
              studentName={selected?.display_name ?? null}
              studentEmail={selected?.email ?? null}
            />

            <header className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Schedule for
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {selected?.display_name?.trim() || 'Student'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonthAnchor((m) => subMonths(m, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums w-32 text-center">
                  {format(monthAnchor, 'MMMM yyyy')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonthAnchor(new Date())}>
                  Today
                </Button>
              </div>
            </header>

            {isLoading ? (
              <div className="flex items-center text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading schedule…
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <div className="grid grid-cols-7 bg-zinc-900/60 border-b border-zinc-800">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div
                      key={d}
                      className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium text-center py-2"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((d) => {
                    const key = format(d, 'yyyy-MM-dd');
                    const dayItems = itemsByDay.get(key) ?? [];
                    const outside = !isSameMonth(d, monthAnchor);
                    const today = isToday(d);
                    const picked = pickedDay && isSameDay(d, pickedDay);
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => {
                          setPickedDay(d);
                        }}
                        className={cn(
                          'border-b border-r border-zinc-800 p-2 text-left min-h-[88px] hover:bg-zinc-900/60 transition-colors',
                          outside && 'opacity-40',
                          picked && 'ring-1 ring-amber-400 bg-zinc-900/80',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-xs tabular-nums',
                              today
                                ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-400 text-zinc-950 font-semibold'
                                : 'text-zinc-300',
                            )}
                          >
                            {format(d, 'd')}
                          </span>
                          {dayItems.length > 0 && (
                            <span className="text-[10px] text-zinc-500">{dayItems.length}</span>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayItems.slice(0, 2).map((it) => (
                            <div
                              key={it.id}
                              className="text-[11px] truncate text-zinc-200 bg-zinc-800/60 rounded px-1 py-0.5"
                              title={it.title}
                            >
                              {it.title}
                            </div>
                          ))}
                          {dayItems.length > 2 && (
                            <div className="text-[10px] text-zinc-500">
                              +{dayItems.length - 2} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {pickedDay && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                      {format(pickedDay, 'EEEE, MMM d')}
                    </div>
                    <div className="text-sm text-zinc-300">
                      {pickedItems.length === 0 ? 'No items yet.' : `${pickedItems.length} item${pickedItems.length === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setPickedDay(null)} aria-label="Close">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {pickedItems.length > 0 && (
                  <ul className="space-y-1">
                    {pickedItems.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-zinc-800 bg-zinc-950"
                      >
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-24 shrink-0">
                          {it.type.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-zinc-100 flex-1 truncate">{it.title}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Quick add for this day
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] transition-colors',
                          type === t.value
                            ? 'border-amber-400 bg-zinc-900/80 text-zinc-100'
                            : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What's the task?"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="Optional"
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={submitQuick} disabled={submitting || !title.trim()}>
                      {submitting ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-1.5" />
                      )}
                      Assign to {format(pickedDay, 'MMM d')}
                    </Button>
                  </div>

                  <div className="text-[11px] text-zinc-500">
                    For homework or bootcamp assignments, use{' '}
                    <a
                      href={`/teacher/assignments?student=${studentId}`}
                      className="underline hover:text-zinc-300"
                    >
                      Assignments
                    </a>{' '}
                    or{' '}
                    <a
                      href={`/teacher/weekly-plans?student=${studentId}`}
                      className="underline hover:text-zinc-300"
                    >
                      Weekly Plans
                    </a>
                    .
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
