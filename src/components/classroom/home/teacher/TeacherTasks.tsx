import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type {
  TeachingDesk,
  DeskRegion,
  ManualTask,
  DeskPage,
} from "./teachingDeskModel";
import type { PostSessionHomeState, PostSessionTask } from "./postSessionModel";
import type { TeacherStudentRow } from "./teacherHomeModel";
import { SessionTask } from "./PostSessionWork";
export function DeskStatus({
  region,
  noun,
  setupLabel,
}: {
  region: DeskRegion<unknown>;
  noun: string;
  setupLabel?: string;
}) {
  return (
    <>
      {region.state === "loading" ? (
        <p className="home-desk-empty" aria-busy="true">
          Loading {noun}…
        </p>
      ) : region.state === "error" ? (
        <p className="home-desk-empty" role="alert">
          Could not load {noun}.{" "}
          <button disabled={region.retryBlocked} onClick={region.retry}>
            {region.retryBlocked ? "Try again shortly" : "Try again"}
          </button>
        </p>
      ) : region.state === "setup" ? (
        <p className="home-desk-empty">
          {setupLabel ?? `${noun} is not connected yet.`}{" "}
          {region.retry ? (
            <button disabled={region.retryBlocked} onClick={region.retry}>
              {region.retryBlocked ? "Check again shortly" : "Check connection"}
            </button>
          ) : null}
        </p>
      ) : null}
      {region.stale ? (
        <p className="home-desk-empty" role="status">
          Could not refresh. Showing the last saved {noun}.{" "}
          <button disabled={region.retryBlocked} onClick={region.retry}>
            {region.retryBlocked ? "Retry shortly" : "Retry"}
          </button>
        </p>
      ) : null}
    </>
  );
}
function ManualRow({ task, desk }: { task: ManualTask; desk: TeachingDesk }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [blocker, setBlocker] = React.useState(task.blocker ?? "");
  const save = async (action: "edit" | "handle" | "reopen") => {
    setBusy(true);
    setError("");
    try {
      await desk.mutateManual?.(task, { action, blocker: blocker || null });
    } catch {
      setError("Could not save. Your task has not changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="home-desk-manual-row">
      <div className="home-desk-manual-line">
        <button
          className="home-desk-check"
          disabled={busy || !desk.mutateManual}
          aria-label={`${task.handled_at ? "Reopen" : "Handle"} ${task.title}`}
          onClick={() => void save(task.handled_at ? "reopen" : "handle")}
        >
          {task.handled_at ? "✓" : ""}
        </button>
        <div>
          <b>{task.title}</b>
          {task.student_name ? (
            <small>
              {task.student_name}
              {task.kind === "consultation" ? " · Consultation" : ""}
            </small>
          ) : null}
          {task.kind === "consultation" ? (
            <small>
              {task.source_state === "cancelled"
                ? "Consultation cancelled"
                : task.source_state === "rescheduled"
                  ? "Consultation rescheduled"
                  : task.source_state === "unavailable"
                    ? "Calendar event unavailable"
                    : "Consultation follow-up"}
            </small>
          ) : null}
          {task.blocker ? (
            <small className="home-desk-blocked">Blocked: {task.blocker}</small>
          ) : null}
        </div>
      </div>
      <details className="home-desk-blocker">
        <summary>Blocker</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save("edit");
          }}
        >
          <label>
            What is holding this up?
            <input
              value={blocker}
              maxLength={1000}
              onChange={(e) => setBlocker(e.target.value)}
            />
          </label>
          <button disabled={busy || !desk.mutateManual}>Save blocker</button>
        </form>
      </details>
      {error ? <p role="alert">{error}</p> : null}
    </li>
  );
}
export interface CompletedAssignmentRow {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  content: React.ReactNode;
}

export interface TaskBoardAdditions {
  pendingCount: number;
  pending: React.ReactNode;
  completed: CompletedAssignmentRow[];
  planning: React.ReactNode;
  loading: boolean;
}

export function MyList({
  desk,
  students,
  onAll,
  additionalTasks,
  historyRevision,
}: {
  desk: TeachingDesk;
  students: TeacherStudentRow[];
  onAll: (includeDone: boolean, trigger: HTMLButtonElement) => void;
  additionalTasks?: TaskBoardAdditions;
  historyRevision?: number;
}) {
  const headingId = React.useId();
  const [adding, setAdding] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [studentId, setStudentId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState<ManualTask[]>([]);
  const [doneError, setDoneError] = React.useState(false);
  const [doneLoading, setDoneLoading] = React.useState(false);
  const [doneTotal, setDoneTotal] = React.useState(0);
  const [doneRefresh, refreshDone] = React.useReducer((current: number) => current + 1, 0);
  const hasDoneLoader = Boolean(desk.loadManual);
  const mutateManual = desk.mutateManual;
  const loader = React.useRef(desk.loadManual);
  loader.current = desk.loadManual;
  React.useEffect(() => {
    const load = loader.current;
    if (!load) return;
    let active = true;
    setDoneLoading(true);
    setDoneError(false);
    void load(true, null, null, null).then((page) => {
      if (active) {
        setDone(page.items);
        setDoneTotal(page.total);
      }
    }).catch(() => {
      if (active) setDoneError(true);
    }).finally(() => {
      if (active) setDoneLoading(false);
    });
    return () => { active = false; };
  }, [desk.actorId, hasDoneLoader, doneRefresh, historyRevision]);
  const boardDesk: TeachingDesk = mutateManual ? {
    ...desk,
    mutateManual: async (task, input) => {
      await mutateManual(task, input);
      if (input.action === "handle" || input.action === "reopen") refreshDone();
    },
  } : desk;
  const tasks = desk.manual.data?.items ?? [];
  const openCount = (desk.manual.data?.total ?? 0) + (additionalTasks?.pendingCount ?? 0);
  const completedCount = (hasDoneLoader ? doneTotal : 0) + (additionalTasks?.completed.length ?? 0);
  const hasMoreOpen = (desk.manual.data?.total ?? 0) > tasks.length;
  const visibleDone = (hasDoneLoader ? done : []).filter((item) => !tasks.some((task) => task.id === item.id)).slice(0, 2);
  return (
    <section
      className="classroom-home-region home-desk-my-list teacher-task-board"
      id="home-my-list"
      aria-labelledby={headingId}
    >
      <header className="classroom-home-region-head">
        <h2 id={headingId}>Tasks</h2>
        {desk.manual.state === "ready" && !additionalTasks?.loading && openCount > 0 ? (
          <span className="classroom-home-count" aria-label={`${openCount} to do`}>
            {openCount}
          </span>
        ) : null}
        <button
          className="classroom-home-more"
          type="button"
          onClick={() => setAdding(!adding)}
          aria-expanded={adding}
          disabled={!desk.mutateManual}
        >
          {adding ? "Cancel" : "Add a to-do"}
        </button>
      </header>
      <DeskStatus region={desk.manual} noun="private tasks" setupLabel="Private tasks are not connected." />
      {desk.pendingManual ? (
        <div className="home-desk-confirm" role="status">
          <p>
            The earlier task request “{desk.pendingManual.title}” may already
            have saved. Confirm that original request before creating another
            task.
          </p>
          <button
            disabled={busy || !desk.retryManualCreate}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await desk.retryManualCreate?.();
              } catch {
                setError(
                  "Could not confirm the original task. Its request has been preserved; try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Checking original task…" : "Confirm original task"}
          </button>
        </div>
      ) : null}
      {desk.pendingManualError ? (
        <p role="alert">{desk.pendingManualError}</p>
      ) : null}

      {!adding && error ? <p role="alert">{error}</p> : null}
      {adding ? (
        <form
          className="classroom-home-task-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            setBusy(true);
            setError("");
            try {
              await desk.mutateManual?.(null, {
                action: "create",
                title: title.trim(),
                studentId: studentId || null,
              });
              setTitle("");
              setAdding(false);
            } catch {
              setError("Could not add your task. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Task
            <input
              value={title}
              maxLength={500}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Student (optional)
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">Just for me</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="home-desk-primary"
            disabled={
              busy ||
              !desk.mutateManual ||
              !!desk.pendingManual ||
              !!desk.pendingManualError
            }
          >
            {busy ? "Saving…" : "Add private task"}
          </button>
          {error ? <p role="alert">{error}</p> : null}
        </form>
      ) : null}
      <div className="teacher-board-columns">
        <section aria-labelledby={headingId + "-todo"}>
          <h3 id={headingId + "-todo"}>To do</h3>
          {tasks.length ? <ul className="home-desk-manual-list">
            {tasks.map((task) => <ManualRow key={task.id} task={task} desk={boardDesk} />)}
          </ul> : desk.manual.state === "ready" && !openCount && !additionalTasks?.loading ? <p className="home-desk-empty">No open tasks.</p> : null}
          {additionalTasks?.pending}
        </section>
        <section aria-labelledby={headingId + "-done"}>
          <h3 id={headingId + "-done"}>Done</h3>
          {doneTotal > visibleDone.length && <p>{completedCount} completed</p>}
          {doneLoading && !done.length && <p role="status">Loading completed tasks…</p>}
          {doneError && <p role="alert">Could not load completed tasks. <button type="button" onClick={refreshDone}>Retry</button></p>}
          {visibleDone.length ? (
            <ul className="home-desk-manual-list">
              {visibleDone.map((task) => <ManualRow key={task.id} task={task} desk={boardDesk} />)}
            </ul>
          ) : !doneLoading && !doneError && !completedCount && !additionalTasks?.loading ? (
            <p className="home-desk-empty">No completed tasks shown.</p>
          ) : null}
          {additionalTasks?.completed.map((assignment) => (
            <React.Fragment key={assignment.id}>{assignment.content}</React.Fragment>
          ))}
        </section>
      </div>
      {additionalTasks?.planning}
      <button type="button" className="classroom-home-more" onClick={(event) => onAll(!hasMoreOpen, event.currentTarget)}>
        {hasMoreOpen ? "All tasks and history" : "Task history"}
      </button>
    </section>
  );
}
export function AllTasksSheet({
  open,
  onClose,
  onCloseAutoFocus,
  onManualChange,
  initialHandled = false,
  completedAssignments,
  desk,
  work,
  students,
  onOpen,
}: {
  open: boolean;
  initialHandled?: boolean;
  completedAssignments?: CompletedAssignmentRow[];
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  onManualChange?: () => void;
  desk: TeachingDesk;
  work?: PostSessionHomeState;
  students: TeacherStudentRow[];
  onOpen: (route: string) => void;
}) {
  const [kind, setKind] = React.useState("manual");
  const [handled, setHandled] = React.useState(initialHandled);
  const [student, setStudent] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState<DeskPage<any> | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const generation = React.useRef(0);
  const actor = desk.actorId;
  const filterKey = JSON.stringify([kind, handled, student, actor, open]);
  const activeFilter = React.useRef(filterKey);
  activeFilter.current = filterKey;
  const load = React.useCallback(
    async (cursor: string | null = null) => {
      if (activeFilter.current !== filterKey) return;
      const version = ++generation.current;
      setBusy(true);
      setError("");
      try {
        const fn = kind === "session" ? desk.loadSessions : desk.loadManual;
        if (!fn) throw new Error("Not connected");
        const next =
          kind === "session"
            ? await desk.loadSessions!(handled, cursor, student || null)
            : await desk.loadManual!(
                handled,
                cursor,
                student || null,
                kind === "consultation" ? "consultation" : null,
              );
        if (generation.current === version)
          setPage((previous) =>
            cursor && previous
              ? { ...next, items: [...previous.items, ...next.items] }
              : next,
          );
      } catch {
        if (generation.current === version)
          setError("Could not load these tasks. Try again.");
      } finally {
        if (generation.current === version) setBusy(false);
      }
    },
    [kind, handled, student, desk.loadSessions, desk.loadManual, filterKey],
  );
  // Depend on filter values, not callback identities refreshed with every live render.
  React.useEffect(() => {
    if (open) {
      setPage(null);
      void load();
    }
    return () => {
      generation.current++;
    };
  }, [open, kind, handled, student, actor]);
  const filtered = (page?.items ?? []).filter(
    (task: any) =>
      (kind !== "consultation" || task.kind === "consultation") &&
      `${task.title ?? task.student_name ?? ""} ${task.blocker ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const includeAssignments = kind === "manual" && handled && completedAssignments !== undefined;
  const assignmentsForStudent = includeAssignments
    ? completedAssignments.filter((assignment) => !student || student === assignment.studentId)
    : [];
  const filteredAssignments = assignmentsForStudent.filter(({ title, studentName }) =>
    `${title} ${studentName}`.toLowerCase().includes(query.toLowerCase()),
  );
  const assignmentStudents = new Map((completedAssignments ?? []).map(({ studentId, studentName }) => [studentId, studentName]));
  for (const registered of students) assignmentStudents.delete(registered.id);
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <SheetContent
        className="home-desk-sheet"
        overlayClassName="home-desk-overlay"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetTitle>All tasks</SheetTitle>
        <SheetDescription>
          Your private teaching work. Opening a link never marks it handled.
        </SheetDescription>
        {work?.error ? <p role="alert">{work.error}</p> : null}
        <div className="home-desk-filters">
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="session">After-session</option>
              <option value="manual">{includeAssignments ? "Tasks & assignments" : "Private tasks"}</option>
              <option value="consultation">Consultations</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={handled ? "handled" : "active"}
              onChange={(e) => setHandled(e.target.value === "handled")}
            >
              <option value="active">Active</option>
              <option value="handled">Handled</option>
            </select>
          </label>
          <label>
            Student
            <select
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {[...assignmentStudents].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>
            Search loaded tasks
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Task, student or blocker"
            />
          </label>
        </div>
        {page ? (
          <p className="home-desk-empty">
            {includeAssignments
              ? `${page.total + assignmentsForStudent.length} completed · ${page.total} private tasks · ${assignmentsForStudent.length} assignment${assignmentsForStudent.length === 1 ? "" : "s"}`
              : `${page.total} ${handled ? "handled" : "active"} ${kind === "session" ? "session tasks" : "list tasks"}`}
            {query ? " · Search applies to loaded rows" : ""}
          </p>
        ) : null}
        {filteredAssignments.length > 0 && (
          <section aria-label="Completed assignments">
            {filteredAssignments.map((assignment) => (
              <React.Fragment key={assignment.id}>{assignment.content}</React.Fragment>
            ))}
          </section>
        )}
        {page?.student_counts?.length && student ? (
          <p className="home-desk-empty">
            {(() => {
              const c = page?.student_counts?.find(
                (c) => c.student_id === student,
              );
              return c
                ? `${c.handled} of ${c.total} list tasks handled · ${c.blocked} blocked`
                : "";
            })()}
          </p>
        ) : null}
        {error ? (
          <p role="alert">
            {error} <button onClick={() => void load()}>Retry</button>
          </p>
        ) : null}
        <ul className="classroom-home-task-list">
          {filtered.map((task) =>
            kind === "session" ? (
              <SessionTask
                key={task.id}
                task={task as PostSessionTask}
                work={{
                  ...work!,
                  update: async (t, c) => {
                    await work?.update?.(t, c);
                    await load();
                  },
                }}
                students={students}
                onOpen={onOpen}
                expanded={expanded === task.id}
                onToggle={() =>
                  setExpanded(expanded === task.id ? null : task.id)
                }
              />
            ) : (
              <ManualRow
                key={task.id}
                task={task}
                desk={{
                  ...desk,
                  mutateManual: async (t, c) => {
                    await desk.mutateManual?.(t, c);
                    if (c.action === "handle" || c.action === "reopen") onManualChange?.();
                    await load();
                  },
                }}
              />
            ),
          )}
        </ul>
        {busy ? (
          <p aria-busy="true">Loading tasks…</p>
        ) : page && !filtered.length && !filteredAssignments.length ? (
          <p>No tasks in this view.</p>
        ) : null}
        {page?.next_cursor ? (
          <button
            className="home-desk-primary"
            disabled={busy}
            onClick={() => void load(page.next_cursor)}
          >
            Load more
          </button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
