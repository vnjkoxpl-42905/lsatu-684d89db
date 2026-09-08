import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bandFor } from "../recall/grading";
import { nextStep } from "../recall/nextStep";
import { listModelRuns, signSectionRecording } from "../api/activitiesClient";
import { raiseDispute } from "../recall/disputes";
import type { ModelRun } from "../api/activitiesClient";
import type { SectionGrade, SectionStimulusGrade } from "../api/types";

/**
 * What a finished Read, Recall, Colour section produces.
 *
 * Every stimulus graded on its own merits, showing what she missed and what she
 * got perfect. Three rules from the decisions behind it shape what is on
 * screen:
 *
 * - **A band, not a percentage.** A correct run by the author of the standard
 *   sits at a median of 93% and clears 82% nine times in ten on the live
 *   judge (ADR 0035; ADR 0018 measured 95 and 86 by hand), so a raw score
 *   against an implied 100 tells a student she failed at something she did
 *   properly (ADR 0018). This card's own docstring said that and then printed
 *   the percentage as the hero in 48px type with no band at all. The band leads
 *   now; the number is under it, because "what did I actually get" is a fair
 *   question that just does not go first.
 * - **The band answers "was this good"; the missed Details answer "what did I
 *   drop".** Both are shown even at the standard, which is what stops the top
 *   band reading as nothing left to learn.
 * - **Everything measured is either shown or deliberately not.** The grader
 *   computed her transcript, her dead air, whether each reaction was specific,
 *   whether the judge credited words she never said, and how many stimuli it
 *   could not mark, and rendered none of it. A number a student cannot
 *   interrogate is a number she has to take on faith.
 *
 * Internal identifiers never appear. She sees "Stimulus 4", never the capture's
 * own slug, and never the decoy or grader-version machinery.
 */

interface SectionReportCardProps {
  grade: SectionGrade;
  onDone?: () => void;
  /** Injected in tests and in the lab, which has no database behind it. */
  loadModelRuns?: (sourceSection: string) => Promise<Record<string, ModelRun>>;
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

/**
 * What a recited stimulus wears instead of a band.
 *
 * ADR 0018 says coverage reached by reciting is a failure, and the row said the
 * opposite. In the audit's run, stimulus 3 was read out verbatim during The
 * Recall, was correctly flagged, and still sat on the card as "At the standard,
 * 20 of 20" in green. The recital sentence was inside the expanded row, which
 * is the half she has to go looking for, and the band is the half she reads.
 *
 * Not a fifth band, because it is not a worse score -- a recital can carry every
 * detail, and that is exactly the problem. It is the statement that the number
 * beside it did not come from memory, so it is neutral rather than red: the
 * point is the method, not a mark against her.
 */
const RECITED = {
  label: "Said back word for word",
  cls: "text-muted-foreground",
  dot: "bg-muted-foreground",
};

function minutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Play one stimulus's stretch of the section recording.
 *
 * The whole run is one file and the trial proved a seek into it lands with zero
 * error, so a Clip is a start offset, an end offset and one audio element.
 * Nothing is cut server-side and nothing is downloaded twice.
 *
 * The link is signed on first use rather than on mount: most Report Cards are
 * read without anyone pressing play, and a signed URL fetched for every card
 * that opens is a request per view for a file nobody asked for.
 */
function useClip() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopAt = useRef<number | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  /** One signed link per file, made on first use and reused after. */
  const urls = useRef<Map<string, Promise<string | null>>>(new Map());

  useEffect(() => {
    const el = audio.current;
    return () => {
      el?.pause();
    };
  }, []);

  const stop = useCallback(() => {
    audio.current?.pause();
    stopAt.current = null;
    setPlaying(null);
  }, []);

  const play = useCallback(
    async (key: string, file: { bucket: string; path: string }, startMs = 0, endMs?: number) => {
      if (playing === key) {
        stop();
        return;
      }
      const id = `${file.bucket}/${file.path}`;
      if (!urls.current.has(id)) urls.current.set(id, signSectionRecording(file.bucket, file.path));
      const src = await urls.current.get(id)!;
      if (!src) return;
      let el = audio.current;
      if (!el) {
        el = new Audio();
        el.preload = "none";
        // The end of a Clip is a time, not an event the element knows about, so
        // it is watched for rather than waited on.
        el.addEventListener("timeupdate", () => {
          if (stopAt.current !== null && el!.currentTime >= stopAt.current) {
            el!.pause();
            stopAt.current = null;
            setPlaying(null);
          }
        });
        el.addEventListener("ended", () => setPlaying(null));
        audio.current = el;
      }
      if (el.src !== src) el.src = src;
      stopAt.current = endMs === undefined ? null : endMs / 1000;
      el.currentTime = startMs / 1000;
      setPlaying(key);
      try {
        await el.play();
      } catch {
        // Autoplay policy, or a file that will not load. The rest of the card is
        // the Report Card; this is the part that needs a recording to exist.
        setPlaying(null);
      }
    },
    [playing, stop],
  );

  return { play, playing };
}

/**
 * The same stimulus, done properly.
 *
 * Written first: every stimulus of every built section has a walkthrough, the
 * run cut into the verbatim read with the recall in prose beneath it. Most also
 * have the recording it was cut from, and nine never will, because the source
 * never recorded them and they were authored against the measured standard
 * instead. She reads by default and listens if she wants to, which is the right
 * way round -- a recording cannot be skimmed, searched, or sat with one line at
 * a time while she works out where her own recall lost a quantifier.
 *
 * Asked for only once a Report Card is on screen, which is also the only
 * condition under which the database will return them: a student who could
 * reach the model run for a section she has not sat could listen to a correct
 * recall and then "recall" it. After her own grade exists it can no longer help
 * her and can only teach her.
 */
function useModelRuns(
  sourceSection: string,
  load: (sourceSection: string) => Promise<Record<string, ModelRun>>,
) {
  const [runs, setRuns] = useState<Record<string, ModelRun>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const found = await load(sourceSection);
        if (!cancelled) setRuns(found);
      } catch {
        // No model runs is the ordinary answer for a section nobody has
        // finished, and the card simply does not offer the button.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceSection, load]);
  return runs;
}

/**
 * The model run as something she can read.
 *
 * Rendered from the walkthrough's own shape rather than through a markdown
 * library: the document is exactly two kinds of line, a `> ` quote holding the
 * chunk as it was read aloud and a paragraph holding the recall of it, and
 * parsing those two directly means no dependency and nothing that can render
 * markup the vault put in a file. Anything unexpected falls through as a
 * paragraph, which is the safe direction.
 *
 * Shown open, under her own words, so the comparison is the default rather than
 * a click. "You dropped the word only" is a correction; her sentence sitting
 * above his is the lesson.
 */
/**
 * The walkthrough cut into (read, recall) pairs, one per authored line.
 *
 * The document is a `> ` quote holding the line as read, then one or more
 * paragraphs recalling it. Paired up, it can sit under HER line rather than
 * at the bottom of the row, which is the comparison the drill is about: what
 * she said for line 2, and what the standard says for line 2, together.
 */
function walkthroughPairs(md: string): { read: string; recall: string }[] {
  const pairs: { read: string; recall: string }[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("> ")) pairs.push({ read: line.slice(2), recall: "" });
    else if (pairs.length) pairs[pairs.length - 1].recall += (pairs[pairs.length - 1].recall ? " " : "") + line;
    else pairs.push({ read: "", recall: line });
  }
  return pairs;
}

/**
 * Whether a stimulus hit every cylinder: every Detail, the Read, a reaction
 * of her own, in her own words and not as a list. The one case where the
 * card has nothing to ask of her, and says so rather than going quiet.
 */
function everyCylinder(s: SectionStimulusGrade): boolean {
  return (
    !s.ungraded &&
    s.missed.length === 0 &&
    s.readMatches === true &&
    s.coloured &&
    s.colourSpecific &&
    !s.reciting &&
    !s.listing
  );
}

function Walkthrough({ md }: { md: string }) {
  const lines = md.split("\n").filter((l) => l.trim());
  return (
    <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--ac-emerald-strong))]">
        Done right
      </p>
      <div className="mt-3 space-y-3">
        {lines.map((line, i) =>
          line.startsWith("> ") ? (
            <p
              key={i}
              className="border-l-2 border-[hsl(var(--ac-emerald-strong))] pl-3 text-sm italic leading-relaxed text-foreground"
            >
              {line.slice(2)}
            </p>
          ) : (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {line}
            </p>
          ),
        )}
      </div>
    </div>
  );
}

export function SectionReportCard({
  grade,
  onDone,
  loadModelRuns = listModelRuns,
}: SectionReportCardProps) {
  const [openStimulus, setOpenStimulus] = useState<number | null>(null);
  const { section, stimuli } = grade;
  const clip = useClip();
  const modelRuns = useModelRuns(grade.source_section, loadModelRuns);
  /** Her own recording, when the upload survived. */
  const hers =
    section.audio_bucket && section.audio_path
      ? { bucket: section.audio_bucket, path: section.audio_path }
      : null;

  const overall = useMemo(() => {
    const perfect = stimuli.filter((s) => s.percent === 100).length;
    const atStandard = stimuli.filter((s) => s.band === "at-the-standard").length;
    /*
     * The run's own band, which the card was missing entirely.
     *
     * Computed from the mean the same way a stimulus's is from its own percent,
     * so the headline and the rows cannot disagree about what 86 means.
     */
    const band = BAND[bandFor(section.mean_coverage)];
    /*
     * Whether the marking of this run can be trusted, in her terms.
     *
     * Two measurements, neither of which is about her. `decoy_failures` counts
     * stimuli where the judge credited a Detail belonging to a different
     * stimulus, which means it credited words she never said. `ungraded_count`
     * counts stimuli the judge never answered for, which are otherwise counted
     * as missed -- scoring her for our outage.
     */
    const suspect = (section.decoy_failures ?? 0) > 0;
    const unmarked = section.ungraded_count ?? 0;
    /** Whether The Read was measured at all. Older grades predate it. */
    const readMeasured = section.read_given_count !== undefined;
    /**
     * New grades carry both the assignment's size and each row's authored
     * position. Older grades carry neither, so they keep their historical
     * array-order rendering rather than having a section shape invented for
     * them from a slug.
     */
    const hasStoredPositions = stimuli.every((s) => s.item_order !== undefined);
    const sectionSize = hasStoredPositions ? section.stimuli_in_section : undefined;
    const missingRows = sectionSize === undefined ? 0 : Math.max(0, sectionSize - stimuli.length);

    /*
     * What she would change next time, in her own terms.
     *
     * Every one of these was measured by the grader and some were shown
     * nowhere. They are collected rather than rendered inline so a run with
     * nothing to say about it shows nothing at all, instead of an empty heading.
     */
    const notes: string[] = [];
    if (section.reciting_count > 0)
      notes.push(`${section.reciting_count} said back close to word for word`);
    if (section.listing_count > 0)
      notes.push(`${section.listing_count} told as a list rather than an argument`);
    if (section.uncoloured_count > 0)
      notes.push(`${section.uncoloured_count} with no reaction of your own`);
    if (section.worst_dead_air_seconds >= section.dead_air_threshold_seconds)
      notes.push(`Longest freeze inside a recall: ${section.worst_dead_air_seconds}s`);
    if ((section.chunks_read_aloud ?? 0) > 0)
      notes.push(
        `You read ${section.chunks_read_aloud} of them out loud before recalling. That is not marked against you, and reading silently is the harder, better version.`,
      );

    return {
      perfect,
      atStandard,
      band,
      next: nextStep(section, stimuli),
      suspect,
      unmarked,
      readMeasured,
      notes,
      sectionSize,
      missingRows,
    };
  }, [stimuli, section]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[28px] border border-border bg-[hsl(var(--ac-surface))] p-8 shadow-[0_2px_24px_rgba(30,24,16,0.06)] md:p-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {grade.attempt_no > 1 ? `Report Card · Attempt ${grade.attempt_no}` : "Report Card"}
        </p>

        {/* The band leads. The number is available and does not go first. */}
        <p className={cn("ac-display mt-3 text-5xl", overall.band.cls)}>{overall.band.label}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {overall.sectionSize !== undefined
            ? `${section.stimuli_graded} of ${overall.sectionSize} stimuli, marked`
            : overall.readMeasured
            ? `${section.stimuli_graded} ${section.stimuli_graded === 1 ? "stimulus" : "stimuli"}, marked`
            : `${section.mean_coverage}% of the details carried, across ${section.stimuli_graded} ${
                section.stimuli_graded === 1 ? "stimulus" : "stimuli"
              }`}
        </p>

        {overall.missingRows > 0 && overall.sectionSize !== undefined && (
          <p className="mt-4 rounded-2xl border border-border bg-[hsl(var(--muted))] px-4 py-3 text-sm text-muted-foreground">
            {overall.missingRows} of the {overall.sectionSize} did not save, so they are not marked
            here. That is ours, not yours.
          </p>
        )}

        <p className="mt-6 text-sm text-foreground">
          {overall.atStandard} of {stimuli.length} at the standard
          {overall.perfect > 0 ? `, ${overall.perfect} with nothing dropped` : ""}.
        </p>

        {/*
          * What to do tomorrow, in one sentence or not at all.
          *
          * The audit asked whether she would know what to do next and the
          * answer was no: every other line on this card describes what
          * happened. This is the only one that asks for something, which is why
          * it is one line and why a run with nothing clear to say gets none.
          */}
        {overall.next && (
          <p className="mt-4 rounded-2xl border border-border bg-[hsl(var(--muted))] px-4 py-3 text-sm text-foreground">
            {overall.next}
          </p>
        )}

        {/*
          * The two numbers, side by side.
          *
          * Coverage answers "did you hold it". The Read answers "did you
          * understand it", and it is the criterion the method is built around.
          * It was authored on every stimulus, promised to her in the briefing,
          * and measured by nothing until now. Putting them together is the
          * whole point: one of them is memory and the other is the one that
          * predicts a score, and a card showing only the first says the drill
          * is about memory.
          */}
        {overall.readMeasured && (
          <div className="mt-6 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Held
              </p>
              <p className="ac-display mt-1 text-3xl text-foreground">{section.mean_coverage}%</p>
              <p className="mt-1 text-xs text-muted-foreground">of the details, said back</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Understood
              </p>
              <p className="ac-display mt-1 text-3xl text-foreground">
                {section.read_matched_count} of {section.stimuli_graded}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(section.no_read_count ?? 0) > 0
                  ? `Reads that found the move. You gave none at all on ${section.no_read_count}.`
                  : "Reads that found the move"}
              </p>
            </div>
          </div>
        )}

        {/*
          * The clock, and the condition on it.
          *
          * The goal counts only if every stimulus was recalled, coloured and
          * given a Read. Collapsing that into one boolean is what let a student
          * skip the colouring, finish early and be told she made the goal, so
          * the qualifier sits directly under the time rather than beside it in
          * a wrapped row of unrelated remarks.
          */}
        <div className="mt-6 border-t border-border pt-6">
          <p
            className={cn(
              "text-sm",
              section.within_goal ? "text-[hsl(var(--ac-emerald-strong))]" : "text-foreground",
            )}
          >
            {minutes(section.total_seconds)} against a {section.goal_minutes} minute goal
          </p>
          {section.within_time && !section.within_goal && (
            <p className="mt-1 text-xs text-muted-foreground">
              Inside the time, but the goal only counts with every stimulus coloured and given a
              Read.
            </p>
          )}
          {/*
            * Over the goal, which used to get nothing at all.
            *
            * The qualifier above fires only when she is inside the time and
            * short of the goal, so going over rendered as plain uncoloured
            * text with no comment on it: the one case most in need of a word.
            * Not a rebuke. Early runs are slow by design and the briefing
            * already says to go slower while it is new, so this says what the
            * time is for rather than that she was late.
            */}
          {section.within_time === false && (
            <p className="mt-1 text-xs text-muted-foreground">
              Over the goal, which early runs are meant to be. The goal is what the drill costs once
              it is a habit, not a limit on today.
            </p>
          )}
        </div>

        {/*
          * The habits, as a list rather than a wrapped row.
          *
          * These are five different observations about how she ran the section
          * and they were laid out as inline spans, so they read as one run-on
          * sentence in amber. One per line, and the section is absent entirely
          * when there is nothing to say, which is what makes a clean run look
          * clean.
          */}
        {overall.notes.length > 0 && (
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Worth working on
            </p>
            <ul className="mt-3 space-y-1.5">
              {overall.notes.map((note) => (
                <li key={note} className="text-sm text-foreground">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/*
          * When the marking itself is in doubt, she is told before the number.
          *
          * Both of these are about us. A stimulus the judge never answered for
          * is counted as missed, which scores her for our outage, and she is
          * the only person in a position to notice the score looks wrong.
          */}
        {(overall.suspect || overall.unmarked > 0) && (
          <div className="mt-6 rounded-2xl border border-border bg-[hsl(var(--muted))] px-4 py-3 text-sm text-muted-foreground">
            {overall.unmarked > 0 && (
              <p>
                {overall.unmarked} {overall.unmarked === 1 ? "stimulus" : "stimuli"} could not be
                marked, so {overall.unmarked === 1 ? "it counts" : "they count"} as nothing carried.
                That is ours, not yours. Come back later and it will have been marked properly.
              </p>
            )}
            {overall.suspect && (
              <p className={overall.unmarked > 0 ? "mt-2" : undefined}>
                Our own check on this marking came back unhappy, so treat the number on one or two
                of these lightly. Joshua can see the same thing.
              </p>
            )}
          </div>
        )}
      </div>

      <ol className="mt-6 space-y-3">
        {stimuli.map((s, i) => {
          // A recital does not get a success band, whatever it carried.
          const band = s.reciting ? RECITED : BAND[s.band];
          const open = openStimulus === i;
          const clipWindow = s.recall_window_ms ?? s.window_ms;
          const key = `s${i}`;
          const model = modelRuns[s.slug];
          const pairs = model?.walkthrough ? walkthroughPairs(model.walkthrough) : [];
          // Paired only when the standard's run has exactly one recall per
          // authored line; anything else is shown whole, as before.
          const pairedByLine = !!s.lines?.length && pairs.length === s.lines.length;
          return (
            <li key={s.slug} className="rounded-2xl border border-border bg-[hsl(var(--ac-surface))]">
              <button
                type="button"
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
                onClick={() => setOpenStimulus(open ? null : i)}
                aria-expanded={open}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", band.dot)} aria-hidden />
                <span className="w-24 shrink-0 text-sm text-muted-foreground">
                  Stimulus {s.item_order ?? i + 1}
                </span>
                <span className={cn("text-sm font-medium", band.cls)}>{band.label}</span>
                <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                  {s.carried} of {s.total}
                </span>
              </button>

              {open && (
                <div className="border-t border-border px-5 py-4">
                  {/*
                    * The passage itself, so she can reread what she was
                    * holding without leaving the card. Stored on the grade
                    * since 2026-09-08; older cards have only the lines.
                    */}
                  {s.stimulus_text && (
                    <details className="mb-4 rounded-xl border border-border bg-background/40 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        The passage
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{s.stimulus_text}</p>
                    </details>
                  )}

                  {/*
                    * What to do next time, or that there is nothing to.
                    *
                    * The one line on the row that asks for something. It is
                    * the judge's, written from this run, and it is empty when
                    * she carried everything, found the Read and reacted; then
                    * the card says so, because silence reads as an oversight.
                    */}
                  {!s.ungraded && everyCylinder(s) && (
                    <p className="mb-4 rounded-xl border border-[hsl(var(--ac-emerald-strong))]/40 bg-background/40 px-3 py-2 text-sm text-[hsl(var(--ac-emerald-strong))]">
                      Every cylinder on this one: every detail, the Read, and a reaction of your own,
                      in your own words.
                    </p>
                  )}
                  {!s.ungraded && !everyCylinder(s) && s.nextTime && (
                    <div className="mb-4 rounded-xl border border-border bg-[hsl(var(--muted))] px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Next time
                      </p>
                      <p className="mt-1 text-sm text-foreground">{s.nextTime}</p>
                    </div>
                  )}

                  {s.ungraded ? (
                    <p className="text-sm text-muted-foreground">
                      This one could not be marked, so it is showing as nothing carried. That is
                      ours, not yours.
                    </p>
                  ) : s.missed.length === 0 ? (
                    /* The same contradiction as the band, one level down. A
                       recital carries everything by construction, so
                       congratulating it in green sits directly above the
                       sentence explaining that it does not count. */
                    <p
                      className={cn(
                        "text-sm",
                        s.reciting ? "text-muted-foreground" : "text-[hsl(var(--ac-emerald-strong))]",
                      )}
                    >
                      {s.reciting
                        ? "Every detail is in there, which is what reciting does rather than what you did."
                        : "You carried every detail in this one."}
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

                  {/* Her Read, which is the half that predicts a score. */}
                  {s.readGiven !== undefined && (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Your Read
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {!s.readGiven
                          ? "You stopped at the retelling. Say what the argument is doing, not only what it says."
                          : s.readMatches
                            ? "You found the move."
                            : "You gave a Read, but not the one this argument turns on."}
                      </p>
                      {/*
                        * Why, in the judge's words, and what the key names.
                        *
                        * Both were stored and neither was shown, so "not the
                        * one this argument turns on" was a verdict with no
                        * reason and no answer. The reason is what she can
                        * dispute; the key is what she can learn from.
                        */}
                      {s.readReason && (
                        <p className="mt-1 text-sm text-muted-foreground">{s.readReason}</p>
                      )}
                      {s.the_read && (
                        <p className="mt-2 border-l-2 border-[hsl(var(--ac-emerald-strong))] pl-3 text-sm italic leading-relaxed text-foreground">
                          The Read this one turns on: {s.the_read}
                        </p>
                      )}
                    </div>
                  )}

                  {(s.reciting || s.listing || !s.coloured || (s.coloured && !s.colourSpecific)) && (
                    <div className="mt-4 space-y-1 border-t border-border pt-3">
                      {s.reciting && (
                        <p className="text-sm text-muted-foreground">
                          This one came back close to word for word, so the details on it were
                          carried by the page rather than by you. Say it in your own words instead,
                          even clumsily. That is the version that tells you what you actually have.
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
                      {/*
                        * Measured on 18 of 22 in the trial and shown on none.
                        * It is the one standard the whole method turns on: a
                        * reaction that would fit any other stimulus is not a
                        * reaction to this one.
                        */}
                      {s.coloured && !s.colourSpecific && (
                        <p className="text-sm text-muted-foreground">
                          Your reaction would have fitted any stimulus. React to what this one
                          actually claims.
                        </p>
                      )}
                    </div>
                  )}

                  {s.dead_air_seconds >= section.dead_air_threshold_seconds && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      You went quiet for {s.dead_air_seconds}s in the middle of this recall. That is
                      the moment it went, and it is worth finding out what was there.
                    </p>
                  )}

                  {/*
                    * Line by line, because that is how she worked.
                    *
                    * She reads one line silently, looks away and says it back,
                    * and until now the card could only tell her a point went
                    * missing somewhere in the stimulus. The cut is worked out
                    * after the run from the silence in front of each spoken
                    * line, so it is approximate -- which is why it says what she
                    * carried and dropped rather than scoring the line. Coverage
                    * above is unchanged.
                    */}
                  {!!s.lines?.length && (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Line by line
                      </p>
                      <ol className="mt-3 space-y-3">
                        {s.lines.map((line) => (
                          <li key={line.n} className="rounded-xl bg-[hsl(var(--ac-surface-muted,var(--muted)))] px-3 py-2">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">
                                {line.n}. {line.text}
                              </p>
                              <span className="flex shrink-0 items-baseline gap-3">
                                <span
                                  className={cn(
                                    "text-xs uppercase tracking-[0.12em]",
                                    line.verdict === "strong"
                                      ? "text-[hsl(var(--ac-emerald-strong))]"
                                      : line.verdict === "skipped"
                                        ? "text-[hsl(350_80%_45%)]"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  {line.verdict === "skipped" ? "nothing said" : line.verdict}
                                </span>
                                {hers && line.startMs !== undefined && line.endMs !== undefined && (
                                  <button
                                    type="button"
                                    className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
                                    onClick={() =>
                                      void clip.play(`${key}-l${line.n}`, hers, line.startMs, line.endMs)
                                    }
                                  >
                                    {clip.playing === `${key}-l${line.n}` ? "Stop" : "Hear it"}
                                  </button>
                                )}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {line.spoken || "You did not say anything for this line."}
                            </p>
                            {line.note && <p className="mt-1 text-sm text-foreground">{line.note}</p>}
                            {line.dropped.length > 0 && (
                              <p className="mt-1 text-sm text-[hsl(24_85%_42%)]">
                                Dropped: {line.dropped.join("; ")}
                              </p>
                            )}
                            {line.carried.length > 0 && (
                              <p className="mt-1 text-sm text-[hsl(var(--ac-emerald-strong))]">
                                Held: {line.carried.join("; ")}
                              </p>
                            )}
                            {pairedByLine && pairs[line.n - 1]?.recall && (
                              <p className="mt-2 border-l-2 border-[hsl(var(--ac-emerald-strong))] pl-3 text-sm leading-relaxed text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--ac-emerald-strong))]">
                                  Done right
                                </span>{" "}
                                {pairs[line.n - 1].recall}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                      {s.recall && (
                        <div className="mt-3 rounded-xl border border-border px-3 py-2">
                          <p className="text-sm font-medium text-foreground">
                            The whole thing, text off screen — {s.recall.verdict}
                          </p>
                          {s.recall.note && (
                            <p className="mt-1 text-sm text-muted-foreground">{s.recall.note}</p>
                          )}
                        </div>
                      )}
                      {!!s.bigMisses?.length && (
                        <p className="mt-3 text-sm text-foreground">
                          Biggest misses: {s.bigMisses.join("; ")}
                        </p>
                      )}
                    </div>
                  )}


                  {/*
                    * What the machine heard, and her own voice saying it.
                    *
                    * Both were produced by the grader and thrown away. Reading
                    * the words back is the fastest way to tell a transcription
                    * failure from a memory failure; hearing yourself not say
                    * "only" is the argument ADR 0020 makes for Clips, and the
                    * seek was proved exact on the trial run.
                    */}
                  {(s.spoken || (hers && clipWindow) || model) && (
                    <div className="mt-4 border-t border-border pt-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          What you said
                        </p>
                        {/*
                          * Hers, then his.
                          *
                          * The pair is the lesson. One of them is a correction
                          * and two of them is a demonstration, which is the
                          * whole argument for putting a recording on this page
                          * at all.
                          */}
                        <span className="flex gap-4">
                          {hers && clipWindow && (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
                              onClick={() => void clip.play(key, hers, clipWindow.start, clipWindow.end)}
                            >
                              {clip.playing === key ? "Stop" : "Hear it back"}
                            </button>
                          )}
                          {model?.audio && (
                            <button
                              type="button"
                              className="text-xs text-[hsl(var(--ac-emerald-strong))] underline decoration-dotted underline-offset-4"
                              onClick={() => void clip.play(`${key}-model`, model.audio!)}
                            >
                              {clip.playing === `${key}-model` ? "Stop" : "Hear it done right"}
                            </button>
                          )}
                        </span>
                      </div>
                      {s.spoken ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {s.spoken}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Nothing was picked up here.
                        </p>
                      )}
                      {/*
                        * Where the marking came from, said out loud.
                        *
                        * The v1 spec named transcription error as the top risk
                        * and showing her the transcript as the mitigation. The
                        * transcript was shown and nothing said what it was FOR,
                        * so a mis-hearing reads as a verdict about her. In the
                        * audit's run stimulus 5's judge reason quoted her as
                        * saying "clearly moral characters"; the recording says
                        * immoral, and she was told she gave the wrong Read.
                        *
                        * "Hear it back" above is what lets her check, which is
                        * why this sits under the words rather than anywhere
                        * else on the card.
                        */}
                      {s.spoken && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            The marking is done from these words. If they are not what you said, the
                            marking is wrong, not you. Play it back and say so.
                          </p>
                          <DisputeControl grade={grade} stimulus={s} />
                        </div>
                      )}
                      {model?.walkthrough && !pairedByLine && <Walkthrough md={model.walkthrough} />}
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

/**
 * "This is not what I said."
 *
 * One control, one row, no workflow. It is on the expanded row rather than the
 * card's head because it is about ONE stimulus's verdict, and because the clip
 * and the transcript are right there -- she can check before she claims, which
 * is what makes the claim worth storing.
 *
 * It is drawn as a quiet text button, not a call to action. The card must not
 * invite a student to dispute every band she dislikes; it must make it possible
 * to report the specific failure the audit found, where the app misheard her
 * and marked her down for its own mistake.
 *
 * **It never claims success it did not have.** The table arrives with its own
 * migration, so on a database that has not had it applied the insert fails, and
 * a control that showed "Noted" anyway would be lying on the one screen whose
 * subject is the app getting her wrong. `not-configured` says so plainly.
 */
function DisputeControl({
  grade,
  stimulus,
}: {
  grade: SectionGrade;
  stimulus: SectionStimulusGrade;
}) {
  type State = "idle" | "sending" | "noted" | "unavailable" | "failed";
  const [state, setState] = useState<State>("idle");

  const send = useCallback(async () => {
    setState("sending");
    const result = await raiseDispute({
      assignmentId: grade.assignment_id,
      attemptNo: grade.attempt_no,
      stimulusSlug: stimulus.slug,
      sourceSection: grade.source_section,
      studentId: grade.student_id,
      band: stimulus.reciting ? "recited" : stimulus.band,
      reason: stimulus.readReason || null,
    });
    if (result.ok) {
      setState("noted");
      return;
    }
    // Narrowed by hand rather than by the discriminant: this project runs with
    // `strictNullChecks` off, which weakens union narrowing here.
    const failure = result as { ok: false; reason: "not-configured" | "failed" };
    setState(failure.reason === "not-configured" ? "unavailable" : "failed");
  }, [grade, stimulus]);

  if (state === "noted") {
    return (
      <p className="mt-1.5 text-xs text-muted-foreground" role="status">
        Noted. Joshua will see this beside the run.
      </p>
    );
  }

  if (state === "unavailable" || state === "failed") {
    return (
      <p className="mt-1.5 text-xs text-muted-foreground" role="status">
        That did not save. Tell Joshua directly and he will look at the recording.
      </p>
    );
  }

  return (
    <button
      type="button"
      className="mt-1.5 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground disabled:opacity-60"
      onClick={send}
      disabled={state === "sending"}
    >
      {state === "sending" ? "Saving..." : "This is not what I said"}
    </button>
  );
}
