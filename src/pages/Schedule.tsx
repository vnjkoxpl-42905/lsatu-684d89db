import * as React from 'react';
import { format, isSameDay, isSameMonth, isToday, startOfDay, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Clock3, ExternalLink, Loader2, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TodayAgenda from '@/components/schedule/TodayAgenda';
import BookingView from '@/components/booking/BookingView';
import { useBookingScheduleItems } from '@/hooks/useBookingScheduleItems';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { useStudentTodo } from '@/hooks/useStudentTodo';
import { buildScheduleEntries, groupScheduleEntries, type ScheduleEntry } from '@/lib/scheduleEntries';
import { cn } from '@/lib/utils';

type CalendarView = 'month' | 'week';
type MainView = 'today' | 'calendar';

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

function entryTone(entry: ScheduleEntry): string {
  if (entry.kind === 'session') return 'border-primary/25 bg-primary/8 text-primary';
  if (entry.kind === 'task') return 'border-border bg-muted/65 text-foreground';
  return 'border-border bg-background text-foreground';
}

function EntrySummary({ entry, compact = false }: { entry: ScheduleEntry; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', entry.kind === 'session' ? 'bg-primary' : entry.kind === 'task' ? 'bg-muted-foreground' : 'bg-amber-500')} />
      <span className="truncate text-[13px] font-medium leading-5">
        {!entry.allDay && !compact ? `${format(new Date(entry.startsAt), 'h:mm')} ` : ''}{entry.title}
      </span>
    </span>
  );
}

function MonthGrid({
  anchor,
  entriesByDay,
  focusedDate,
  onSelect,
}: {
  anchor: Date;
  entriesByDay: Map<string, ScheduleEntry[]>;
  focusedDate: Date;
  onSelect: (date: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 }),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" role="group" aria-label={format(anchor, 'MMMM yyyy')}>
      <div className="grid grid-cols-7 border-b border-border" aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <div key={label} className="border-r border-border bg-muted/35 px-1 py-2.5 text-center text-xs font-semibold text-muted-foreground last:border-r-0">
            <span className="@[520px]/schedule:hidden">{label.slice(0, 1)}</span>
            <span className="hidden @[520px]/schedule:inline">{label}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const entries = entriesByDay.get(dayKey(date)) ?? [];
          const focused = isSameDay(date, focusedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              aria-pressed={focused}
              aria-label={`${format(date, 'EEEE, MMMM d, yyyy')}${entries.length ? `, ${entries.length} scheduled` : ', nothing scheduled'}`}
              onClick={() => onSelect(date)}
              className={cn(
                'relative min-h-[68px] border-b border-r border-border p-1.5 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @[520px]/schedule:min-h-[104px] @[520px]/schedule:p-2 @[860px]/schedule:min-h-[124px]',
                !isSameMonth(date, anchor) ? 'bg-muted/20 text-muted-foreground/55' : 'bg-card hover:bg-accent/40',
                focused && 'z-10 bg-accent/70 ring-2 ring-inset ring-primary',
              )}
            >
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums', isToday(date) && 'bg-foreground text-background')}>
                {format(date, 'd')}
              </span>
              <span className="mt-1 flex gap-1 @[520px]/schedule:hidden" aria-hidden>
                {entries.slice(0, 3).map((entry) => <span key={entry.key} className={cn('h-1.5 w-1.5 rounded-full', entry.kind === 'session' ? 'bg-primary' : entry.kind === 'task' ? 'bg-muted-foreground' : 'bg-amber-500')} />)}
                {entries.length > 3 ? <span className="text-xs leading-none text-muted-foreground">+</span> : null}
              </span>
              <span className="mt-1 hidden space-y-1 @[520px]/schedule:block">
                {entries.slice(0, 2).map((entry) => (
                  <span key={entry.key} className={cn('block rounded-md border px-1.5 py-0.5', entryTone(entry))}>
                    <EntrySummary entry={entry} />
                  </span>
                ))}
                {entries.length > 2 ? <span className="block px-1 text-xs font-medium text-muted-foreground">+{entries.length - 2} more</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  anchor,
  entriesByDay,
  focusedDate,
  onSelect,
}: {
  anchor: Date;
  entriesByDay: Map<string, ScheduleEntry[]>;
  focusedDate: Date;
  onSelect: (date: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(anchor, { weekStartsOn: 0 }),
    end: endOfWeek(anchor, { weekStartsOn: 0 }),
  });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5" aria-label="Choose a day this week">
        {days.map((date) => {
          const selected = isSameDay(date, focusedDate);
          const count = entriesByDay.get(dayKey(date))?.length ?? 0;
          return (
            <button
              key={date.toISOString()}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(date)}
              className={cn('min-h-14 rounded-lg border px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @[520px]/schedule:min-h-16', selected ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:bg-accent')}
            >
              <span className="block text-xs font-medium opacity-70">{format(date, 'EEE')}</span>
              <span className="block text-base font-semibold tabular-nums">{format(date, 'd')}</span>
              {count ? <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-current" aria-label={`${count} scheduled`} /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 hidden grid-cols-7 gap-2 @[860px]/schedule:grid">
        {days.map((date) => {
          const entries = entriesByDay.get(dayKey(date)) ?? [];
          return (
            <div key={date.toISOString()} className="min-h-80 border-r border-border pr-2 last:border-r-0 last:pr-0">
              <p className="mb-3 text-sm font-semibold">{format(date, 'EEEE')}</p>
              <div className="space-y-2">
                {entries.map((entry) => <button key={entry.key} type="button" onClick={() => onSelect(date)} className={cn('w-full rounded-lg border px-2 py-2 text-left transition-colors hover:bg-accent', entryTone(entry))}><EntrySummary entry={entry} compact /></button>)}
                {!entries.length ? <p className="text-xs text-muted-foreground">Open</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaEntry({ entry, onOpen }: { entry: ScheduleEntry; onOpen: (entry: ScheduleEntry) => void }) {
  const isSession = entry.kind === 'session';
  const syncFailed = isSession && entry.calendarStatus === 'failed';
  const syncPending = isSession && entry.calendarStatus !== 'synced' && !syncFailed;
  return (
    <article className={cn('rounded-xl border p-4', isSession ? 'border-primary/25 bg-primary/5' : 'border-border bg-card')}>
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', isSession ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
          {isSession ? <Video className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-5">{entry.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.allDay ? 'Due today' : format(new Date(entry.startsAt), "h:mm a")}{isSession ? ' · With Joshua' : ''}
          </p>
          {isSession ? <p className="mt-1 text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p> : null}
          {syncPending ? <p className="mt-2 text-xs text-muted-foreground">Google Calendar invite syncing</p> : null}
          {syncFailed ? <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><CircleAlert className="h-3.5 w-3.5" />Calendar invite needs attention</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {isSession && entry.meetUrl ? (
          <Button size="sm" asChild><a href={entry.meetUrl} target="_blank" rel="noreferrer">Join Meet<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button>
        ) : null}
        {(entry.route || isSession) ? <Button size="sm" variant={isSession && entry.meetUrl ? 'outline' : 'default'} onClick={() => onOpen(entry)}>{isSession ? 'Manage booking' : 'Open work'}</Button> : null}
      </div>
    </article>
  );
}

function SelectedDayAgenda({ date, entries, onOpen }: { date: Date; entries: ScheduleEntry[]; onOpen: (entry: ScheduleEntry) => void }) {
  return (
    <aside className="min-w-0 rounded-xl border border-border bg-muted/20 p-4 @[1080px]/schedule:p-5" aria-label={`Schedule for ${format(date, 'MMMM d')}`}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{isToday(date) ? 'Today' : format(date, 'EEEE')}</h2>
        <p className="text-sm text-muted-foreground">{format(date, 'MMMM d, yyyy')}</p>
      </div>
      {entries.length ? <div className="space-y-3">{entries.map((entry) => <AgendaEntry key={entry.key} entry={entry} onOpen={onOpen} />)}</div> : (
        <div className="rounded-lg border border-dashed border-border bg-background/60 px-4 py-8 text-center">
          <p className="text-sm font-medium">Nothing scheduled.</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose another date or add a personal task in Today.</p>
        </div>
      )}
    </aside>
  );
}

/**
 * Seeing your calendar and adding to it are the same errand, so they are one
 * rail destination with two stage tabs rather than two sibling rail entries
 * that open unrelated-looking screens (2026-08-13 decision).
 *
 * `/schedule` and `/booking` both mount this shell and differ only in which tab
 * opens, so every existing link, redirect, and Classroom pill keeps working.
 */
type StageTab = 'schedule' | 'book';

const TAB_PATH: Record<StageTab, string> = { schedule: '/schedule', book: '/booking' };

export default function Schedule({ initialTab = 'schedule' }: { initialTab?: StageTab }) {
  const navigate = useNavigate();
  const classroom = useClassroomItems();
  const bookings = useBookingScheduleItems();
  const todo = useStudentTodo();
  const [tab, setTab] = React.useState<StageTab>(initialTab);
  const [mainView, setMainView] = React.useState<MainView>('calendar');
  const [calendarView, setCalendarView] = React.useState<CalendarView>('month');
  const [focusedDate, setFocusedDate] = React.useState(() => startOfDay(new Date()));

  // Keep the tab and the URL in step so the surface stays linkable and the
  // browser back button moves between tabs the way a student expects.
  React.useEffect(() => { setTab(initialTab); }, [initialTab]);
  const selectTab = React.useCallback((next: StageTab) => {
    setTab(next);
    navigate(TAB_PATH[next], { replace: true });
  }, [navigate]);

  const entries = React.useMemo(
    () => buildScheduleEntries(classroom.data ?? [], bookings.data ?? [], todo.items),
    [classroom.data, bookings.data, todo.items],
  );
  const entriesByDay = React.useMemo(() => groupScheduleEntries(entries), [entries]);
  const focusedEntries = entriesByDay.get(dayKey(focusedDate)) ?? [];
  const loading = classroom.isLoading || bookings.isLoading || todo.loading;
  const partialError = classroom.isError || bookings.isError || Boolean(todo.error);

  const navLabel = calendarView === 'month'
    ? format(focusedDate, 'MMMM yyyy')
    : `${format(startOfWeek(focusedDate), 'MMM d')} – ${format(endOfWeek(focusedDate), 'MMM d, yyyy')}`;

  const shift = (direction: -1 | 1) => setFocusedDate((current) => calendarView === 'month'
    ? (direction < 0 ? subMonths(current, 1) : addMonths(current, 1))
    : (direction < 0 ? subWeeks(current, 1) : addWeeks(current, 1)));

  // A session entry belongs to the Book tab, not a separate destination.
  const openEntry = (entry: ScheduleEntry) => {
    if (entry.kind === 'session') { selectTab('book'); return; }
    navigate(entry.route ?? '/schedule');
  };

  return (
    <div className="@container/schedule pb-20">
      <header className="mb-4">
        <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">Your due work, personal tasks, and booked sessions in one place.</p>
      </header>

      {/* Stage tabs. Sticky to the stage header so they stay put while the
          calendar scrolls under them. */}
      <div className="sticky top-0 z-20 -mx-1 mb-6 bg-background/90 px-1 pb-2 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div role="tablist" aria-label="Schedule sections" className="flex gap-1 border-b border-border">
          {([['schedule', 'Schedule'], ['book', 'Book a session']] as [StageTab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => selectTab(id)}
              className={cn(
                'relative min-h-11 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                tab === id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {tab === id ? <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
            </button>
          ))}
        </div>
      </div>

      {tab === 'book' ? <BookingView /> : (
      <>
      <div className="mb-5 flex justify-end">
        <div className="inline-flex rounded-lg border border-border bg-muted/45 p-1" aria-label="Schedule view">
          {(['today', 'calendar'] as MainView[]).map((view) => <button key={view} type="button" aria-pressed={mainView === view} onClick={() => setMainView(view)} className={cn('min-h-9 rounded-md px-4 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', mainView === view ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{view}</button>)}
        </div>
      </div>

      {partialError ? <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Some schedule information could not be refreshed. The items that loaded successfully are still shown.</span></div> : null}

      {mainView === 'today' ? (
        loading
          ? <div role="status" aria-live="polite" className="flex min-h-80 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Loading today…</div>
          : <TodayAgenda entries={entriesByDay.get(dayKey(new Date())) ?? []} todo={todo} onOpenEntry={openEntry} />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 @[640px]/schedule:px-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => shift(-1)} aria-label={`Previous ${calendarView}`}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => shift(1)} aria-label={`Next ${calendarView}`}><ChevronRight className="h-4 w-4" /></Button>
              <h2 className="ml-1 text-base font-semibold tracking-tight @[520px]/schedule:text-lg">{navLabel}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-10 px-3 text-sm" onClick={() => setFocusedDate(startOfDay(new Date()))}>Go to today</Button>
              <div className="inline-flex rounded-lg bg-muted p-1" aria-label="Calendar layout">
                {(['month', 'week'] as CalendarView[]).map((view) => <button key={view} type="button" aria-pressed={calendarView === view} onClick={() => setCalendarView(view)} className={cn('min-h-8 rounded-md px-3 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', calendarView === view ? 'bg-background shadow-sm' : 'text-muted-foreground')}>{view}</button>)}
              </div>
            </div>
          </div>

          {loading ? <div role="status" aria-live="polite" className="flex min-h-80 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Loading schedule…</div> : (
            <div className="grid gap-5 p-3 @[640px]/schedule:p-5 @[1080px]/schedule:grid-cols-[minmax(0,1fr)_320px] @[1080px]/schedule:gap-6">
              <div className="min-w-0">
                {calendarView === 'month' ? <MonthGrid anchor={focusedDate} entriesByDay={entriesByDay} focusedDate={focusedDate} onSelect={setFocusedDate} /> : <WeekView anchor={focusedDate} entriesByDay={entriesByDay} focusedDate={focusedDate} onSelect={setFocusedDate} />}
              </div>
              <SelectedDayAgenda date={focusedDate} entries={focusedEntries} onOpen={openEntry} />
            </div>
          )}
          {/* An empty calendar is the moment a student most needs the way to
              fill it. It used to be a dead end with no booking control on the
              page at all. */}
          {!loading && entries.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <p className="text-sm text-muted-foreground"><CalendarDays className="mr-2 inline h-4 w-4" />Nothing has been intentionally scheduled yet.</p>
              <Button size="sm" onClick={() => selectTab('book')}>Book a session</Button>
            </div>
          ) : null}
        </section>
      )}
      </>
      )}
    </div>
  );
}
