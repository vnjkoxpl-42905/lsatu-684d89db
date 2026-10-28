import * as React from "react";
import type { TeacherStudentRow } from "./teacherHomeModel";
import {
  calendarCheckIsStale,
  safeDriveFolderUrl,
  transcriptIdFromUrl,
  transcriptUrl,
  type PostSessionHomeState,
  type PostSessionTask,
} from "./postSessionModel";
export function SessionTask({
  task,
  work,
  students,
  onOpen,
  expanded = true,
  onToggle,
}: {
  task: PostSessionTask;
  work: PostSessionHomeState;
  students: TeacherStudentRow[];
  onOpen: (route: string) => void;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const [blocker, setBlocker] = React.useState(task.blocker ?? "");
  const [link, setLink] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);
  const [studentId, setStudentId] = React.useState("");
  const disabled = !!work.savingId || !work.update;
  const doc = transcriptUrl(task.transcript_doc_id);
  const folder = safeDriveFolderUrl(task.drive_folder_url);
  const id = React.useId();
  const date = new Date(task.starts_at);
  const dateLabel = Number.isNaN(date.getTime())
    ? "Session time unavailable"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
  const sourceLabel = {
    ended: "Scheduled time ended",
    rescheduled: "Session rescheduled",
    cancelled: "Session cancelled",
    unavailable: "Calendar event unavailable",
  }[task.source_state];
  const remaining = [
    !task.recap_done && "Recap",
    !task.recap_posted && "Post recap",
    !task.notes_done && "Notes",
    !task.work_assigned && "Next work",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      className={`classroom-home-session-task ${expanded ? "is-expanded" : ""}`}
      aria-busy={work.savingId === task.id}
    >
      <div className="classroom-home-task-heading">
        <div>
          <h3>{task.student_name || "Student needs matching"}</h3>
          <p>
            <time dateTime={task.starts_at}>{dateLabel}</time>
            {task.source_state !== "ended" ? ` · ${sourceLabel}` : ""}
          </p>
        </div>
        {onToggle ? (
          <button
            type="button"
            className="classroom-home-quiet-button"
            aria-expanded={expanded}
            aria-controls={`${id}-detail`}
            onClick={onToggle}
          >
            {expanded ? "Close follow-up" : "Open follow-up"}
            <span aria-hidden="true">{expanded ? " −" : " ↗"}</span>
          </button>
        ) : null}
      </div>
      {!expanded ? (
        <p className="home-desk-task-summary">
          {task.blocker
            ? `Blocked: ${task.blocker}`
            : remaining || "Steps complete; ready to handle"}
          <span>
            {task.transcript_status === "linked"
              ? "Transcript linked"
              : task.transcript_status === "needs_review"
                ? "Transcript needs review"
                : "Waiting for transcript"}
          </span>
        </p>
      ) : null}
      <div id={`${id}-detail`} hidden={!expanded}>
        <p className="classroom-home-task-sync">
          {sourceLabel}. Scheduled end does not confirm attendance.
        </p>
        {task.match_state === "needs_match" ? (
          <form
            className="classroom-home-task-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (studentId)
                void work.update?.(task, {
                  action: "match_student",
                  studentId,
                });
            }}
          >
            <label htmlFor={`${id}-student`}>
              Match this session to a student
            </label>
            <select
              id={`${id}-student`}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={disabled}
            >
              <option value="">Choose a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={disabled || !studentId}>
              Save match
            </button>
          </form>
        ) : null}
        <fieldset className="classroom-home-task-checks" disabled={disabled}>
          <legend className="classroom-home-sr">
            Follow-up for {task.student_name || "this session"}
          </legend>
          {(
            [
              ["recap_done", "Recap prepared"],
              ["recap_posted", "Recap posted"],
              ["notes_done", "Notes updated"],
              ["work_assigned", "Next work assigned"],
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              <input
                type="checkbox"
                checked={!!task[field]}
                onChange={(e) =>
                  void work.update?.(task, {
                    action:
                      field === "recap_posted" ? "recap_posted" : "checklist",
                    field: field === "recap_posted" ? undefined : field,
                    value: e.target.checked,
                  })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="classroom-home-task-links">
          {doc ? (
            <a href={doc} target="_blank" rel="noopener noreferrer">
              {task.transcript_status === "needs_review" &&
              task.transcript_source === "auto"
                ? "Review earlier transcript link: another document was found"
                : "Open transcript"}
            </a>
          ) : (
            <span>
              {task.transcript_status === "needs_review"
                ? "Transcript needs review"
                : "Waiting for transcript"}
            </span>
          )}
          {folder ? (
            <a href={folder} target="_blank" rel="noopener noreferrer">
              Student folder
            </a>
          ) : (
            <span>Folder not linked</span>
          )}
          {task.student_id && task.match_state === "matched" ? (
            <>
              <button
                onClick={() =>
                  onOpen(
                    `/teacher/students/${encodeURIComponent(task.student_id!)}/notes`,
                  )
                }
              >
                Open notes
              </button>
              <button
                onClick={() =>
                  onOpen(
                    `/teacher/students/${encodeURIComponent(task.student_id!)}/work`,
                  )
                }
              >
                Open assigned work
              </button>
            </>
          ) : null}
        </div>
        {!task.handled_at ? (
          <details className="classroom-home-task-attach">
            <summary>
              {doc ? "Change transcript link" : "Add transcript link"}
            </summary>
            <form
              className="classroom-home-task-form"
              onSubmit={(e) => {
                e.preventDefault();
                const docId = transcriptIdFromUrl(link);
                setInvalid(!docId);
                if (docId)
                  void work.update?.(task, {
                    action: "attach_transcript",
                    docId,
                  });
              }}
            >
              <label htmlFor={`${id}-doc`}>Google Docs transcript URL</label>
              <input
                id={`${id}-doc`}
                type="url"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setInvalid(false);
                }}
                disabled={disabled}
                aria-invalid={invalid}
                aria-describedby={invalid ? `${id}-error` : undefined}
              />
              <button disabled={disabled} type="submit">
                Save link
              </button>
              {invalid ? (
                <p id={`${id}-error`} role="alert">
                  Use a Google Docs document link.
                </p>
              ) : null}
            </form>
          </details>
        ) : null}
        <details className="home-desk-blocker">
          <summary>Blocker</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void work.update?.(task, { action: "blocker", field: blocker });
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
            <button disabled={disabled}>Save blocker</button>
          </form>
        </details>
        <button
          type="button"
          className="home-desk-primary"
          disabled={disabled}
          onClick={() =>
            void work.update?.(task, {
              action: task.handled_at ? "reopen" : "handle",
            })
          }
        >
          {work.savingId === task.id
            ? "Saving…"
            : task.handled_at
              ? "Reopen"
              : "Mark handled"}
        </button>
      </div>
    </li>
  );
}
export function PostSessionWork({
  work = { state: "setup" },
  students,
  onOpen,
  onAll,
}: {
  work?: PostSessionHomeState;
  students: TeacherStudentRow[];
  onOpen: (route: string) => void;
  onAll?: () => void;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState(false);
  const data = work.data;
  const tasks = data?.tasks ?? [];
  const stale = !!data?.settings && calendarCheckIsStale(data.settings);
  return (
    <section
      id="home-session-work"
      tabIndex={-1}
      className="classroom-home-region classroom-home-post-session"
      aria-labelledby="teacher-home-work-title"
    >
      <header className="classroom-home-region-head">
        <h2 id="teacher-home-work-title">After-session work</h2>
        {work.state === "ready" ? (
          <span className="classroom-home-count">
            {data?.total ?? tasks.length}
          </span>
        ) : null}
        {onAll ? (
          <button className="classroom-home-more" onClick={onAll}>
            All tasks ↗
          </button>
        ) : null}
      </header>
      {work.error ? (
        <p role="alert" className="classroom-home-state-error">
          {work.error}
        </p>
      ) : null}
      {work.refreshFailed ? (
        <p role="status">
          Could not refresh. Showing the last saved work list.
        </p>
      ) : null}
      {work.state === "loading" ? (
        <p aria-busy="true" className="classroom-home-state">
          Loading after-session work…
        </p>
      ) : work.state === "error" ? (
        <p role="alert" className="classroom-home-state">
          Could not load after-session work. Your waiting work is unknown.
        </p>
      ) : work.state === "setup" ? (
        <p className="classroom-home-state">
          Automatic session tasks are not connected yet. Your waiting work is
          unknown until setup is active.
        </p>
      ) : (
        <>
          {data?.settings && !data.settings.enabled ? (
            <p role="status" className="classroom-home-state">
              Automatic updates are paused. Showing saved work.
            </p>
          ) : null}
          {data?.settings?.last_error ? (
            <p role="status">
              The calendar connection needs attention. New sessions may be
              missing.
            </p>
          ) : data?.settings?.catching_up ? (
            <p role="status">
              Catching up on calendar changes. More sessions may appear.
            </p>
          ) : data?.settings?.enabled &&
            stale &&
            data.settings.last_success_at ? (
            <p role="status">
              Calendar updates are delayed. New sessions may be missing.
            </p>
          ) : !data?.settings?.last_success_at ? (
            <p role="status">Waiting for the first calendar check.</p>
          ) : null}
          {tasks.length ? (
            <ul
              className="classroom-home-task-list"
              aria-label="Sessions needing follow-up"
            >
              {tasks.slice(0, 2).map((task) => (
                <SessionTask
                  key={task.id}
                  task={task}
                  work={work}
                  students={students}
                  onOpen={onOpen}
                  expanded={expanded === task.id}
                  onToggle={() =>
                    setExpanded(expanded === task.id ? null : task.id)
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="classroom-home-state">
              {work.refreshFailed ||
              !data?.settings?.enabled ||
              stale ||
              data?.settings?.last_error ||
              data?.settings?.catching_up
                ? "No tasks have loaded yet. Calendar checks may add work."
                : "No after-session tasks are waiting."}
            </p>
          )}
          {!onAll ? (
            <>
              <button
                type="button"
                className="classroom-home-more"
                onClick={() => setHistory(!history)}
                aria-expanded={history}
              >
                {history
                  ? "Hide handled work"
                  : `Handled work (${data?.handled_total ?? data?.handled.length ?? 0})`}
              </button>
              {history ? (
                <ul
                  className="classroom-home-task-list"
                  aria-label="Handled sessions"
                >
                  {data?.handled.map((task) => (
                    <SessionTask
                      key={task.id}
                      task={task}
                      work={work}
                      students={students}
                      onOpen={onOpen}
                    />
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </>
      )}
      {work.retry &&
      (work.state === "error" ||
        work.state === "setup" ||
        work.refreshFailed) ? (
        <button
          type="button"
          className="classroom-home-quiet-button"
          onClick={work.retry}
        >
          Try again
        </button>
      ) : null}
    </section>
  );
}
