import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format, isSameDay, isSameMonth, isToday, startOfDay,
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks,
  subWeeks, addDays, subDays, addMonths, subMonths,
} from 'date-fns';
import { ArrowLeft, CalendarDays, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DayContentProps } from 'react-day-picker';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

type TaskType = 'PT' | 'Drill' | 'Classroom';
type CalView  = 'month' | 'week' | 'day';

interface Task {
  id: string;
  date: Date;
  type: TaskType;
  title: string;
}

const TYPE_META: Record<TaskType, { label: string; dot: string; pill: string; badge: string }> = {
  PT:        { label: 'Practice Test',    dot: 'bg-rose-500',   pill: 'bg-rose-500/10 text-rose-600 border-rose-200',   badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  Drill:     { label: 'Targeted Drill',   dot: 'bg-sky-500',    pill: 'bg-sky-500/10 text-sky-600 border-sky-200',     badge: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  Classroom: { label: 'Classroom Module', dot: 'bg-violet-500', pill: 'bg-violet-500/10 text-violet-600 border-violet-200', badge: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
};

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

const INITIAL_TASKS: Task[] = [
  { id: '1', date: daysFromNow(0),  type: 'Drill',     title: 'Flaw & Weaken — 20 Qs' },
  { id: '2', date: daysFromNow(2),  type: 'PT',        title: 'PT 140 — Section 2' },
  { id: '3', date: daysFromNow(5),  type: 'Classroom', title: 'Causation Station — Module 1' },
  { id: '4', date: daysFromNow(7),  type: 'Drill',     title: 'Necessary Assumption — 15 Qs' },
  { id: '5', date: daysFromNow(10), type: 'PT',        title: 'PT 141 — Section 1' },
  { id: '6', date: daysFromNow(14), type: 'Classroom', title: 'Causation Station — Module 2' },
  { id: '7', date: daysFromNow(18), type: 'Drill',     title: 'Inference Sprint — 10 Qs' },
  { id: '8', date: daysFromNow(22), type: 'PT',        title: 'PT 142 — Full Section' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Context — shares tasks with the DayPicker custom component
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleCtx { tasks: Task[] }
const ScheduleContext = React.createContext<ScheduleCtx>({ tasks: [] });

// ─────────────────────────────────────────────────────────────────────────────
// Custom DayContent for month grid — dots + tooltip
// ─────────────────────────────────────────────────────────────────────────────

function CustomDayContent({ date, displayMonth }: DayContentProps) {
  const { tasks } = React.useContext(ScheduleContext);
  const dayTasks   = tasks.filter(t => isSameDay(t.date, date));
  const isOutside  = !isSameMonth(date, displayMonth);

  const inner = (
    <span className={cn('flex flex-col items-center leading-none', isOutside && 'opacity-25')}>
      <span className="tabular-nums text-sm">{date.getDate()}</span>
      <span className="flex gap-[3px] mt-1 min-h-[6px]">
        {dayTasks.slice(0, 3).map(t => (
          <span key={t.id} className={cn('w-[5px] h-[5px] rounded-full', TYPE_META[t.type].dot)} />
        ))}
      </span>
    </span>
  );

  if (dayTasks.length === 0) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{inner}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] space-y-1 py-2 px-3">
        {dayTasks.map(t => (
          <div key={t.id} className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', TYPE_META[t.type].dot)} />
            <span className="text-xs">{t.title}</span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View toggle pill
// ─────────────────────────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }: { view: CalView; onChange: (v: CalView) => void }) {
  const opts: { value: CalView; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'week',  label: 'Week' },
    { value: 'day',   label: 'Day' },
  ];
  return (
    <div className="flex items-center p-0.5 bg-muted/50 rounded-lg border border-border/60 gap-0.5">
      {opts.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            view === o.value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Week view
// ─────────────────────────────────────────────────────────────────────────────

function WeekView({
  weekAnchor, tasks, onDayClick,
}: {
  weekAnchor: Date;
  tasks: Task[];
  onDayClick: (d: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(weekAnchor, { weekStartsOn: 0 }),
    end:   endOfWeek(weekAnchor,   { weekStartsOn: 0 }),
  });

  return (
    <div className="grid grid-cols-7 gap-2 mt-2">
      {days.map(day => {
        const dayTasks  = tasks.filter(t => isSameDay(t.date, day));
        const today     = isToday(day);
        return (
          <div
            key={day.toISOString()}
            className="flex flex-col min-h-[160px] cursor-pointer group"
            onClick={() => onDayClick(day)}
          >
            {/* Day header */}
            <div className={cn(
              'flex flex-col items-center py-2 rounded-xl mb-2 transition-colors',
              today
                ? 'bg-foreground text-background'
                : 'bg-muted/30 text-muted-foreground group-hover:bg-accent',
            )}>
              <span className="text-[10px] uppercase tracking-widest font-medium">
                {format(day, 'EEE')}
              </span>
              <span className={cn('text-lg font-semibold tabular-nums leading-tight', today && 'text-background')}>
                {format(day, 'd')}
              </span>
            </div>
            {/* Task blocks */}
            <div className="flex-1 space-y-1 px-0.5">
              {dayTasks.map(t => (
                <div
                  key={t.id}
                  className={cn(
                    'px-2 py-1.5 rounded-lg border text-[11px] font-medium leading-tight truncate',
                    TYPE_META[t.type].pill,
                  )}
                  onClick={e => { e.stopPropagation(); onDayClick(day); }}
                >
                  {t.title}
                </div>
              ))}
              {dayTasks.length === 0 && (
                <div className="h-full min-h-[80px] rounded-lg border border-dashed border-border/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Day view
// ─────────────────────────────────────────────────────────────────────────────

function DayView({
  day, tasks, onAddClick,
}: {
  day: Date;
  tasks: Task[];
  onAddClick: () => void;
}) {
  const dayTasks = tasks.filter(t => isSameDay(t.date, day));

  return (
    <div className="mt-4 space-y-4">
      {/* Day headline */}
      <div className={cn(
        'px-5 py-4 rounded-2xl border',
        isToday(day)
          ? 'bg-foreground text-background border-transparent'
          : 'bg-muted/30 border-border',
      )}>
        <p className={cn(
          'text-[11px] uppercase tracking-[0.2em] font-medium',
          isToday(day) ? 'text-background/60' : 'text-muted-foreground',
        )}>
          {format(day, 'EEEE')}
        </p>
        <p className={cn('text-3xl font-bold tabular-nums leading-tight',
          isToday(day) ? 'text-background' : 'text-foreground',
        )}>
          {format(day, 'MMMM d, yyyy')}
        </p>
        {isToday(day) && (
          <p className="text-[11px] text-background/60 mt-0.5">Today</p>
        )}
      </div>

      {/* Tasks */}
      {dayTasks.length > 0 ? (
        <div className="space-y-2.5">
          {dayTasks.map(t => (
            <div
              key={t.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 rounded-xl border',
                TYPE_META[t.type].pill,
              )}
            >
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', TYPE_META[t.type].dot)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{TYPE_META[t.type].label}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No sessions scheduled.</p>
          <p className="text-xs text-muted-foreground/50 mt-1">This day is open.</p>
        </div>
      )}

      {/* Add CTA */}
      <button
        onClick={onAddClick}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Plus className="w-4 h-4" />
        Assign a task to this day
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Schedule() {
  const navigate = useNavigate();

  const [tasks,        setTasks]        = React.useState<Task[]>(INITIAL_TASKS);
  const [view,         setView]         = React.useState<CalView>('month');
  const [monthAnchor,  setMonthAnchor]  = React.useState<Date>(new Date());
  const [weekAnchor,   setWeekAnchor]   = React.useState<Date>(new Date());
  const [dayAnchor,    setDayAnchor]    = React.useState<Date>(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [sheetOpen,    setSheetOpen]    = React.useState(false);
  const [newType,      setNewType]      = React.useState<TaskType | ''>('');
  const [newTitle,     setNewTitle]     = React.useState('');

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    // Sync anchors when clicking in one view
    setDayAnchor(startOfDay(date));
    setWeekAnchor(date);
    setNewType('');
    setNewTitle('');
    setSheetOpen(true);
  };

  const tasksForSelected = selectedDate
    ? tasks.filter(t => isSameDay(t.date, selectedDate))
    : [];

  const handleAddTask = () => {
    if (!selectedDate || !newType || !newTitle.trim()) return;
    setTasks(prev => [
      ...prev,
      { id: `${Date.now()}`, date: startOfDay(selectedDate), type: newType as TaskType, title: newTitle.trim() },
    ]);
    setNewType('');
    setNewTitle('');
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Navigation labels & handlers per view
  const navLabel = React.useMemo(() => {
    if (view === 'month') return format(monthAnchor, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(weekAnchor, { weekStartsOn: 0 });
      const we = endOfWeek(weekAnchor, { weekStartsOn: 0 });
      return isSameMonth(ws, we)
        ? `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`
        : `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(dayAnchor, 'EEEE, MMMM d');
  }, [view, monthAnchor, weekAnchor, dayAnchor]);

  const handlePrev = () => {
    if (view === 'month') setMonthAnchor(m => subMonths(m, 1));
    if (view === 'week')  setWeekAnchor(w => subWeeks(w, 1));
    if (view === 'day')   setDayAnchor(d => subDays(d, 1));
  };
  const handleNext = () => {
    if (view === 'month') setMonthAnchor(m => addMonths(m, 1));
    if (view === 'week')  setWeekAnchor(w => addWeeks(w, 1));
    if (view === 'day')   setDayAnchor(d => addDays(d, 1));
  };
  const handleToday = () => {
    const t = new Date();
    setMonthAnchor(t);
    setWeekAnchor(t);
    setDayAnchor(startOfDay(t));
  };

  // Upcoming — next 14 days
  const upcoming = React.useMemo(() => {
    const start = startOfDay(new Date());
    const end   = addDays(start, 14);
    return tasks
      .filter(t => t.date >= start && t.date <= end)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks]);

  return (
    <ScheduleContext.Provider value={{ tasks }}>
      <TooltipProvider delayDuration={180}>
        <div className="min-h-screen bg-background">

          {/* ── Header ── */}
          <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
              <Button variant="ghost" size="sm" onClick={() => navigate('/foyer')}
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Main Hub
              </Button>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Schedule</p>
              <div className="flex items-center gap-1">
                <LogoutButton />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* ── Body ── */}
          <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 pb-20">

            {/* Title row */}
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Study Schedule &amp; Agenda</h1>
                <p className="text-sm text-muted-foreground mt-1.5">Click any date to assign or manage study tasks.</p>
              </div>
              <div className="hidden sm:flex items-center gap-5 pb-1">
                {(Object.entries(TYPE_META) as [TaskType, typeof TYPE_META[TaskType]][]).map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={cn('w-2.5 h-2.5 rounded-full', meta.dot)} />
                    <span className="text-xs text-muted-foreground">{meta.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">

              {/* ── Calendar card ── */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:p-8">

                {/* Calendar toolbar */}
                <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button onClick={handlePrev}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={handleNext}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-base font-semibold tracking-tight ml-1">{navLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleToday}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      Today
                    </button>
                    <ViewToggle view={view} onChange={setView} />
                  </div>
                </div>

                {/* ── Month view ── */}
                {view === 'month' && (
                  <DayPicker
                    month={monthAnchor}
                    onMonthChange={setMonthAnchor}
                    mode="single"
                    onDayClick={handleDayClick}
                    showOutsideDays
                    className="w-full"
                    classNames={{
                      months:              'w-full',
                      month:               'w-full',
                      caption:             'hidden', // we render our own
                      caption_label:       '',
                      nav:                 'hidden',
                      table:               'w-full border-collapse',
                      head_row:            'grid grid-cols-7 mb-2',
                      head_cell:           'text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium text-center py-1',
                      row:                 'grid grid-cols-7',
                      cell:                'text-center p-0.5',
                      day:                 cn(
                        'w-full h-12 flex items-center justify-center rounded-xl',
                        'cursor-pointer transition-colors duration-100',
                        'hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      ),
                      day_selected:        'bg-foreground text-background hover:bg-foreground/90',
                      day_today:           'ring-1 ring-foreground/30 font-bold',
                      day_outside:         'opacity-25',
                      day_disabled:        'opacity-20 cursor-not-allowed',
                      day_hidden:          'invisible',
                    }}
                    components={{
                      DayContent: CustomDayContent,
                      IconLeft:  () => null,
                      IconRight: () => null,
                    }}
                  />
                )}

                {/* ── Week view ── */}
                {view === 'week' && (
                  <WeekView weekAnchor={weekAnchor} tasks={tasks} onDayClick={handleDayClick} />
                )}

                {/* ── Day view ── */}
                {view === 'day' && (
                  <DayView
                    day={dayAnchor}
                    tasks={tasks}
                    onAddClick={() => handleDayClick(dayAnchor)}
                  />
                )}
              </div>

              {/* ── Upcoming sidebar ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Next 14 Days
                  </h2>
                </div>
                {upcoming.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">No sessions scheduled.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Click a date to assign work.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcoming.map(task => (
                      <div key={task.id}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => handleDayClick(task.date)}>
                        <span className={cn('w-2.5 h-2.5 rounded-full mt-[3px] shrink-0', TYPE_META[task.type].dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground leading-snug truncate">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isToday(task.date) ? 'Today' : format(task.date, 'EEE, MMM d')}
                          </p>
                        </div>
                        <span className={cn('shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border', TYPE_META[task.type].badge)}>
                          {task.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Sheet ── */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent className="w-full sm:max-w-[420px] flex flex-col gap-0 p-0 overflow-y-auto">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-base font-semibold">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Study Agenda'}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedDate ? format(selectedDate, 'yyyy') : ''}
                </p>
              </SheetHeader>

              <div className="flex-1 px-6 py-5 space-y-6">
                {tasksForSelected.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground">Assigned</p>
                    {tasksForSelected.map(task => (
                      <Card key={task.id} className="p-4 flex items-start gap-3 bg-card shadow-none border-border">
                        <span className={cn('w-2.5 h-2.5 rounded-full mt-0.5 shrink-0', TYPE_META[task.type].dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{task.title}</p>
                          <Badge variant="outline"
                            className={cn('mt-1.5 text-[10px] px-1.5 py-0 h-5 border font-medium', TYPE_META[task.type].badge)}>
                            {TYPE_META[task.type].label}
                          </Badge>
                        </div>
                        <button onClick={() => handleDeleteTask(task.id)}
                          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          aria-label="Remove task">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
                {tasksForSelected.length > 0 && <div className="h-px bg-border" />}

                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground">
                    {tasksForSelected.length === 0 ? 'Assign a Task' : 'Add Another'}
                  </p>
                  <Select value={newType} onValueChange={v => setNewType(v as TaskType)}>
                    <SelectTrigger className="h-10 text-sm bg-background border-border">
                      <SelectValue placeholder="Select task type…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PT">Practice Test</SelectItem>
                      <SelectItem value="Drill">Targeted Drill</SelectItem>
                      <SelectItem value="Classroom">Classroom Module</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="e.g. PT 140 Section 2, Causation Station…"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); }}
                    className="h-10 text-sm bg-background border-border"
                  />
                  <Button onClick={handleAddTask} disabled={!newType || !newTitle.trim()}
                    className="w-full h-10 text-sm font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Assign to Schedule
                  </Button>
                </div>
                {tasksForSelected.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center pt-2">
                    No sessions assigned for this day yet.
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </TooltipProvider>
    </ScheduleContext.Provider>
  );
}
