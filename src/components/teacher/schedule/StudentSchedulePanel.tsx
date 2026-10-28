import { newAssignmentDelivery } from '@/lib/assignmentDelivery';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react';
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
import { useStudentClassroomItems, type ClassroomItem, type ClassroomItemType } from '@/hooks/useClassroomItems';
import { createClassroomItem, resolveItemRoute } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import StudentBookingPanel from './StudentBookingPanel';

const QUICK_TYPES: { value: ClassroomItemType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'session_recap', label: 'Recap' },
];

interface Props {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  /** When set, the month grid jumps to this day and pre-selects it (used by
   *  the Schedule room when a Google Calendar event is focused via `?event=`). */
  focusDate?: Date | null;
  /** The dossier already names the student in its own header, so it hides
   *  this panel's "Schedule for <name>" heading. */
  showHeading?: boolean;
}

/**
 * One student's month grid, day detail, and quick-add — shared by the Schedule
 * room (which supplies its own student picker) and the student dossier's
 * Schedule tab. Extracted from TeacherSchedule so both render the same thing.
 */
export default function StudentSchedulePanel({
  studentId,
  studentName,
  studentEmail,
  focusDate = null,
  showHeading = true,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useStudentClassroomItems(studentId);

  const [monthAnchor, setMonthAnchor] = useState<Date>(new Date());
  const [pickedDay, setPickedDay] = useState<Date | null>(null);

  const [type, setType] = useState<ClassroomItemType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const focusKey = focusDate ? format(focusDate, 'yyyy-MM-dd') : null;
  useEffect(() => {
    if (!focusKey) return;
    const day = startOfDay(new Date(`${focusKey}T00:00:00`));
    setMonthAnchor(day);
    setPickedDay(day);
  }, [focusKey]);

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

  const itemsByDay = useMemo(() => {
    const itemDate = (it: ClassroomItem) =>
      startOfDay(new Date(it.due_at ?? it.unlock_at ?? it.created_at));
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
      const delivery = newAssignmentDelivery();
      const item = await createClassroomItem({

        ...delivery,
          notificationPolicy: ['session_recap', 'smartboard_recap', 'announcement'].includes(type) ? 'suppressed' : delivery.notificationPolicy,
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
          notificationGroupId: delivery.notificationGroupId!,
          notificationChannel: ['session_recap', 'smartboard_recap', 'announcement'].includes(type) ? 'message' : 'assignment',
          unlockAt: item.unlock_at,
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
          action: notify.retryBell ? { label: 'Retry notification', onClick: () => void notify.retryBell!().then(() => toast.success('Bell notification delivered')).catch(() => toast.error('Notification failed. Try again.')) } : undefined,
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
    <div className="space-y-5">
      <StudentBookingPanel
        studentId={studentId}
        studentName={studentName}
        studentEmail={studentEmail}
      />

      <header className="flex items-center justify-between gap-3">
        {showHeading ? (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-black/45 font-semibold">
              Schedule for
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              {studentName?.trim() || 'Student'}
            </h2>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonthAnchor((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums w-32 text-center">
            {format(monthAnchor, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setMonthAnchor((m) => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonthAnchor(new Date())}>
            Today
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center text-sm text-black/45">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading schedule…
        </div>
      ) : (
        <div className="rounded-xl border border-black/12 overflow-hidden">
          <div className="grid grid-cols-7 bg-white/35 border-b border-black/12">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="text-[10px] uppercase tracking-[0.15em] text-black/45 font-medium text-center py-2"
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
                  onClick={() => setPickedDay(d)}
                  className={cn(
                    'border-b border-r border-black/12 p-2 text-left min-h-[88px] hover:bg-white/50 transition-colors',
                    outside && 'opacity-40',
                    picked && 'ring-1 ring-teacher-accent bg-white/45',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        today
                          ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-teacher-accent text-white font-semibold'
                          : 'text-black/60',
                      )}
                    >
                      {format(d, 'd')}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] text-black/45">{dayItems.length}</span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 2).map((it) => (
                      <div
                        key={it.id}
                        className="text-[11px] truncate text-black/70 bg-white/40 rounded px-1 py-0.5"
                        title={it.title}
                      >
                        {it.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[10px] text-black/45">+{dayItems.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pickedDay && (
        <div className="rounded-xl border border-black/12 bg-white/25 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-black/45">
                {format(pickedDay, 'EEEE, MMM d')}
              </div>
              <div className="text-sm text-black/60">
                {pickedItems.length === 0
                  ? 'No items yet.'
                  : `${pickedItems.length} item${pickedItems.length === 1 ? '' : 's'}`}
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
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-black/12 bg-transparent"
                >
                  <span className="text-[10px] uppercase tracking-wider text-black/45 w-24 shrink-0">
                    {it.type.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-[#11181c] flex-1 truncate">{it.title}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-black/12 pt-4 space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-black/45 font-semibold">
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
                      ? 'border-teacher-accent bg-white/45 text-[#11181c]'
                      : 'border-black/12 bg-white/25 text-black/55 hover:text-black hover:bg-white/50',
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

            <div className="text-[11px] text-black/45">
              For homework or bootcamp assignments, use the{' '}
              <a
                href={`/teacher/students/${studentId}/work`}
                className="underline hover:text-black/70"
              >
                Work tab
              </a>
              .
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
