import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionGrade, SectionStimulusGrade } from "../api/types";

/**
 * What a finished Read, Recall, Colour section produces.
 *
 * Every stimulus graded on its own merits, showing what she missed and what she
 * got perfect. Two rules from the decisions behind it shape what is on screen:
 *
 * - **A band, not a percentage.** A correct run by the author of the standard
 *   sits at a median of 95% and clears 86% nine times in ten, so a raw score
 *   against an implied 100 tells a student she failed at something she did
 *   properly (ADR 0018). The number is still shown, under the band, because
 *   "what did I actually get" is a fair question; it just does not lead.
 * - **The band answers "was this good"; the missed Details answer "what did I
 *   drop".** Both are shown even at the standard, which is what stops the top
 *   band reading as nothing left to learn.
 *
 * Internal identifiers never appear. She sees "Stimulus 4", never the capture's
 * own slug, and never the decoy or grader-version machinery.
 */

interface SectionReportCardProps {
  grade: SectionGrade;
  onDone?: () => void;
}

const BAND: Record<SectionStimulusGrade["band"], { label: string; cls: string; dot: string }> = {
  "at-the-standard": {
    label: "At the standard",
    cls: "text-[hsl(var(--ac-emerald-strong))]",
    dot: "bg-[hsl(var(--ac-emerald-strong))]",
  },
  "nearly-there": { label: "Nearly there", cls: "text-[hsl(38_92%_34%)]", dot: "bg-[hsl(38_92%_44%)]" },
  thin: { label: "Thin", cls: "text-[hsl(24_85%_42%)]", dot: "bg-[hsl(24_85%_50%)]" },
  "lost-it": { label: "Worth another read", cls: "text-[hsl(350_80%_45%)]", dot: "bg-[hsl(350_80%_55%)]" },
};

function minutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SectionReportCard({ grade, onDone }: SectionReportCardProps) {
  const [openStimulus, setOpenStimulus] = useState<number | null>(null);
  const { section, stimuli } = grade;

  const overall = useMemo(() => {
    const perfect = stimuli.filter((s) => s.percent === 100).length;
    const atStandard = stimuli.filter((s) => s.band === "at-the-standard").length;
    return { perfect, atStandard };
  }, [stimuli]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[28px] border border-border bg-[hsl(var(--ac-surface))] p-8 shadow-[0_2px_24px_rgba(30,24,16,0.06)] md:p-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Report Card
        </p>
        <p className="ac-display mt-3 text-5xl text-foreground">{section.mean_coverage}%</p>
        <p className="mt-2 text-sm text-muted-foreground">
          of the details carried, across {section.stimuli_graded}{" "}
          {section.stimuli_graded === 1 ? "stimulus" : "stimuli"}
        </p>

        <p className="mt-6 text-sm text-foreground">
          {overall.atStandard} of {stimuli.length} at the standard
          {overall.perfect > 0 ? `, ${overall.perfect} with nothing dropped` : ""}.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className={section.within_goal ? "text-[hsl(var(--ac-emerald-strong))]" : "text-muted-foreground"}>
            {minutes(section.total_seconds)} against a {section.goal_minutes} minute goal
          </span>
          {section.reciting_count > 0 && (
            <span className="text-[hsl(38_92%_34%)]">
              {section.reciting_count} said back close to word for word
            </span>
          )}
          {section.listing_count > 0 && (
            <span className="text-[hsl(38_92%_34%)]">
              {section.listing_count} told as a list rather than an argument
            </span>
          )}
        </div>
      </div>

      <ol className="mt-6 space-y-3">
        {stimuli.map((s, i) => {
          const band = BAND[s.band];
          const open = openStimulus === i;
          return (
            <li key={s.slug} className="rounded-2xl border border-border bg-[hsl(var(--ac-surface))]">
              <button
                type="button"
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
                onClick={() => setOpenStimulus(open ? null : i)}
                aria-expanded={open}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", band.dot)} aria-hidden />
                <span className="w-24 shrink-0 text-sm text-muted-foreground">Stimulus {i + 1}</span>
                <span className={cn("text-sm font-medium", band.cls)}>{band.label}</span>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  {s.carried} of {s.total}
                </span>
              </button>

              {open && (
                <div className="border-t border-border px-5 py-4">
                  {s.missed.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--ac-emerald-strong))]">
                      You carried every detail in this one.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        What slipped
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {s.missed.map((m) => (
                          <li key={m} className="text-sm text-foreground">
                            {m}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {(s.reciting || s.listing || !s.coloured) && (
                    <div className="mt-4 space-y-1 border-t border-border pt-3">
                      {s.reciting && (
                        <p className="text-sm text-muted-foreground">
                          This one came back close to word for word. Say it in your own words instead.
                        </p>
                      )}
                      {s.listing && (
                        <p className="text-sm text-muted-foreground">
                          This came out as a run of facts. Tell it as one connected argument.
                        </p>
                      )}
                      {!s.coloured && (
                        <p className="text-sm text-muted-foreground">
                          Nothing of your own on this one. React to it, even briefly.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {onDone && (
        <div className="mt-8 text-center">
          <Button onClick={onDone}>Done</Button>
        </div>
      )}
    </div>
  );
}
