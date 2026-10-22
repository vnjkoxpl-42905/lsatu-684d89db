/**
 * The teaching desk: Joshua's Home.
 *
 * Presentational only. Takes a finished model and draws it, so the whole page
 * can be driven from fixtures. There is no assigned-work list, Smart Drill,
 * booking prompt or week strip here in any state, including loading and
 * error: those belong to a student's Home.
 *
 * Composition: an open masthead with the one ink action beside it, then an
 * open, ruled working column (what is waiting) and a quieter rail (find a
 * student, sessions). No region sits in a box inside another box.
 */

import * as React from "react";
import {
  ArrowRightIcon,
  Cross2Icon,
  FileIcon,
  MagnifyingGlassIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useHomeEntrance } from "../useHomeEntrance";
import type { TeacherHomeModel } from "./teacherHomeModel";
import { filterStudents, teacherLede } from "./teacherHomeModel";

const SHOWN_MATCHES = 8;

function RegionRetry({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <div className="classroom-home-state classroom-home-state-error" role="alert">
      <p>{label}</p>
      {onRetry ? (
        <button type="button" className="classroom-home-quiet-button" onClick={onRetry}>
          <ReloadIcon aria-hidden="true" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** Cached content is still shown; this says it may be out of date. */
function RegionStale({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="classroom-home-stale" role="status">
      <span>Could not refresh. Showing what loaded last.</span>
      {onRetry ? (
        <button type="button" className="classroom-home-quiet-button" onClick={onRetry}>
          <ReloadIcon aria-hidden="true" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

function SkeletonRows({ count, label }: { count: number; label: string }) {
  return (
    <div className="classroom-home-skeleton" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="classroom-home-skeleton-row" aria-hidden="true">
          <i />
          <span>
            <i />
            <i />
          </span>
        </span>
      ))}
    </div>
  );
}

function StudentFinder({
  roster,
  onOpen,
}: {
  roster: TeacherHomeModel["roster"];
  onOpen: (route: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const inputId = React.useId();
  const all = roster.all ?? roster.recent;
  const searching = query.trim().length > 0;
  const matches = searching ? filterStudents(all, query) : roster.recent;
  const shown = matches.slice(0, SHOWN_MATCHES);

  return (
    <>
      <div className="classroom-home-search">
        <label htmlFor={inputId} className="classroom-home-search-label">Find a student</label>
        <div className="classroom-home-search-field">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            autoComplete="off"
            value={query}
            placeholder="Type a name"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searching && shown.length > 0) onOpen(shown[0].route);
              if (event.key === "Escape") setQuery("");
            }}
          />
          {searching ? (
            <button type="button" className="classroom-home-search-clear" aria-label="Clear student search" onClick={() => setQuery("")}>
              <Cross2Icon aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="classroom-home-sr" aria-live="polite">
        {searching ? `${matches.length} ${matches.length === 1 ? "student matches" : "students match"}` : ""}
      </p>
      {searching && matches.length === 0 ? (
        <p className="classroom-home-state">No student matches “{query.trim()}”.</p>
      ) : shown.length === 0 ? (
        <p className="classroom-home-state">
          {roster.refreshFailed ? "No students had loaded when the roster last refreshed." : "No student accounts yet."}
        </p>
      ) : (
        <ul className="classroom-home-ruled" aria-label={searching ? "Matching students" : "Recently active students"}>
          {shown.map((row) => (
            <li key={row.id}>
              <button type="button" className="classroom-home-student-row" onClick={() => onOpen(row.route)}>
                <b>{row.name}</b>
                <span>{row.activityLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searching && matches.length > shown.length ? (
        <p className="classroom-home-state">
          {matches.length - shown.length} more {matches.length - shown.length === 1 ? "student matches" : "students match"}. Keep typing to narrow the list.
        </p>
      ) : null}
    </>
  );
}

export function TeacherHomeView({
  model,
  onOpen,
  onRetryInbox,
  onRetryRoster,
  onRetrySessions,
}: {
  model: TeacherHomeModel;
  onOpen: (route: string) => void;
  onRetryInbox?: () => void;
  onRetryRoster?: () => void;
  onRetrySessions?: () => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  useHomeEntrance(rootRef, true);
  const unreadTotal = model.unread.state === "ready" ? model.unread.total : null;
  const extraUnread =
    unreadTotal !== null && unreadTotal > model.unread.rows.length ? unreadTotal - model.unread.rows.length : 0;

  return (
    <div ref={rootRef} className="classroom-home classroom-home-teacher" data-motion-skip data-role-home="teacher">
      <section className="classroom-home-top" aria-label="Today" data-home-reveal>
        <header className="classroom-home-masthead">
          <p className="classroom-home-dateline">
            <span>{model.dateline}</span>
            <span className="classroom-home-dateline-role">Teaching desk</span>
          </p>
          <h1 className="classroom-home-title">
            {model.greeting}
            {model.displayName ? <>, <em>{model.displayName}</em>.</> : "."}
          </h1>
          <p className="classroom-home-subtitle">{teacherLede(model.unread)}</p>
        </header>

        <section className="classroom-home-focus" aria-labelledby="teacher-home-assign-title">
          <h2 id="teacher-home-assign-title">Assign work</h2>
          <p>Pick a student, then send a drill, homework set, activity or timed section.</p>
          <div className="classroom-home-focus-actions">
            <button type="button" className="classroom-home-cta" onClick={() => onOpen("/teacher/library/assignments")}>
              Open assignments
              <ArrowRightIcon aria-hidden="true" />
            </button>
            <button type="button" className="classroom-home-focus-link" onClick={() => onOpen("/teacher/students")}>
              Open students
            </button>
          </div>
        </section>
      </section>

      <div className="classroom-home-grid">
        <section
          className="classroom-home-region classroom-home-region-main"
          aria-labelledby="teacher-home-unread-title"
          data-home-reveal
        >
          <header className="classroom-home-region-head">
            <h2 id="teacher-home-unread-title">Unread conversations</h2>
            {unreadTotal !== null && unreadTotal > 0 ? (
              <span className="classroom-home-count" aria-label={`${unreadTotal} unread`}>{unreadTotal}</span>
            ) : null}
          </header>
          {model.unread.refreshFailed ? <RegionStale onRetry={onRetryInbox} /> : null}

          {model.unread.state === "loading" ? (
            <SkeletonRows count={3} label="Loading unread conversations" />
          ) : model.unread.state === "error" ? (
            <RegionRetry label="Could not load your inbox, so the unread count is unknown." onRetry={onRetryInbox} />
          ) : model.unread.rows.length === 0 ? (
            <p className="classroom-home-state">
              {model.unread.refreshFailed
                ? "Nothing was unread when your inbox last loaded."
                : "Nothing unread. New messages from students land here first."}
            </p>
          ) : (
            <ul className="classroom-home-ruled" aria-label="Unread conversations">
              {model.unread.rows.map((row) => (
                <li key={row.id}>
                  <button type="button" className="classroom-home-thread-row" onClick={() => onOpen(row.route)}>
                    <span className="classroom-home-avatar" aria-hidden="true">{row.initial}</span>
                    <span className="classroom-home-thread-text">
                      <span className="classroom-home-thread-head">
                        <b>{row.name}</b>
                        <span className="classroom-home-thread-meta">
                          <time>{row.timeLabel}</time>
                          {row.hasAttachments ? (
                            <FileIcon className="classroom-home-thread-file" aria-label="Has attachments" role="img" />
                          ) : null}
                        </span>
                      </span>
                      <span className="classroom-home-thread-snippet">{row.snippet}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <footer className="classroom-home-region-foot">
            <button type="button" className="classroom-home-more" onClick={() => onOpen("/teacher/inbox")}>
              {extraUnread > 0 ? `Open the inbox, ${extraUnread} more unread` : "Open the inbox"}
              <ArrowRightIcon aria-hidden="true" />
            </button>
          </footer>
        </section>

        <aside className="classroom-home-rail" aria-label="Students and sessions">
          <section className="classroom-home-region" aria-labelledby="teacher-home-roster-title" data-home-reveal>
            <header className="classroom-home-region-head">
              <h2 id="teacher-home-roster-title">Students</h2>
              {model.roster.state === "ready" && model.roster.total !== null ? (
                <span className="classroom-home-count classroom-home-count-quiet">{model.roster.total}</span>
              ) : null}
            </header>
            {model.roster.refreshFailed ? <RegionStale onRetry={onRetryRoster} /> : null}
            {model.roster.state === "loading" ? (
              <SkeletonRows count={3} label="Loading students" />
            ) : model.roster.state === "error" ? (
              <RegionRetry label="Could not load the roster." onRetry={onRetryRoster} />
            ) : (
              <StudentFinder roster={model.roster} onOpen={onOpen} />
            )}
            <footer className="classroom-home-region-foot">
              <button type="button" className="classroom-home-more" onClick={() => onOpen("/teacher/students")}>
                All students
                <ArrowRightIcon aria-hidden="true" />
              </button>
            </footer>
          </section>

          <section className="classroom-home-region" aria-labelledby="teacher-home-sessions-title" data-home-reveal>
            <header className="classroom-home-region-head">
              <h2 id="teacher-home-sessions-title">Upcoming sessions</h2>
            </header>
            {model.sessions.refreshFailed ? <RegionStale onRetry={onRetrySessions} /> : null}
            {model.sessions.state === "loading" ? (
              <SkeletonRows count={2} label="Loading upcoming sessions" />
            ) : model.sessions.state === "error" ? (
              <RegionRetry label="Could not load scheduled sessions." onRetry={onRetrySessions} />
            ) : model.sessions.rows.length === 0 ? (
              <p className="classroom-home-state">
                {model.sessions.refreshFailed
                  ? "No sessions were scheduled when this last loaded."
                  : "No sessions scheduled on the platform."}
              </p>
            ) : (
              <ul className="classroom-home-ruled" aria-label="Upcoming sessions">
                {model.sessions.rows.map((row) => (
                  <li key={row.id}>
                    <button type="button" className="classroom-home-session-row" onClick={() => onOpen(row.route)}>
                      <span className="classroom-home-session-when">
                        <b>{row.dayLabel}</b>
                        <span>{row.timeLabel}</span>
                      </span>
                      <span className="classroom-home-session-name">
                        {row.name}
                        {row.durationLabel ? <small>{row.durationLabel}</small> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default TeacherHomeView;
