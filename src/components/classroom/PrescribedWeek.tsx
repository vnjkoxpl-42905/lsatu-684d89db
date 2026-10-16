import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Circle, CircleDashed, Lock, MinusCircle } from 'lucide-react';
import { useCurrentWeeklyPlan } from '@/hooks/useWeeklyPlan';
import { routeWithReturnTo } from '@/hooks/useAssignedTodoFeed';
import { localDayISO } from '@/lib/localDate';
import {
  buildPrescribedWeek,
  estimateSummary,
  formatMinutes,
  type PlanRelation,
  type PrescribedTask,
  type PrescribedWeek as PrescribedWeekModel,
} from '@/lib/weeklyPlanWeek';

/**
 * One prescribed week, scannable top to bottom: each day with its tasks in
 * Joshua's order, the stored status of each, the time he estimated when he
 * gave one, and what "finished" means for the week.
 *
 * Read-only. Opening a task goes to its page and changes nothing; status only
 * moves when the work itself is saved or the task is checked off.
 *
 * `audience="teacher"` renders the same model on the Weekly Plans page, with
 * no student links, so both sides see the same week.
 */

type Audience = 'student' | 'teacher';

const RELATION_NOTE: Record<PlanRelation, string | null> = {
  current: null,
  upcoming: 'This plan starts soon. Nothing is published for this week yet.',
  past: 'This is your most recent plan. Nothing newer has been published yet.',
};

function StatusIcon({ task }: { task: PrescribedTask }) {
  const cls = 'h-4 w-4 shrink-0';
  if (task.status === 'completed') return <CheckCircle2 className={`${cls} text-emerald-600`} aria-hidden="true" />;
  if (task.status === 'skipped') return <MinusCircle className={cls} aria-hidden="true" />;
  if (task.locked) return <Lock className={cls} aria-hidden="true" />;
  if (task.status === 'in_progress') return <CircleDashed className={cls} aria-hidden="true" />;
  return <Circle className={cls} aria-hidden="true" />;
}

const timeFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });

function TaskBody({ task }: { task: PrescribedTask }) {
  const meta: string[] = [];
  meta.push(task.estimateMinutes !== null ? `About ${formatMinutes(task.estimateMinutes)}` : 'No time estimate');
  if (task.locked && task.unlockAt) meta.push(`Opens ${timeFormat.format(new Date(task.unlockAt))}`);
  else if (task.dueAt && task.status !== 'completed' && task.status !== 'skipped') {
    meta.push(`Due ${timeFormat.format(new Date(task.dueAt))}`);
  }
  return (
    <>
      <span className="flex min-w-0 items-start gap-2">
        <StatusIcon task={task} />
        <span className="grid min-w-0 gap-0.5">
          <strong className="font-medium">
            <span className="sr-only">Step </span>
            {task.step}. {task.title}
          </strong>
          {task.instructions ? <small className="whitespace-pre-line">{task.instructions}</small> : null}
          <small>{meta.join(' · ')}</small>
        </span>
      </span>
      <span className="student-work-status shrink-0">{task.statusLabel}</span>
    </>
  );
}

export function PrescribedWeekView({
  week,
  relation = 'current',
  audience = 'student',
}: {
  week: PrescribedWeekModel;
  relation?: PlanRelation;
  audience?: Audience;
}) {
  const { pathname } = useLocation();
  const { totals } = week;
  const estimate = estimateSummary(totals);
  const headingId = React.useId();
  const teacher = audience === 'teacher';
  const note = teacher ? null : RELATION_NOTE[relation];

  const renderTask = (task: PrescribedTask) => {
    const linkable = !teacher && task.href && !task.locked;
    return (
      <li key={task.id} data-testid="prescribed-task">
        {linkable ? (
          <Link
            to={routeWithReturnTo(task.href as string, pathname)}
            className="student-work-row"
            aria-label={`Open step ${task.step}, ${task.title}. ${task.statusLabel}.`}
          >
            <TaskBody task={task} />
          </Link>
        ) : (
          <div className={teacher ? 'flex items-start justify-between gap-3 py-2' : 'student-work-row'}>
            <TaskBody task={task} />
          </div>
        )}
      </li>
    );
  };

  return (
    <section
      aria-labelledby={headingId}
      className={teacher ? 'space-y-3 text-sm text-zinc-200' : 'student-work-list prescribed-week'}
    >
      <header className="grid gap-1">
        <h2 id={headingId} className="text-base font-semibold">
          {teacher ? week.title : `Your week: ${week.title}`}
        </h2>
        <p className="student-destination-message">{week.rangeLabel}</p>
        {note ? <p className="student-destination-message">{note}</p> : null}
        <p className="student-destination-message" data-testid="prescribed-week-counts">
          {totals.completed} of {totals.required} done
          {totals.inProgress > 0 ? `, ${totals.inProgress} in progress` : ''}
          {totals.skipped > 0 ? `, ${totals.skipped} skipped` : ''}
          {totals.unknownStatus > 0 ? `, ${totals.unknownStatus} with a status we could not read` : ''}.
          {estimate ? ` ${estimate}` : ''}
        </p>
        <p className="student-destination-message" data-testid="prescribed-week-finish">
          {week.finished ? 'Finished. Every task this week shows Completed.' : week.finishCriterion}
        </p>
        {teacher ? null : (
          <p className="student-destination-message">
            Tasks are in the order Joshua set. Opening one does not mark it started or done.
          </p>
        )}
      </header>

      <ol className="mt-3 grid gap-3" aria-label="Days">
        {week.days.map((day) => (
          <li key={day.iso} aria-current={day.isToday ? 'date' : undefined}>
            <h3 className="text-sm font-semibold">
              {day.label}
              {day.isToday ? ' (today)' : ''}
            </h3>
            {day.tasks.length === 0 ? (
              <p className="student-destination-message">No tasks.</p>
            ) : (
              <ul>{day.tasks.map(renderTask)}</ul>
            )}
          </li>
        ))}
        {week.outsideWeek.length > 0 ? (
          <li>
            <h3 className="text-sm font-semibold">Moved outside this week</h3>
            <ul>{week.outsideWeek.map(renderTask)}</ul>
          </li>
        ) : null}
        {week.undated.length > 0 ? (
          <li>
            <h3 className="text-sm font-semibold">No date set</h3>
            <ul>{week.undated.map(renderTask)}</ul>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

/** Student wrapper: reads the signed-in student's prescribed week. */
export default function PrescribedWeek() {
  const { data, isLoading, isError, isFetching, refetch } = useCurrentWeeklyPlan();
  const week = React.useMemo(() => {
    if (!data?.plan) return null;
    return buildPrescribedWeek(data.plan, data.items, new Date(), localDayISO());
  }, [data]);

  const retryButton = (
    <button type="button" className="classroom-button" onClick={() => void refetch()} disabled={isFetching}>
      Load the weekly plan again
    </button>
  );

  if (isLoading) {
    return (
      <p className="student-destination-message" role="status">
        Loading your weekly plan…
      </p>
    );
  }
  // Nothing loaded yet and the first read failed: there is no week to show.
  if (isError && !data) {
    return (
      <div className="student-destination-message" role="alert">
        <p>We could not load your weekly plan. Your assignments below are not affected.</p>
        {retryButton}
      </div>
    );
  }
  // A refresh failed but an earlier read succeeded: keep showing that week,
  // and say it may be out of date.
  const staleWarning = isError ? (
    <div className="student-destination-message" role="alert" data-testid="prescribed-week-stale">
      <p>We could not refresh your weekly plan. This is what was last loaded, so a status may be out of date.</p>
      {retryButton}
    </div>
  ) : null;
  // No published plan: say nothing rather than invent a week. The to-do list
  // below still shows every assignment.
  if (!week || !data) return staleWarning;
  return (
    <>
      {staleWarning}
      <PrescribedWeekView week={week} relation={data.relation ?? 'current'} />
    </>
  );
}
