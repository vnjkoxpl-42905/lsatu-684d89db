import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { bandFor } from "../recall/grading";
import { tallyMisses } from "../recall/misses";
import { SEED_ACTIVITIES } from "../content";
import type { SectionGrade, SectionGradeStub } from "../api/types";

/**
 * Every section run on record, and what keeps slipping across all of them.
 *
 * The drill's own instruction is three a day, six if she can. Nothing in the
 * product knew she had done four: a Report Card is one run, and one run cannot
 * tell her whether she is getting better. Twenty runs can, and they were all
 * already stored.
 *
 * The same component answers both questions worth asking of a pile of runs, and
 * they are different questions:
 *
 * - **Is this working?** Coverage over time, run by run, next to the clock.
 * - **What do I keep dropping?** Not which Details, which KIND of Detail, as a
 *   share of the times that kind came up. "You dropped 'all employees'" is a
 *   fact about a stimulus; "you drop the quantifier two times in three" is a
 *   fact about her, and only the second one changes what she practises.
 *
 * Read-only and derived. Nothing here is stored, so a better grouping is a
 * deploy rather than a backfill, and this cannot disagree with the Report Cards
 * it is built from.
 */

/**
 * A run, in either of the two shapes the app reads them in.
 *
 * The table needs only the summary, which is the light read the section library
 * makes for every run she has ever done. "What keeps slipping" needs the
 * per-stimulus misses, which is the heavier read, so it is made for the recent
 * few and the rest arrive without it. A run with no `stimuli` contributes to the
 * table and not to the tally, rather than being left out of both.
 */
type Run = SectionGradeStub & Partial<Pick<SectionGrade, "stimuli">>;

interface SectionRunHistoryProps {
  grades: Run[];
  /** Whose runs these are, when the reader is not the student. */
  heading?: string;
  emptyMessage?: string;
}

/**
 * The band, in ink and in a word.
 *
 * The old inks measured 3.79:1 and 3.85:1 on the lab's ground and 4.24:1 and
 * 4.31:1 on the Workroom page, all under AA for body text, and the band was
 * carried by colour alone: a reader who cannot separate amber from red learned
 * nothing from this column, and neither did anyone reading it in grayscale.
 * Darkened and measured in the running app: nearly there 5.53:1 on the lab
 * ground and 6.34:1 on white, thin 5.35 and 6.13, worth another read 6.26 and
 * 7.17, at the standard 5.12 on the lab ground. Every row now says which band
 * it is as well as showing it.
 */
const BAND_TEXT: Record<ReturnType<typeof bandFor>, string> = {
  "at-the-standard": "text-[hsl(var(--ac-emerald-strong))]",
  "nearly-there": "text-[hsl(38_92%_27%)]",
  thin: "text-[hsl(24_85%_34%)]",
  "lost-it": "text-[hsl(350_80%_38%)]",
};

/** The word beside the number, so the colour is never the only carrier. */
const BAND_WORD: Record<ReturnType<typeof bandFor>, string> = {
  "at-the-standard": "at the standard",
  "nearly-there": "nearly there",
  thin: "thin",
  "lost-it": "worth another read",
};

function minutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

/**
 * Every Detail each stimulus asks for, from the content already in the bundle.
 *
 * The grade stores the Details she MISSED and a count of the ones she carried,
 * not their text, so a share of what was asked cannot be computed from grades
 * alone. It does not have to be: the sections are authored content and ship
 * with the app, so the denominator is a lookup rather than a query.
 */
const DETAILS_BY_SLUG: Map<string, string[]> = new Map(
  SEED_ACTIVITIES.filter((a) => a.mode === "section").flatMap((a) =>
    (a.items as unknown as { slug: string; chunks: { details: { text: string }[] }[] }[]).map(
      (item) => [item.slug, item.chunks.flatMap((c) => c.details.map((d) => d.text))] as const,
    ),
  ),
);

export function SectionRunHistory({
  grades,
  heading = "Read, Recall, Colour",
  emptyMessage = "No sections run yet.",
}: SectionRunHistoryProps) {
  const runs = useMemo(
    () => [...grades].sort((a, b) => b.graded_at.localeCompare(a.graded_at)),
    [grades],
  );

  const slipping = useMemo(
    () =>
      tallyMisses(
        runs.flatMap((g) =>
          (g.stimuli ?? [])
            // A stimulus the judge never answered for has an empty `missed` and
            // is not evidence of anything. Counting it would report our own
            // outage as her carrying every Detail in it.
            .filter((s) => !s.ungraded)
            .map((s) => ({ missed: s.missed, asked: DETAILS_BY_SLUG.get(s.slug) ?? [] })),
        ),
      ),
    [runs],
  );

  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {heading}
        </p>
        <p className="mt-1 text-sm text-foreground">
          {runs.length} {runs.length === 1 ? "section" : "sections"} run, most recent first
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Section</th>
              <th className="py-2 pr-4 font-medium">Held</th>
              <th className="py-2 pr-4 font-medium">Understood</th>
              <th className="py-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((g) => {
              const band = bandFor(g.section.mean_coverage);
              return (
                <tr key={`${g.assignment_id}-${g.attempt_no}`} className="border-b border-border/60">
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(g.graded_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {g.source_section}
                    {g.attempt_no > 1 ? (
                      <span className="text-muted-foreground"> · {g.attempt_no}</span>
                    ) : null}
                  </td>
                  <td className={cn("py-2 pr-4 tabular-nums", BAND_TEXT[band])}>
                    {g.section.mean_coverage}%
                    {/* Said, not only coloured. Visually hidden because the
                        column is a scan of numbers and a word per row would
                        drown it; the colour stays as the fast read for anyone
                        who can use it. */}
                    <span className="sr-only">, {BAND_WORD[band]}</span>
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                    {/*
                      * A marker rather than a zero for a run graded before The
                      * Read was measured. A 0 would say she understood none of
                      * it, when the truth is that nobody asked.
                      */}
                    {g.section.read_matched_count === undefined
                      ? "not asked"
                      : `${g.section.read_matched_count} of ${g.section.stimuli_graded}`}
                  </td>
                  <td
                    className={cn(
                      "py-2 tabular-nums",
                      g.section.within_goal
                        ? "text-[hsl(var(--ac-emerald-strong))]"
                        : "text-muted-foreground",
                    )}
                  >
                    {minutes(g.section.total_seconds)}
                    <span className="text-muted-foreground"> / {g.section.goal_minutes}:00</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {slipping.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            What keeps slipping
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            How often each kind of detail goes missing, of the times it came up.
          </p>
          <ul className="mt-3 space-y-2">
            {slipping.map((t) => (
              <li key={t.kind} className="flex items-center gap-3 text-sm">
                <span className="w-52 shrink-0 text-foreground">{t.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <span
                    className="block h-full rounded-full bg-[hsl(24_85%_50%)]"
                    style={{ width: `${Math.round(t.share * 100)}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
                  {Math.round(t.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
