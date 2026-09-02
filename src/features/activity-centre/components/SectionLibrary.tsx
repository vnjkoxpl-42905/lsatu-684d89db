import { useCallback, useEffect, useMemo, useState } from "react";
import { listSectionChoices, startSectionAttempt, type SectionChoice } from "../api/activitiesClient";
import type { ActivityAssignmentSummary } from "../api/types";

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
  /** Injected in tests. */
  loadChoices?: () => Promise<SectionChoice[]>;
  beginAttempt?: (activityId: string) => Promise<string>;
}

function attemptLabel(a: ActivityAssignmentSummary): string {
  const when = new Date(a.completed_at ?? a.created_at);
  const date = when.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (a.status !== "completed") return `${date} · not finished`;
  return `${date} · done`;
}

export function SectionLibrary({
  attempts,
  onStart,
  loadChoices = listSectionChoices,
  beginAttempt = startSectionAttempt,
}: SectionLibraryProps) {
  const [choices, setChoices] = useState<SectionChoice[] | null>(null);
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
              <p className="text-xs text-muted-foreground">
                {choice.stimulus_count} stimuli · {choice.goal_minutes?.standard ?? 25} min
              </p>
            </div>

            {done.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1">
                {done.map((a, i) => (
                  <li key={a.id} className="text-xs text-muted-foreground">
                    Attempt {done.length - i} · {attemptLabel(a)}
                  </li>
                ))}
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
