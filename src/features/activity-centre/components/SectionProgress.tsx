import { useEffect, useState } from "react";
import { listMySectionGrades } from "../api/activitiesClient";
import type { SectionGradeStub } from "../api/types";

/**
 * Every graded Read, Recall, Colour run this student has, oldest to newest.
 *
 * Each finished section is already stored whole -- its coverage, its per-line
 * marking, its transcript and the recording behind it -- but until now the only
 * way to see one was to remember which Attempt it was and open it. A student
 * who runs a section a week has no way of knowing whether the weeks are adding
 * up to anything, and that is the entire point of grading her.
 *
 * So: one row per graded run, in date order, with the number that moves. The
 * bars are the same number drawn, because a column of percentages is a list and
 * a shape is a trend.
 */
export function SectionProgress({
  loadGrades = listMySectionGrades,
  onOpen,
}: {
  loadGrades?: () => Promise<SectionGradeStub[]>;
  onOpen?: (assignmentId: string) => void;
}) {
  const [runs, setRuns] = useState<SectionGradeStub[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await loadGrades();
        if (!cancelled) setRuns(rows);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadGrades]);

  if (failed) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">Your progress</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your past runs could not be loaded just now. They are saved — try again in a moment.
        </p>
      </section>
    );
  }

  if (runs === null) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">Your progress</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading your past runs…</p>
      </section>
    );
  }

  if (runs.length === 0) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">Your progress</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          No graded runs yet. Finish a section below and its marked report is saved here — every
          run you do from then on shows up in this list.
        </p>
      </section>
    );
  }

  // Oldest first: the eye reads left to right, and improvement should run that
  // way too. The query hands them back newest first.
  const ordered = [...runs].reverse();
  const latest = ordered[ordered.length - 1];
  const first = ordered[0];
  const change = Math.round(pct(latest) - pct(first));
  const newest = [...ordered].reverse();
  const hidden = newest.length - RECENT_RUNS;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">Your progress</h2>
        <p className="text-xs text-muted-foreground">
          {ordered.length} graded {ordered.length === 1 ? "run" : "runs"}
          {ordered.length > 1 && (
            <>
              {" · "}
              {change > 0 ? `up ${change}` : change < 0 ? `down ${Math.abs(change)}` : "level"}
              {change === 0 ? "" : " points"} since your first
            </>
          )}
        </p>
      </div>

      <div className="mt-5 flex h-24 items-end gap-1.5" aria-hidden="true">
        {ordered.map((r) => (
          <div
            key={`${r.assignment_id}-${r.attempt_no}`}
            className="min-w-[6px] flex-1 rounded-t bg-primary/70"
            style={{ height: `${Math.max(4, pct(r))}%` }}
          />
        ))}
      </div>

      {/* The five most recent, and a way to the rest. This is the entry
          page; a list that grows by one row per run had pushed the sections
          and the steps a screen further down every week. */}
      <ul className="mt-5 divide-y divide-border/50">
        {(showAll ? newest : newest.slice(0, RECENT_RUNS)).map((r) => (
          <li key={`${r.assignment_id}-${r.attempt_no}`}>
            <button
              type="button"
              onClick={() => onOpen?.(r.assignment_id)}
              disabled={!onOpen}
              className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:cursor-default"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">
                  {r.source_section || "Section"}
                  {r.attempt_no > 1 ? ` · attempt ${r.attempt_no}` : ""}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatWhen(r.graded_at)}
                  {r.section?.total_seconds
                    ? ` · ${Math.round(r.section.total_seconds / 60)} min`
                    : ""}
                  {r.section?.reciting_count ? ` · ${r.section.reciting_count} recited` : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {Math.round(pct(r))}%
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          className="mt-3 min-h-[44px] text-sm font-medium text-foreground underline underline-offset-4"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show the last 5" : `See all ${newest.length} runs`}
        </button>
      )}
    </section>
  );
}

/** How many runs the entry page lists before asking. */
export const RECENT_RUNS = 5;

/** Coverage is stored 0-1 in some runs and 0-100 in others; read both. */
function pct(r: SectionGradeStub): number {
  const v = r.section?.mean_coverage ?? 0;
  const n = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, n));
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
