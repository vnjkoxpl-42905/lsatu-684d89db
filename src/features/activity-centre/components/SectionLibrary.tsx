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
 * What one past Attempt says about itself.
 *
 * Three states, and they are genuinely different: a run that was never
 * finished, a finished one still being marked, and a marked one with a number.
 * The old list said "done" for all three and led nowhere, so an Attempt she had
 * spent twenty-five minutes on was a line of grey text.
 */
function attemptLabel(a: ActivityAssignmentSummary, grade: SectionGradeStub | undefined): string {
  const date = attemptDate(a);
  if (a.status !== "completed") return `${date} · not finished`;
  if (!grade) return `${date} · still being marked`;
  return `${date} · ${grade.section.mean_coverage}% carried`;
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
      const list = map.get(a.source_section) ?? [];
      list.push(a);
      map.set(a.source_section, list);
    }
    for (const list of map.values()) {
      list.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
    }
    return map;
  }, [attempts]);

  const start = useCallback(
    async (choice: SectionChoice) => {
      setStarting(choice.id);
      setError(null);
      try {
        onStart(await beginAttempt(choice.id));
      } catch {
        setError("Could not start that section. Try again in a moment.");
        setStarting(null);
      }
    },
    [beginAttempt, onStart],
  );

  if (error && !choices) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }
  if (!choices) {
    return <p className="text-sm text-muted-foreground">Loading sections…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {choices.map((choice) => {
        const done = bySection.get(choice.source_section) ?? [];
        return (
          <div
            key={choice.id}
            className="rounded-[20px] border border-border bg-card p-5"
            data-section={choice.source_section}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-base font-medium text-foreground">{choice.source_section}</p>
              {/*
                * The time, not the stimulus count.
                *
                * A stimulus is our grain, not hers, and the counts differ per
                * section for a reason she has no way to see: two questions can
                * share a stimulus. Printed on a card to choose from, "22" next
                * to "26" reads as one section being longer, which is not what
                * it means. The clock is the thing she actually plans around.
                */}
              <p className="text-xs text-muted-foreground">
                {choice.goal_minutes?.standard ?? 25} min
              </p>
            </div>

            {done.length > 0 && (
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
              <ul className="mt-3 flex flex-col gap-1">
                {done.map((a, i) => {
                  const grade = grades.get(a.id);
                  const label = `Attempt ${done.length - i} · ${attemptLabel(a, grade)}`;
                  const reachable = a.status === "completed" && onOpenAttempt !== undefined;
                  return (
                    <li key={a.id} className="text-xs text-muted-foreground">
                      {reachable ? (
                        <button
                          type="button"
                          className="rounded text-left underline decoration-dotted underline-offset-4 hover:text-foreground"
                          onClick={() => onOpenAttempt?.(a.id)}
                        >
                          {label}
                        </button>
                      ) : (
                        label
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              className="mt-4 rounded-full border border-border px-4 py-2 text-sm"
              disabled={starting !== null}
              onClick={() => void start(choice)}
            >
              {starting === choice.id ? "Starting…" : done.length > 0 ? "Run it again" : "Start"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
