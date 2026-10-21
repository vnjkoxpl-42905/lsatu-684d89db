import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listMySectionGrades,
  listSectionChoices,
  startSectionAttempt,
  type SectionChoice,
} from "../api/activitiesClient";
import type { ActivityAssignmentSummary, SectionGradeStub } from "../api/types";

/**
 * The sections she can run, and what she has already done.
 *
 * Read, Recall, Colour is one Activity now. Joshua assigns the drill; she picks
 * which section to work tonight, and she works several. That is why this list
 * exists at all: a section per library card meant he chose for her, and it grew
 * by one card every time a section was built.
 *
 * Two rules the drill puts on this screen:
 *
 * - **Nothing is hidden once done.** The regular section picker drops a section
 *   she has sat, which is right when there are two hundred of them and wrong
 *   here, where there are three. Repeating a section is legitimate: she is
 *   training recall, not measuring a score.
 * - **Every Attempt is kept.** Not a count, not the latest. Attempt 1, 2 and 3
 *   each keep their own date and their own Report Card, because the point of
 *   running a section twice is seeing what changed.
 *
 * Starting is a server call, not an insert. She chooses the section; the row
 * that holds her run is built under definer rights, because the snapshot
 * carries the Details her Coverage is scored against and must never be hers to
 * write.
 */
export interface SectionLibraryProps {
  /** Her assignments, used to show what she has already attempted. */
  attempts: ActivityAssignmentSummary[];
  /** Called with the new assignment id once an Attempt has been created. */
  onStart: (assignmentId: string) => void;
  /**
   * Called with the assignment of an Attempt she wants to look at again.
   *
   * Its own Report Card is what opens: a completed section routes there rather
   * than to the generic summary, from any device and at any later date.
   */
  onOpenAttempt?: (assignmentId: string) => void;
  /** Injected in tests. */
  loadChoices?: () => Promise<SectionChoice[]>;
  loadGrades?: () => Promise<SectionGradeStub[]>;
  beginAttempt?: (activityId: string) => Promise<string>;
}

function attemptDate(a: ActivityAssignmentSummary): string {
  const when = new Date(a.completed_at ?? a.created_at);
  return when.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * A section she was handed and has not opened.
 *
 * Not an Attempt: nothing was recorded, nothing was answered, and calling it
 * "Attempt 1 - not finished" tells her she abandoned a run she never began.
 * `started_at` is the honest test, because a teacher-assigned row and a
 * server-made one both arrive as rows and only one of them has a clock.
 */
function isWaiting(a: ActivityAssignmentSummary): boolean {
  return a.status === "assigned" && !a.started_at;
}

/**
 * What one past Attempt says about itself.
 *
 * Three states, and they are genuinely different: a run that was never
 * finished, a finished one still being marked, and a marked one with a number.
 * The old list said "done" for all three and led nowhere, so an Attempt she had
 * spent twenty-five minutes on was a line of grey text.
 */
/**
 * How long a finished run has been waiting for its grade.
 *
 * "Still being marked" is true at four minutes and true at four hours, and she
 * cannot tell those apart, so she either sits waiting on something that is
 * already broken or writes off something that was about to land. A real
 * grading takes one to three minutes; anything much past that is worth her
 * knowing as a number.
 */
function markingMinutes(a: ActivityAssignmentSummary): number | null {
  if (!a.completed_at) return null;
  const ms = Date.now() - new Date(a.completed_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 60000);
}

/** The clock time a run finished, for a wait long enough that minutes stop helping. */
function finishedAtTime(a: ActivityAssignmentSummary): string | null {
  if (!a.completed_at) return null;
  return new Date(a.completed_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function attemptLabel(a: ActivityAssignmentSummary, grade: SectionGradeStub | undefined): string {
  const date = attemptDate(a);
  if (a.status !== "completed") return `${date} · not finished`;
  if (!grade) {
    const waited = markingMinutes(a);
    if (waited === null) return `${date} · still being marked`;
    if (waited >= 60) {
      const at = finishedAtTime(a);
      return at ? `${date} · finished ${at}, still being marked` : `${date} · still being marked`;
    }
    if (waited < 1) return `${date} · marking now`;
    return `${date} · marking for ${waited} ${waited === 1 ? "minute" : "minutes"}`;
  }
  return `${date} · ${grade.section.mean_coverage}% carried`;
}

/**
 * What the row is FOR, said on the row.
 *
 * Celia, on the morning after her first graded section: "I see the percentage,
 * but I'm not seeing a way to look back at the attempt to see what information
 * I was missing in my responses." The Report Card was already at the end of
 * this button and had been for weeks. The row simply never said so. It was
 * 13.5px muted text with a dotted underline, which is what a caption looks
 * like, and the label stopped at the number.
 *
 * A percentage is a verdict she cannot act on. The card behind it is the whole
 * point of the drill, so the row names it.
 */
function attemptAction(
  a: ActivityAssignmentSummary,
  grade: SectionGradeStub | undefined,
): string | null {
  if (a.status !== "completed") return null;
  if (!grade) {
    /*
     * Past the point where waiting is the right advice, say what to do instead.
     * The row opens the marking screen, which now has a Check again on it, so
     * this is a real instruction rather than a hope.
     */
    const waited = markingMinutes(a);
    return waited !== null && waited >= 10 ? "Open it and check again" : "Check back shortly";
  }
  return "See what you missed";
}

export function SectionLibrary({
  attempts,
  onStart,
  onOpenAttempt,
  loadChoices = listSectionChoices,
  loadGrades = listMySectionGrades,
  beginAttempt = startSectionAttempt,
}: SectionLibraryProps) {
  const [choices, setChoices] = useState<SectionChoice[] | null>(null);
  /**
   * Her Report Cards, by assignment.
   *
   * Loaded beside the sections and never waited on: the list is useful without
   * them, and a failed read costs a number on a row rather than the screen.
   */
  const [grades, setGrades] = useState<Map<string, SectionGradeStub>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await loadChoices();
        if (!cancelled) setChoices(rows);
      } catch {
        // Named plainly. An empty list and a failed read are different facts,
        // and only one of them means "nothing to do tonight".
        if (!cancelled) setError("Could not load the sections. Try again in a moment.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadChoices]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await loadGrades();
        if (cancelled) return;
        // Newest Attempt per assignment. `listMySectionGrades` returns them
        // newest first, so the first one seen for an assignment wins.
        const byAssignment = new Map<string, SectionGradeStub>();
        for (const g of rows) if (!byAssignment.has(g.assignment_id)) byAssignment.set(g.assignment_id, g);
        setGrades(byAssignment);
      } catch {
        // A missing number is a missing number. The list still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadGrades]);

  /** Her attempts, newest first, grouped by which section they were on. */
  const bySection = useMemo(() => {
    const map = new Map<string, ActivityAssignmentSummary[]>();
    for (const a of attempts) {
      if (a.mode !== "section" || !a.source_section) continue;
      // A row she has never opened is not a run. See `waitingBySection`.
      if (isWaiting(a)) continue;
      const list = map.get(a.source_section) ?? [];
      list.push(a);
      map.set(a.source_section, list);
    }
    for (const list of map.values()) {
      list.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
    }
    return map;
  }, [attempts]);

  /**
   * Sections Joshua handed her that she has not opened yet.
   *
   * These carry their own message and their own classroom link, so the row IS
   * her assignment rather than a spare copy of one.
   */
  const waitingBySection = useMemo(() => {
    const map = new Map<string, ActivityAssignmentSummary>();
    for (const a of attempts) {
      if (a.mode !== "section" || !a.source_section || !isWaiting(a)) continue;
      const held = map.get(a.source_section);
      // Oldest wins: it is the one whose message she was actually sent.
      if (!held || new Date(a.created_at) < new Date(held.created_at)) {
        map.set(a.source_section, a);
      }
    }
    return map;
  }, [attempts]);

  const start = useCallback(
    async (choice: SectionChoice) => {
      /*
       * Open the row she was given, rather than making a second one.
       *
       * `start_section_attempt` DELETES a never-started row for the same
       * section before inserting its own. On 2026-09-08 eight sections were
       * assigned to Yahunathan one row at a time, each with its own message and
       * classroom link; pressing Start here would have deleted the row those
       * links point at and left him with "Activity not found." Her assignment
       * and her Attempt are the same row, so this opens it.
       */
      const waiting = waitingBySection.get(choice.source_section);
      if (waiting) {
        onStart(waiting.id);
        return;
      }
      setStarting(choice.id);
      setError(null);
      try {
        onStart(await beginAttempt(choice.id));
      } catch {
        setError("Could not start that section. Try again in a moment.");
        setStarting(null);
      }
    },
    [beginAttempt, onStart, waitingBySection],
  );

  if (error && !choices) {
    return <p className="sl-note">{error}</p>;
  }
  if (!choices) {
    return <p className="sl-note">Loading sections\u2026</p>;
  }
  /*
   * An empty list is a fact, not a blank space.
   *
   * "Choose a section" carries her to this slab, and a slab with nothing in it
   * is the dead end she reports as the drill being broken. Say what is true:
   * nothing has been built for her yet.
   */
  if (choices.length === 0) {
    return (
      <p className="sl-note">
        No sections are ready for you yet. Joshua adds them here as they are built.
        Check back, or message him if you were expecting one tonight.
      </p>
    );
  }

  return (
    <div className="sl-sections">
      {error && (
        <p className="sl-note" data-tone="bad">
          {error}
        </p>
      )}
      {(showAll ? choices : choices.slice(0, VISIBLE_SECTIONS)).map((choice) => {
        const done = bySection.get(choice.source_section) ?? [];
        return (
          <div key={choice.id} className="sl-section" data-section={choice.source_section}>
            <div className="sl-sec-body">
              <div className="sl-sec-line">
                <span className="sl-sec-name">{choice.source_section}</span>
                {/*
                  * The time, not the stimulus count.
                  *
                  * A stimulus is our grain, not hers, and the counts differ per
                  * section for a reason she has no way to see: two questions can
                  * share a stimulus. Printed on a row to choose from, "22" next
                  * to "26" reads as one section being longer, which is not what
                  * it means. The clock is the thing she actually plans around.
                  */}
                <span className="sl-sec-clock">
                  {choice.goal_minutes?.standard ?? 25} min
                </span>
              </div>

              {done.length === 0 ? (
                <p className="sl-note">Not run yet.</p>
              ) : (
                /*
                 * Every Attempt, and every one of them a way back in.
                 *
                 * The Report Card used to exist only in the tab that produced it:
                 * this list rendered the same runs as plain text, so a grade she
                 * could not have seen -- grading finishes minutes after she stops
                 * -- was unreachable for ever after. A finished Attempt opens on
                 * its own Report Card; an unfinished one is not a run and does
                 * not pretend to lead anywhere.
                 */
                <ul className="sl-sec-attempts">
                  {done.map((a, i) => {
                    const grade = grades.get(a.id);
                    const label = `Attempt ${done.length - i} \u00b7 ${attemptLabel(a, grade)}`;
                    const action = attemptAction(a, grade);
                    const reachable = a.status === "completed" && onOpenAttempt !== undefined;
                    return (
                      <li key={a.id}>
                        {reachable ? (
                          <button
                            type="button"
                            className="sl-sec-attempt"
                            onClick={() => onOpenAttempt?.(a.id)}
                          >
                            <span className="sl-sec-attempt-label">{label}</span>
                            {action && <span className="sl-sec-attempt-go">{action}</span>}
                          </button>
                        ) : (
                          <span className="sl-sec-attempt" data-flat="true">
                            <span className="sl-sec-attempt-label">{label}</span>
                            {action && <span className="sl-sec-attempt-go">{action}</span>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="button"
              className="sl-sec-go"
              disabled={starting !== null}
              onClick={() => void start(choice)}
            >
              {starting === choice.id ? "Starting\u2026" : done.length > 0 ? "Run it again" : "Start"}
            </button>
          </div>
        );
      })}
      {choices.length > VISIBLE_SECTIONS && (
        <button
          type="button"
          className="sl-more"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll
            ? "Show fewer"
            : `Show ${choices.length - VISIBLE_SECTIONS} more ${
                choices.length - VISIBLE_SECTIONS === 1 ? "section" : "sections"
              }`}
        </button>
      )}
    </div>
  );
}

/**
 * How many sections the door shows before asking.
 *
 * Twelve sections, each with its attempts and a button, were 1,600px of
 * identical rows between the hero and the steps. Five is a choice; twelve is
 * a catalogue.
 */
export const VISIBLE_SECTIONS = 5;
