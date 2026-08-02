import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useStudentTodo } from "@/hooks/useStudentTodo";
import { useAssignedTodoFeed } from "@/hooks/useAssignedTodoFeed";
import { readTodoAction, resolveTodoRoute } from "@/lib/todoActions";
import { localDayISO } from "@/lib/localDate";

/**
 * One row of the list, flattened from either source. `onToggle` is present only
 * when checking the bubble really writes something (study-plan tasks). Assigned
 * homework/drills carry their completion state from the assignment itself, so
 * their bubble reports status instead of pretending to be a control.
 */
export interface TodoRowModel {
  key: string;
  title: string;
  meta: string;
  done: boolean;
  route: string | null;
  onToggle?: () => void;
}

function Row({ row, onOpen }: { row: TodoRowModel; onOpen: (route: string) => void }) {
  const mark = row.done ? <CheckCircle2 size={20} /> : <Circle size={20} />;
  const bubbleClass = `classroom-today-check${row.done ? " classroom-today-check-done" : ""}`;

  return (
    <div className="classroom-today-row">
      {row.onToggle ? (
        <button
          type="button"
          className={bubbleClass}
          aria-pressed={row.done}
          aria-label={row.done ? `Mark "${row.title}" not done` : `Mark "${row.title}" done`}
          onClick={row.onToggle}
        >
          {mark}
        </button>
      ) : (
        <span
          className={`${bubbleClass} classroom-today-check-static`}
          role="img"
          aria-label={row.done ? "Completed" : "Not started"}
        >
          {mark}
        </span>
      )}

      <div className={`classroom-today-panel${row.done ? " classroom-today-panel-done" : ""}`}>
        <div className="classroom-today-text">
          <p className="classroom-today-title">{row.title}</p>
          <p className="classroom-today-meta">{row.meta}</p>
        </div>
        {row.route && !row.done ? (
          <button
            type="button"
            className="classroom-today-start"
            onClick={() => onOpen(row.route!)}
          >
            Start
            <ArrowRight size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Presentational half, split out so it can be rendered with fixture rows in a
 * test (the live card needs an authenticated Supabase session).
 */
export function TodayTodoCardView({
  rows,
  loading,
  onOpen,
}: {
  rows: TodoRowModel[];
  loading: boolean;
  onOpen: (route: string) => void;
}) {
  const doneCount = rows.filter((row) => row.done).length;

  if (loading) {
    return (
      <section className="classroom-today" aria-label="To-do">
        <div className="classroom-skeleton-stack">
          <span className="classroom-skeleton" />
          <span className="classroom-skeleton" />
        </div>
      </section>
    );
  }

  return (
    <section className="classroom-today" aria-label="To-do">
      <header className="classroom-today-header">
        <h2>To-do</h2>
        {rows.length ? (
          <span className="classroom-today-tally">
            {doneCount} of {rows.length} done
          </span>
        ) : null}
      </header>

      {rows.length ? (
        <div className="classroom-today-rows">
          {rows.map((row) => (
            <Row key={row.key} row={row} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="classroom-today-empty">
          <p>Nothing due today.</p>
          <button
            type="button"
            className="classroom-button"
            onClick={() => onOpen("/schedule")}
          >
            Plan your day
          </button>
        </div>
      )}
    </section>
  );
}

const ASSIGNED_LABEL: Record<string, string> = {
  homework: "Homework",
  ta: "From Joshua",
  activity: "Activity",
  guided: "Guided drill",
};

/**
 * The homepage list: study-plan tasks due today or overdue, plus every open
 * assignment. Study-plan bubbles persist (they write weekly_plan_items.status
 * through useStudentTodo); assignment bubbles mirror the assignment's own state.
 */
export default function TodayTodoCard() {
  const navigate = useNavigate();
  const { items, loading, error, toggleComplete } = useStudentTodo();
  const { rows: assigned, loading: assignedLoading } = useAssignedTodoFeed();

  const today = localDayISO();

  const rows = React.useMemo<TodoRowModel[]>(() => {
    const planRows = items
      .filter((item) => item.day_date <= today && item.status !== "skipped")
      .sort((a, b) => {
        if (a.day_date !== b.day_date) return a.day_date < b.day_date ? -1 : 1;
        return a.sort_order - b.sort_order;
      })
      .map<TodoRowModel>((item) => {
        const action = readTodoAction(item.metadata_json);
        const minutes = item.estimated_minutes ? `${item.estimated_minutes} min` : null;
        return {
          key: `plan:${item.id}`,
          title: item.title,
          meta: [item.instructions?.trim() || null, minutes].filter(Boolean).join(" · "),
          done: item.status === "completed",
          route: resolveTodoRoute(action, "/classroom"),
          onToggle: () => void toggleComplete(item.id),
        };
      });

    // Anything already ticked off on the assignment itself is finished business;
    // only what is still owed belongs on the homepage.
    const assignedRows = assigned
      .filter((row) => row.status !== "completed")
      .map<TodoRowModel>((row) => ({
        key: `assigned:${row.key}`,
        title: row.title,
        meta: [ASSIGNED_LABEL[row.kind] ?? "Assigned", row.subtitle].filter(Boolean).join(" · "),
        done: false,
        route: row.route,
      }));

    return [...planRows, ...assignedRows];
  }, [assigned, items, today, toggleComplete]);

  if (error) return null;

  return (
    <TodayTodoCardView
      rows={rows}
      loading={loading || assignedLoading}
      onOpen={(route) => navigate(route)}
    />
  );
}
