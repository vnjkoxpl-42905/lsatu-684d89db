import * as React from 'react';
import { addDays, format, isBefore, parseISO, startOfDay } from 'date-fns';
import { CalendarClock, CheckCircle2, Circle, Clock3, ExternalLink, ListChecks, Plus, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { useStudentTodo, TodoItem } from '@/hooks/useStudentTodo';
import type { ScheduleEntry } from '@/lib/scheduleEntries';
import { readTodoAction, resolveTodoRoute } from '@/lib/todoActions';
import { cn } from '@/lib/utils';

type TodoController = ReturnType<typeof useStudentTodo>;

const ymd = (date: Date) => format(date, 'yyyy-MM-dd');
const localDay = (value: string) => startOfDay(parseISO(value));

function isOverdue(item: TodoItem, today: Date): boolean {
  if (item.status === 'completed') return false;
  return isBefore(item.due_at ? new Date(item.due_at) : localDay(item.day_date), today);
}

function TaskRow({ item, todo, onOpen }: { item: TodoItem; todo: TodoController; onOpen: (entry: ScheduleEntry) => void }) {
  const done = item.status === 'completed';
  const action = readTodoAction(item.metadata_json);
  const route = resolveTodoRoute(action);
  const today = startOfDay(new Date());
  const entry: ScheduleEntry = {
    key: `todo-${item.id}`,
    id: item.id,
    sourceType: 'todo',
    kind: 'task',
    title: item.title,
    dateKey: item.day_date,
    startsAt: item.due_at ?? `${item.day_date}T12:00:00`,
    endAt: null,
    allDay: !item.due_at,
    route,
    meetUrl: null,
    calendarStatus: null,
    status: item.status,
    source: item,
  };
  const moveOptions = [
    { label: 'Today', day: ymd(today) },
    { label: 'Tomorrow', day: ymd(addDays(today, 1)) },
    { label: 'In 2 days', day: ymd(addDays(today, 2)) },
    { label: 'Next week', day: ymd(addDays(today, 7)) },
  ];

  return (
    <div className="group flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/30">
      <button type="button" aria-label={done ? 'Mark incomplete' : 'Mark complete'} onClick={() => void todo.toggleComplete(item.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
      </button>
      <button type="button" onClick={() => route ? onOpen(entry) : void todo.toggleComplete(item.id)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className={cn('block truncate text-sm font-medium', done && 'text-muted-foreground line-through')}>{item.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{item.source === 'self' ? 'Personal task' : 'Study task'}</span>
          {item.estimated_minutes ? <span>· {item.estimated_minutes} min</span> : null}
          {item.due_at ? <span>· Due {format(new Date(item.due_at), 'h:mm a')}</span> : null}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" aria-label={`Move ${item.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CalendarClock className="h-4 w-4" /></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">{moveOptions.map((option) => <DropdownMenuItem key={option.label} onClick={() => void todo.moveToDay(item.id, option.day)}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent>
      </DropdownMenu>
      {item.source === 'self' ? <button type="button" aria-label={`Delete ${item.title}`} onClick={() => void todo.deleteTask(item.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-70 hover:text-destructive hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" /></button> : null}
    </div>
  );
}

function DatedEntryRow({ entry, onOpen }: { entry: ScheduleEntry; onOpen: (entry: ScheduleEntry) => void }) {
  const session = entry.kind === 'session';
  return (
    <article className={cn('rounded-xl border px-4 py-4', session ? 'border-primary/25 bg-primary/5' : 'border-border bg-card')}>
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', session ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{session ? <Video className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{entry.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{entry.allDay ? 'Due today' : format(new Date(entry.startsAt), 'h:mm a')}{session ? ' · With Joshua' : ''}</p>
          {session && entry.calendarStatus !== 'synced' ? <p className="mt-1 text-xs text-muted-foreground">Google Calendar invite {entry.calendarStatus === 'failed' ? 'needs attention' : 'syncing'}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {session && entry.meetUrl ? <Button size="sm" asChild><a href={entry.meetUrl} target="_blank" rel="noreferrer">Join Meet<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button> : null}
        {(entry.route || session) ? <Button size="sm" variant={session && entry.meetUrl ? 'outline' : 'default'} onClick={() => onOpen(entry)}>{session ? 'Manage booking' : 'Open work'}</Button> : null}
      </div>
    </article>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = React.useState('');
  const submit = () => { const trimmed = title.trim(); if (!trimmed) return; onAdd(trimmed); setTitle(''); };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2">
      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="Add a task for today" aria-label="Task title" className="h-10 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" />
      {title.trim() ? <Button size="sm" onClick={submit}>Add</Button> : null}
    </div>
  );
}

export default function TodayAgenda({ entries, todo, onOpenEntry }: { entries: ScheduleEntry[]; todo: TodoController; onOpenEntry: (entry: ScheduleEntry) => void }) {
  const today = startOfDay(new Date());
  const overdue = todo.items.filter((item) => isOverdue(item, today));
  const overdueIds = new Set(overdue.map((item) => item.id));
  const dated = entries.filter((entry) => entry.kind !== 'task');
  const tasks = entries.filter(
    (entry): entry is ScheduleEntry & { source: TodoItem } =>
      entry.kind === 'task' && !overdueIds.has(entry.source.id),
  );
  const empty = !overdue.length && !dated.length && !tasks.length;

  return (
    <div className="grid gap-7 @[900px]/schedule:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-7">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{format(today, 'EEEE, MMMM d')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Only work and sessions scheduled for today.</p>
        </div>
        {overdue.length ? <section><h3 className="mb-3 text-sm font-semibold text-destructive">Overdue · {overdue.length}</h3><div className="space-y-2">{overdue.map((item) => <TaskRow key={item.id} item={item} todo={todo} onOpen={onOpenEntry} />)}</div></section> : null}
        {dated.length ? <section><h3 className="mb-3 text-sm font-semibold">Scheduled · {dated.length}</h3><div className="space-y-3">{dated.map((entry) => <DatedEntryRow key={entry.key} entry={entry} onOpen={onOpenEntry} />)}</div></section> : null}
        {tasks.length ? <section><h3 className="mb-3 text-sm font-semibold">Tasks · {tasks.length}</h3><div className="space-y-2">{tasks.map((entry) => <TaskRow key={entry.key} item={entry.source} todo={todo} onOpen={onOpenEntry} />)}</div></section> : null}
        {empty ? <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center"><ListChecks className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Today is clear.</p><p className="mt-1 text-xs text-muted-foreground">Add a personal task or use Calendar to plan ahead.</p></div> : null}
        <AddTask onAdd={(title) => void todo.addTask({ title, day_date: ymd(today) })} />
      </section>
      <aside className="rounded-xl border border-border bg-muted/25 p-5">
        <h2 className="text-base font-semibold">Today at a glance</h2>
        <dl className="mt-4 grid grid-cols-3 gap-3 @[900px]/schedule:grid-cols-1">
          <div><dt className="text-xs text-muted-foreground">Sessions</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{dated.filter((entry) => entry.kind === 'session').length}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Due work</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{dated.filter((entry) => entry.kind === 'work').length}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Personal</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{tasks.length}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
