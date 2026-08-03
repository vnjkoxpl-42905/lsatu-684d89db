import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, startOfDay, isBefore, addDays } from 'date-fns';
import {
  CheckCircle2, Circle, Trash2, Plus, CalendarClock,
  ExternalLink, Clock, Loader2, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useStudentTodo, type TodoItem } from '@/hooks/useStudentTodo';
import { readTodoAction, resolveTodoRoute } from '@/lib/todoActions';
import {
  useAssignedTodoFeed,
  routeWithReturnTo,
  type AssignedTodoRow,
} from '@/hooks/useAssignedTodoFeed';

const KIND_LABEL: Record<string, string> = {
  drill: 'Drill',
  homework: 'Homework',
  bootcamp: 'Bootcamp',
  plain: 'Task',
};

/** yyyy-MM-dd for a Date, local. */
function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function isOverdue(item: TodoItem, today: Date): boolean {
  if (item.status === 'completed') return false;
  if (item.due_at) return isBefore(new Date(item.due_at), today);
  return isBefore(startOfDay(new Date(item.day_date)), today);
}

function TaskRow({
  item,
  onToggle,
  onMove,
  onDelete,
  onOpen,
}: {
  item: TodoItem;
  onToggle: (id: string) => void;
  onMove: (id: string, day: string) => void;
  onDelete: (id: string) => void;
  onOpen: (item: TodoItem) => void;
}) {
  const done = item.status === 'completed';
  const action = readTodoAction(item.metadata_json);
  const route = resolveTodoRoute(action);
  const today = startOfDay(new Date());
  const moveOptions = [
    { label: 'Today', day: ymd(today) },
    { label: 'Tomorrow', day: ymd(addDays(today, 1)) },
    { label: 'In 2 days', day: ymd(addDays(today, 2)) },
    { label: 'Next week', day: ymd(addDays(today, 7)) },
  ];

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
      <button
        type="button"
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        onClick={() => onToggle(item.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <button
        type="button"
        onClick={() => (route ? onOpen(item) : onToggle(item.id))}
        className="flex-1 min-w-0 text-left"
      >
        <p className={cn('text-sm font-medium truncate', done && 'line-through text-muted-foreground')}>
          {item.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{KIND_LABEL[action.kind] ?? 'Task'}</span>
          {item.source === 'self' && <span className="text-muted-foreground/70">· yours</span>}
          {item.estimated_minutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.estimated_minutes}m
            </span>
          ) : null}
          {item.due_at ? <span>· Due {format(new Date(item.due_at), 'MMM d')}</span> : null}
        </p>
      </button>

      {route && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpen(item)}
          className="shrink-0 h-8 px-2 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          Open
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Move to another day"
            className="shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <CalendarClock className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {moveOptions.map((o) => (
            <DropdownMenuItem key={o.label} onClick={() => onMove(item.id, o.day)}>
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Delete task"
        onClick={() => onDelete(item.id)}
        className="shrink-0 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddTaskRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = React.useState('');
  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle('');
  };
  return (
    <div className="flex items-center gap-2 px-2">
      <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder="Add your own task for today…"
        className="h-9 border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent"
      />
      {title.trim() && (
        <Button size="sm" onClick={submit} className="h-8 px-3 text-xs shrink-0">
          Add
        </Button>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="space-y-2.5">
      <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold px-1">
        {title} · {count}
      </h3>
      {children}
    </div>
  );
}

const KIND_ICON: Record<AssignedTodoRow['kind'], string> = {
  homework: 'Homework',
  ta: 'From Joshua',
  activity: 'Activity',
  guided: 'Guided drill',
  bootcamp: 'Bootcamp',
  plan: 'Weekly plan',
};

const STATUS_LABEL: Record<AssignedTodoRow['status'], string> = {
  assigned: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

function AssignedRow({ row, onOpen }: { row: AssignedTodoRow; onOpen: (r: AssignedTodoRow) => void }) {
  const done = row.status === 'completed';
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors text-left"
    >
      <span className="shrink-0" aria-hidden>
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', done && 'line-through text-muted-foreground')}>
          {row.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{KIND_ICON[row.kind]}</span>
          <span>·</span>
          <span>{row.subtitle}</span>
          <span>·</span>
          <span className={cn(done && 'text-emerald-600')}>{STATUS_LABEL[row.status]}</span>
        </p>
      </span>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function TodayAgenda() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { items, loading, toggleComplete, moveToDay, addTask, deleteTask } = useStudentTodo();
  const { rows: assigned, loading: assignedLoading } = useAssignedTodoFeed();
  const today = startOfDay(new Date());
  const todayKey = ymd(today);

  const openItem = (item: TodoItem) => {
    const route = resolveTodoRoute(readTodoAction(item.metadata_json));
    if (route) navigate(route);
  };

  // Finishing a guided drill returns to whichever surface launched it.
  const openAssigned = (r: AssignedTodoRow) =>
    navigate(routeWithReturnTo(r.route, pathname));

  const overdue = items.filter((i) => isOverdue(i, today));
  const todays = items.filter(
    (i) => !isOverdue(i, today) && ymd(startOfDay(new Date(i.day_date))) === todayKey,
  );

  const openAssigned$ = assigned.filter((r) => r.status !== 'completed');
  const doneAssigned = assigned.filter((r) => r.status === 'completed');

  if (loading || assignedLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading…
      </div>
    );
  }

  const empty =
    overdue.length === 0 && todays.length === 0 && assigned.length === 0;

  return (
    <div className="max-w-2xl space-y-8">
      <Section title="Overdue" count={overdue.length}>
        <div className="space-y-2">
          {overdue.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              onToggle={toggleComplete}
              onMove={moveToDay}
              onDelete={deleteTask}
              onOpen={openItem}
            />
          ))}
        </div>
      </Section>

      <Section title="Assigned by Joshua" count={openAssigned$.length}>
        <div className="space-y-2">
          {openAssigned$.map((r) => (
            <AssignedRow key={r.key} row={r} onOpen={openAssigned} />
          ))}
        </div>
      </Section>

      <div className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold px-1">
          Today · {format(today, 'EEEE, MMM d')}
        </h3>
        {todays.length > 0 ? (
          <div className="space-y-2">
            {todays.map((item) => (
              <TaskRow
                key={item.id}
                item={item}
                onToggle={toggleComplete}
                onMove={moveToDay}
                onDelete={deleteTask}
                onOpen={openItem}
              />
            ))}
          </div>
        ) : (
          empty && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <ListChecks className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Nothing scheduled for today.</p>
              <p className="text-xs text-muted-foreground mt-1">Add your own task below, or check the calendar.</p>
            </div>
          )
        )}
        <AddTaskRow onAdd={(title) => addTask({ title, day_date: todayKey })} />
      </div>

      <Section title="Recently completed" count={doneAssigned.length}>
        <div className="space-y-2">
          {doneAssigned.slice(0, 8).map((r) => (
            <AssignedRow key={r.key} row={r} onOpen={openAssigned} />
          ))}
        </div>
      </Section>
    </div>
  );
}
