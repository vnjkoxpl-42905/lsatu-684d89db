import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bandFor } from "../recall/grading";
import { nextStep } from "../recall/nextStep";
import { pickFocusSet } from "../recall/focusSet";
import { insideTime } from "../recall/sectionClock";
import { listModelRuns, signSectionRecording } from "../api/activitiesClient";
import { raiseDispute } from "../recall/disputes";
import type { ModelRun } from "../api/activitiesClient";
import type { SectionGrade, SectionLineGrade, SectionStimulusGrade } from "../api/types";
import "./report-card.css";

/**
 * What a finished Read, Recall, Colour section produces.
 *
 * Every stimulus graded on its own merits, showing what she missed and what she
 * got perfect. Four rules from the decisions behind it shape what is on screen:
 *
 * - **A band, not a percentage.** A correct run by the author of the standard
 *   sits at a median of 93% and clears 82% nine times in ten on the live
 *   judge (ADR 0035; ADR 0018 measured 95 and 86 by hand), so a raw score
 *   against an implied 100 tells a student she failed at something she did
 *   properly (ADR 0018). The band leads; the number is under it, because "what
 *   did I actually get" is a fair question that just does not go first.
 * - **The band answers "was this good"; the missed Details answer "what did I
 *   drop".** Both are shown even at the standard, which is what stops the top
 *   band reading as nothing left to learn.
 * - **Everything measured is either shown or deliberately not.** A number a
 *   student cannot interrogate is a number she has to take on faith.
 * - **One stimulus at a time.** Twenty-two collapsible rows made the card a
 *   list to be got through, and every row opened into the same ten stacked
 *   blocks of undifferentiated small text. The ledger across the console shows
 *   the shape of the whole run at a glance; the page below shows exactly one
 *   stimulus, in the same order every time, so by the third she knows where to
 *   look without reading the labels.
 *
 * Internal identifiers never appear. She sees "Stimulus 4", never the capture's
 * own slug, and never the decoy or grader-version machinery.
 */

interface SectionReportCardProps {
  grade: SectionGrade;
  onDone?: () => void;
  /**
   * Start the focus set: the weakest stimuli of this run, again.
   *
   * Absent on a read-only card (the teacher's view of somebody else's run), and
   * the panel itself is absent on a run with nothing weak in it -- a student who
   * ran it well is asked for nothing.
   */
  onStartFocusSet?: (slugs: string[]) => Promise<void> | void;
  /** Injected in tests and in the lab, which has no database behind it. */
  loadModelRuns?: (sourceSection: string) => Promise<Record<string, ModelRun>>;
}

const BAND: Record<SectionStimulusGrade["band"], { label: string; mark: string }> = {
  "at-the-standard": { label: "At the standard", mark: "at-the-standard" },
  "nearly-there": { label: "Nearly there", mark: "nearly-there" },
  thin: { label: "Thin", mark: "thin" },
  "lost-it": { label: "Worth another read", mark: "lost-it" },
};

/**
 * What a recited stimulus wears instead of a band.
 *
 * ADR 0018 says coverage reached by reciting is a failure, and the row said the
 * opposite. In the audit's run, stimulus 3 was read out verbatim during The
 * Recall, was correctly flagged, and still sat on the card as "At the standard,
 * 20 of 20" in green.
 *
 * Not a fifth band, because it is not a worse score -- a recital can carry every
 * detail, and that is exactly the problem. It is the statement that the number
 * beside it did not come from memory, so it takes no colour at all: the point is
 * the method, not a mark against her.
 */
const RECITED = { label: "Said back word for word", mark: "recited" };

function meaningPercent(stimulus: SectionStimulusGrade): number {
  return Number.isFinite(stimulus.meaning_percent) ? stimulus.meaning_percent! : stimulus.percent;
}

function meaningLabel(percent: number): string {
  return percent === 100 ? "Meaning preserved" : "Review meaning changes";
}

function stimulusStatus(stimulus: SectionStimulusGrade): { label: string; mark: string } {
  if (stimulus.reciting) return RECITED;
  if (Number.isFinite(stimulus.meaning_percent)) {
    return { label: meaningLabel(stimulus.meaning_percent!), mark: stimulus.meaning_percent === 100 ? "at-the-standard" : "thin" };
  }
  return BAND[stimulus.band];
}

function minutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Play one stimulus's stretch of the section recording, and say where it is.
 *
 * The whole run is one file and the trial proved a seek into it lands with zero
 * error, so a Clip is a start offset, an end offset and one audio element.
 * Nothing is cut server-side and nothing is downloaded twice.
 *
 * `positionMs` is the addition that makes the transcript follow the sound. The
 * grader already stores a start and an end for each line she spoke, so the card
 * does not need word timings to know which line is in the air: it needs the
 * playhead, and that is one number ticking off the element it already owns.
 *
 * The link is signed on first use rather than on mount: most Report Cards are
 * read without anyone pressing play, and a signed URL fetched for every card
 * that opens is a request per view for a file nobody asked for.
 */
function useClip() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopAt = useRef<number | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [positionMs, setPositionMs] = useState<number>(0);
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
        // it is watched for rather than waited on. The same tick reports the
        // playhead, which is what the transcript highlight rides on.
        el.addEventListener("timeupdate", () => {
          setPositionMs(el!.currentTime * 1000);
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
      setPositionMs(startMs);
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

  return { play, playing, positionMs };
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
 * The walkthrough cut into (read, recall) pairs, one per authored line.
 *
 * The document is a `> ` quote holding the line as read, then one or more
 * paragraphs recalling it. Paired up, it can sit under HER line rather than
 * at the bottom of the page, which is the comparison the drill is about: what
 * she said for line 2, and what the standard says for line 2, together.
 *
 * Rendered from the walkthrough's own shape rather than through a markdown
 * library: the document is exactly two kinds of line, and parsing those two
 * directly means no dependency and nothing that can render markup the vault put
 * in a file. Anything unexpected falls through as a paragraph, which is the safe
 * direction.
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
 *
 * Measured here rather than taken from the judge. The prompt asks it to leave
 * `next_time` empty when there is nothing to fix and it has never once done so
 * across 44 real stimuli, so a card that trusted the empty string would never
 * congratulate anybody.
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

/**
 * How much of it came back, in words.
 *
 * A Detail is OUR unit. It is how the judge is asked to mark, it is what the
 * coverage percentage is computed from, and a student has never seen one
 * enumerated: she read a passage and said it back. Printing "20 of 21 details"
 * hands her our machinery and asks her to care about the one number on the page
 * she cannot check (Joshua, 2026-09-08). The band says how it went; this says
 * how much of it she kept, the way a person would say it.
 *
 * The ban is on Detail arithmetic, not on the percentage. Percentages are
 * allowed per stimulus and at section level (Joshua, 2026-09-09), and the
 * figure now sits beside these words under the same name the console gives it,
 * so one statistic is not a number in the ledger and a phrase here.
 */
function howMuch(percent: number): string {
  if (percent >= 100) return "All of it came back.";
  if (percent >= 90) return "Almost all of it came back.";
  if (percent >= 75) return "Most of it came back.";
  if (percent >= 55) return "About half of it came back.";
  if (percent >= 25) return "Some of it came back.";
  return "Not much of it came back.";
}

/**
 * What she actually did well on this stimulus, in specifics.
 *
 * Praise is a specific observation or it is noise, and the card had none: a
 * stimulus at the standard got one sentence saying she carried every detail and
 * a stimulus at 86% got nothing at all, so twenty of twenty-two rows were a
 * list of what went wrong. Every item below is read off something the grader
 * measured, so none of it can be true of a run that did not earn it.
 *
 * Capped at three. A congratulation that runs to five bullets is a participation
 * award, and she will stop reading them.
 */
function whatHeld(s: SectionStimulusGrade): string[] {
  if (s.ungraded) return [];
  const held: string[] = [];
  // A recital carries everything by construction, so nothing about coverage is
  // to her credit on one. The method is the point.
  if (!s.reciting) {
    // How much came back is said once, on the row above, in words. It is not
    // repeated here as a fraction.
    const whole = s.lines?.filter((l) => l.verdict === "strong").length ?? 0;
    if (whole === 1) held.push("One line came back whole.");
    else if (whole > 1 && whole === s.lines?.length) held.push("Every line came back whole.");
    else if (whole > 1) held.push(`${whole} of the lines came back whole.`);
  }
  if (s.readMatches) held.push("Your Read found the move this one turns on.");
  if (s.coloured && s.colourSpecific) held.push("Your reaction was about this stimulus, not one that would fit any of them.");
  return held.slice(0, 3);
}

/** The line the playhead is inside, or none when nothing of hers is playing. */
function lineAtPlayhead(lines: SectionLineGrade[] | undefined, positionMs: number, live: boolean) {
  if (!live || !lines?.length) return null;
  const hit = lines.find(
    (l) => l.startMs !== undefined && l.endMs !== undefined && positionMs >= l.startMs && positionMs <= l.endMs,
  );
  return hit ? hit.n : null;
}

/** The standard's whole run, when it does not pair line for line with hers. */
function Walkthrough({ md }: { md: string }) {
  const lines = md.split("\n").filter((l) => l.trim());
  return (
    <div className="mt-4 rounded-lg border border-[var(--rc-hairline)] bg-[var(--rc-card)] p-4">
      <p className="rc__label">Done right</p>
      <div className="mt-3 space-y-3">
        {lines.map((line, i) =>
          line.startsWith("> ") ? (
            <p key={i} className="text-sm italic leading-relaxed text-[var(--rc-ink)]">
              {line.slice(2)}
            </p>
          ) : (
            <p key={i} className="text-sm leading-relaxed text-[var(--rc-ink-muted)]">
              {line}
            </p>
          ),
        )}
      </div>
    </div>
  );
}

/** One of the three figures on the console. */
function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="rc__label rc__label--onconsole">{label}</p>
      <p className="rc__display mt-1.5 text-[28px] text-[var(--rc-console-ink)]">{value}</p>
      {note && <p className="mt-1 text-xs leading-snug text-[var(--rc-console-ink-dim)]">{note}</p>}
    </div>
  );
}

/**
 * A section of the open stimulus. One label style, one rhythm, same order.
 *
 * `tone` is the kind of feedback the section carries, not how bad it is: a
 * dropped Detail and a held one are both `detail`, and the rule above the
 * label is the same colour for each. See the palette note in report-card.css
 * for why that is the whole point.
 */
function Movement({
  label,
  tone,
  children,
  className,
}: {
  label: string;
  tone?: "detail" | "read" | "colour" | "method";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rc__movement pt-5", tone && `rc__movement--${tone}`, className)}
      aria-label={label}
    >
      {/* A movement sits under the open stimulus, which is an h2, so these are
          h3. They were `p`, which is why a card of eight sections offered a
          screen reader nothing to move between. */}
      <h3 className="rc__label">{label}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SectionReportCard({
  grade,
  onDone,
  onStartFocusSet,
  loadModelRuns = listModelRuns,
}: SectionReportCardProps) {
  const { section, stimuli } = grade;
  /*
   * One open at a time, and the first one open on arrival.
   *
   * The card used to open with twenty-two closed rows, which meant the default
   * state of the screen she waited twenty-five minutes for was a list of
   * headings. Something is always open now, and the ledger says which.
   */
  const [openStimulus, setOpenStimulus] = useState<number>(0);
  /** The ledger's buttons, so the arrow keys can move focus with the selection. */
  const tickRefs = useRef<(HTMLButtonElement | null)[]>([]);
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
     * The run's own band. Computed from the mean the same way a stimulus's is
     * from its own percent, so the headline and the ledger cannot disagree
     * about what 86 means.
     */
    const band = Number.isFinite(section.mean_meaning)
      ? { label: meaningLabel(section.mean_meaning!), mark: section.mean_meaning === 100 ? "at-the-standard" : "thin" }
      : BAND[bandFor(section.mean_coverage)];
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
     * How she ran the section, as against how she did on it.
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

  const s = stimuli[Math.min(openStimulus, stimuli.length - 1)];
  const key = `s${openStimulus}`;
  const band = s ? stimulusStatus(s) : null;
  let heldNote = Number.isFinite(section.mean_meaning)
    ? "of the argument's meaning, in your own words"
    : "of what was on the page, said back in your own words";
  if (overall.missingRows > 0 && overall.sectionSize !== undefined) {
    heldNote = Number.isFinite(section.mean_meaning)
      ? `${heldNote}, across the ${section.stimuli_graded} of ${overall.sectionSize} that saved`
      : `said back in your own words, across the ${section.stimuli_graded} of ${overall.sectionSize} that saved`;
  }
  const clipWindow = s?.recall_window_ms ?? s?.window_ms;
  const model = s ? modelRuns[s.slug] : undefined;
  const pairs = model?.walkthrough ? walkthroughPairs(model.walkthrough) : [];
  // Paired only when the standard's run has exactly one recall per authored
  // line; anything else is shown whole, as before.
  const pairedByLine = !!s?.lines?.length && pairs.length === s.lines.length;
  const held = s ? whatHeld(s) : [];
  /*
   * The highlight follows her own voice only.
   *
   * The grader stores a start and an end for every line SHE spoke. It stores
   * nothing of the kind for the standard's recording, so a card that
   * highlighted through both would be inventing the timings for one of them.
   */
  const hersPlaying =
    clip.playing === key || (clip.playing?.startsWith(`${key}-l`) ?? false);
  const activeLine = lineAtPlayhead(s?.lines, clip.positionMs, hersPlaying);

  return (
    <div className="rc mx-auto max-w-[820px] overflow-hidden rounded-[20px] border border-[var(--rc-hairline)] shadow-[0_1px_2px_rgba(20,20,30,0.04),0_12px_32px_-12px_rgba(20,20,30,0.12)]">
      {/* ── The console ────────────────────────────────────────────────── */}
      <header className="rc__console px-6 py-7 md:px-9 md:py-9">
        {/*
          * The card had no heading of any kind, so a screen reader's heading
          * list was empty on a surface with eight sections and a ledger. The
          * two lines that were already the title are wrapped into one `h1`
          * rather than a third line being invented: it reads "Report Card,
          * Attempt 2, At the standard", which is what the top of this card
          * says to anyone looking at it. The spans keep the two type sizes.
          */}
        <h1 className="rc__title">
          <span className="rc__label rc__label--onconsole">
            {grade.attempt_no > 1 ? `Report Card · Attempt ${grade.attempt_no}` : "Report Card"}
          </span>
          {/* The band leads. The number is available and does not go first. */}
          <span className="rc__display mt-3 block text-[40px] text-[var(--rc-console-ink)] md:text-[52px]">
            {overall.band.label}
          </span>
        </h1>
        <p className="mt-2.5 text-sm text-[var(--rc-console-ink-dim)]">
          {Number.isFinite(section.mean_meaning) ? "Detail coverage: " : ""}{overall.atStandard} of {stimuli.length} at the standard
          {overall.perfect > 0 ? `, ${overall.perfect} with nothing dropped` : ""}.
        </p>

        {/*
          * What to do tomorrow, in one sentence or not at all.
          *
          * Every other line on this card describes what happened. This is the
          * only one that asks for something, which is why it is one line and
          * why a run with nothing clear to say gets none.
          */}
        {/* No side stripe. DESIGN.md bans it, and `--rc-signal` is the colour
            the brief reserves for sound, which this sentence is not. It is
            already the only line on the card that asks for something; it does
            not need a rule beside it to say so. */}
        {overall.next && (
          <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-[var(--rc-console-ink)]">
            {overall.next}
          </p>
        )}

        {/*
          * The three figures.
          *
          * Coverage answers "did you hold it". The Read answers "did you
          * understand it", and it is the criterion the method is built around.
          * The clock is third because it is the one a student will read first
          * if you let her, and it is the least important of the three.
          */}
        {/*
          * What "the move" means, said once, before the word is used.
          *
          * It runs through the Understood figure and every Your Read movement
          * below, and was defined nowhere a student reads: she was told she had
          * found the move without being told what a move is. Said here it also
          * does the introducing the two numbers needed anyway, which is why it
          * reads as a lead-in rather than a footnote.
          */}
        {overall.readMeasured && (
          <p className="mt-6 max-w-[58ch] text-xs leading-relaxed text-[var(--rc-console-ink-dim)]">
            The move is what an argument runs on: the loophole it leaves, the inference it forces,
            the conflict it sets up. Holding a stimulus is Coverage. Naming the move is The Read.
          </p>
        )}

        <div className="rc__console-divider mt-7 grid gap-6 border-t pt-6 sm:grid-cols-3">
          <div>
          <Figure
            label={Number.isFinite(section.mean_meaning) ? "Meaning preserved" : "Held"}
            value={`${Number.isFinite(section.mean_meaning) ? section.mean_meaning : section.mean_coverage}%`}
            /* "across 22 of 22" is noise on a run where everything saved, and
               the one fact she needs on a run where it did not. */
            note={heldNote}
          />
          {Number.isFinite(section.mean_meaning) && (
            <p className="mt-1 text-xs leading-snug text-[var(--rc-console-ink-dim)]">
              Detail coverage: {section.mean_coverage}%. Details are tracked separately from meaning.
            </p>
          )}
          </div>
          {overall.readMeasured && (
            <Figure
              label="Understood"
              value={`${section.read_matched_count} of ${section.stimuli_graded}`}
              note={
                (section.no_read_count ?? 0) > 0
                  ? `where you found the move. On ${section.no_read_count} you did not give a Read at all.`
                  : "where you found the move the argument turns on"
              }
            />
          )}
          <div>
            <p className="rc__label rc__label--onconsole">Time</p>
            <p className="rc__display mt-1.5 text-[28px] text-[var(--rc-console-ink)]">
              {minutes(section.total_seconds)}
            </p>
            <p className="mt-1 text-xs leading-snug text-[var(--rc-console-ink-dim)]">
              against a {section.goal_minutes} minute goal
            </p>
            {/*
              * The breaks, said out loud.
              *
              * The figure above is her drill time and correctly has the pauses
              * taken out of it -- the clock stops with the recorder. Left at
              * that, a sitting broken by ten minutes at the door would read
              * exactly like one run straight through, and a student comparing
              * this week to last would be comparing two different things
              * without being told. It is not a rebuke: stepping away is allowed
              * and the alternative was throwing the section away.
              */}
            {(section.paused_seconds ?? 0) > 0 && (
              <p className="mt-1.5 text-xs leading-snug text-[var(--rc-console-ink-dim)]">
                {minutes(section.paused_seconds ?? 0)} paused across{" "}
                {section.pause_count === 1 ? "one break" : `${section.pause_count} breaks`}, which
                the time above does not include.
              </p>
            )}
            {/*
              * The goal counts only if every stimulus was recalled, coloured and
              * given a Read. Collapsing that into one boolean is what let a
              * student skip the colouring, finish early and be told she made the
              * goal, so the qualifier sits directly under the time.
              *
              * Inside-the-clock is DERIVED from the two numbers above rather
              * than read off `within_time`, which is optional: a run graded
              * before that flag existed matched neither branch and got a time
              * with no verdict at all. See `recall/sectionClock.ts`.
              */}
            {insideTime(section) && !section.within_goal && (
              <p className="mt-1.5 text-xs leading-snug text-[var(--rc-console-ink-dim)]">
                Inside the time, but the goal only counts with every stimulus coloured and given a
                Read.
              </p>
            )}
            {/*
              * Over the goal, which used to get nothing at all. Not a rebuke.
              * Early runs are slow by design and the briefing already says to go
              * slower while it is new, so this says what the time is for rather
              * than that she was late.
              */}
            {!insideTime(section) && (
              <p className="mt-1.5 text-xs leading-snug text-[var(--rc-console-ink-dim)]">
                Over the goal, which early runs are meant to be. The goal is what the drill costs
                once it is a habit, not a limit on today.
              </p>
            )}
          </div>
        </div>

        {/*
          * How she ran it, kept off the figures.
          *
          * These are observations about method, not about score, and mixing them
          * into the numbers is what made them read as five more things she got
          * wrong.
          */}
        {overall.notes.length > 0 && (
          <div className="rc__console-divider mt-6 border-t pt-6">
            <h2 className="rc__label rc__label--onconsole">Worth working on</h2>
            <ul className="mt-3 space-y-1.5">
              {overall.notes.map((note) => (
                <li key={note} className="max-w-[64ch] text-sm leading-relaxed text-[var(--rc-console-ink-dim)]">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/*
          * When the marking itself is in doubt, she is told before the number.
          *
          * All three of these are about us. A stimulus the judge never answered
          * for is counted as missed, which scores her for our outage, and she is
          * the only person in a position to notice the score looks wrong.
          */}
        {(overall.suspect || overall.unmarked > 0 || overall.missingRows > 0) && (
          <div className="rc__console-divider mt-6 space-y-2 border-t pt-6 text-sm leading-relaxed text-[var(--rc-console-ink-dim)]">
            {overall.missingRows > 0 && overall.sectionSize !== undefined && (
              <p>
                {overall.missingRows} of the {overall.sectionSize} did not save, so they are not
                marked here. That is ours, not yours.
              </p>
            )}
            {overall.unmarked > 0 && (
              <p>
                {overall.unmarked} {overall.unmarked === 1 ? "stimulus" : "stimuli"} could not be
                marked, so {overall.unmarked === 1 ? "it counts" : "they count"} as nothing carried.
                That is ours, not yours. Come back later and it will have been marked properly.
              </p>
            )}
            {overall.suspect && (
              <p>
                Our own check on this marking came back unhappy, so treat the number on one or two
                of these lightly. Joshua can see the same thing.
              </p>
            )}
          </div>
        )}

        {/* ── The ledger ──────────────────────────────────────────────────
            The shape of the run in one glance, and the only navigation. */}
        <div className="rc__console-divider mt-7 border-t pt-6">
          <h2 className="rc__label rc__label--onconsole">The run</h2>
          {/*
            * One tab stop, and the arrows do the rest.
            *
            * Twenty-two ticks were twenty-two tab stops, so reaching anything
            * below the ledger by keyboard meant pressing Tab twenty-two times
            * through a row of marks. A toolbar with a roving tabindex is the
            * pattern for a group like this: Tab lands on whichever stimulus is
            * open, the arrows move between them, Home and End go to the ends.
            */}
          <div
            className="rc__ledger mt-3.5"
            role="toolbar"
            aria-label="The run, stimulus by stimulus"
            aria-orientation="horizontal"
            onKeyDown={(e) => {
              const last = stimuli.length - 1;
              const to =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? Math.min(openStimulus + 1, last)
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? Math.max(openStimulus - 1, 0)
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? last
                        : null;
              if (to === null) return;
              e.preventDefault();
              setOpenStimulus(to);
              // Focus follows selection, which is what makes the arrows read as
              // moving through the ledger rather than scrubbing something else.
              tickRefs.current[to]?.focus();
            }}
          >
            {stimuli.map((st, i) => {
              const m = st.ungraded ? "ungraded" : stimulusStatus(st).mark;
              return (
                <button
                  key={st.slug}
                  type="button"
                  className="rc__tick"
                  aria-current={i === openStimulus}
                  tabIndex={i === openStimulus ? 0 : -1}
                  ref={(el) => {
                    tickRefs.current[i] = el;
                  }}
                  onClick={() => setOpenStimulus(i)}
                >
                  {/* The accessible name. The digit below is decoration for a
                      reader who can see the ledger.
                      It used to be the number alone, which made the ledger a
                      row of twenty-two identical buttons to a screen reader:
                      the band and the recital are the whole content of a tick,
                      and both were carried by colour and shape only. */}
                  <span className="sr-only">
                    Stimulus {st.item_order ?? i + 1},{" "}
                    {st.ungraded ? "not marked" : stimulusStatus(st).label}
                    {i === openStimulus ? ", open" : ""}
                  </span>
                  <span className={cn("rc__mark", `rc__mark--${m}`)} aria-hidden />
                  <span className="rc__tick-n" aria-hidden>
                    {st.item_order ?? i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── The open stimulus ──────────────────────────────────────────── */}
      {s && band && (
        <div className="px-6 py-7 md:px-9 md:py-9">
          <div className="rc__measure">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div>
                <h2 className="rc__title">
                  <span className="rc__label">
                    Stimulus {s.item_order ?? openStimulus + 1} of {stimuli.length}
                  </span>
                  <span className="rc__display mt-1.5 block text-[26px] text-[var(--rc-ink)]">
                    {band.label}
                  </span>
                </h2>
              </div>
              <p className="text-sm text-[var(--rc-ink-muted)]">
                <span className="tabular-nums text-[var(--rc-ink)]">
                  {Number.isFinite(s.meaning_percent) ? `${s.meaning_percent}% meaning preserved.` : `${s.percent}% held.`}
                </span>{" "}
                {Number.isFinite(s.meaning_percent) ? `Detail coverage: ${s.percent}%.` : howMuch(s.percent)}
              </p>
            </div>

            {/*
              * Hers, then his, as one control.
              *
              * The pair is the lesson. One recording is a correction and two is
              * a demonstration, which is the whole argument for putting audio on
              * this page at all. They were two scattered text links at the
              * bottom of an expanded row; here they are the transport, at the
              * top, where a thing you press lives.
              */}
            {(hers || model?.audio) && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="rc__transport">
                  {hers && clipWindow && (
                    <button
                      type="button"
                      className="rc__source"
                      aria-pressed={clip.playing === key}
                      onClick={() => void clip.play(key, hers, clipWindow.start, clipWindow.end)}
                    >
                      {clip.playing === key ? "Stop" : "Hear it back"}
                    </button>
                  )}
                  {model?.audio && (
                    <button
                      type="button"
                      className="rc__source"
                      aria-pressed={clip.playing === `${key}-model`}
                      onClick={() => void clip.play(`${key}-model`, model.audio!)}
                    >
                      {clip.playing === `${key}-model` ? "Stop" : "Hear it done right"}
                    </button>
                  )}
                </div>
                {hersPlaying && !!s.lines?.length && (
                  <p className="text-xs text-[var(--rc-ink-faint)]" role="status">
                    Following your recording, line by line.
                  </p>
                )}
              </div>
            )}

            <div className="mt-7 space-y-6">
              {/*
                * The passage, so she can reread what she was holding without
                * leaving the card. Folded, because on the second read of the
                * page she wants her own words, not the source.
                */}
              {s.stimulus_text && (
                <details className="rounded-lg border border-[var(--rc-hairline)] bg-[var(--rc-card)] px-4 py-3">
                  <summary className="rc__label rc__summary cursor-pointer">The passage</summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-[var(--rc-ink)]">
                    {s.stimulus_text}
                  </p>
                </details>
              )}

              {s.ungraded ? (
                <Movement label="What happened" tone="method">
                  <p className="text-[15px] leading-relaxed text-[var(--rc-ink-muted)]">
                    This one could not be marked, so it is showing as nothing carried. That is ours,
                    not yours.
                  </p>
                </Movement>
              ) : (
                <>
                  {/* Specific congratulation, ahead of the correction. */}
                  {held.length > 0 && (
                    <Movement label="What you held" tone="colour">
                      <ul className="space-y-1.5">
                        {held.map((h) => (
                          <li key={h} className="text-[15px] leading-relaxed text-[var(--rc-ink)]">
                            {h}
                          </li>
                        ))}
                      </ul>
                    </Movement>
                  )}

                  {/*
                    * The three that mattered, ahead of the whole list.
                    *
                    * Every language app that does spoken feedback well surfaces
                    * a small actionable set rather than every imperfection
                    * (Busuu names three), and the grader has been returning
                    * exactly that in `bigMisses` since the day it was written.
                    * It was rendered as one grey line at the bottom of the
                    * line-by-line block, under everything, which is the same as
                    * not rendering it. A student who reads one thing here
                    * should read these.
                    */}
                  <Movement label={Number.isFinite(s.meaning_percent) ? "Detail coverage" : "What slipped"} tone="detail">
                    {Number.isFinite(s.meaning_percent) && (s.incidental_misses?.length ?? 0) > 0 && (
                      <p className="mb-3 text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                        These details do not change the argument's meaning. They are not deducted from meaning.
                      </p>
                    )}
                    {s.missed.length === 0 ? (
                      <p className="text-[15px] leading-relaxed text-[var(--rc-ink-muted)]">
                        {s.reciting
                          ? "It is all in there, which is what saying it back word for word does rather than what you did."
                          : "Nothing slipped on this one. You kept the whole thing."}
                      </p>
                    ) : s.bigMisses?.length ? (
                      <>
                        <ul className="space-y-1.5">
                          {s.bigMisses.map((m) => (
                            <li key={m} className="text-[15px] leading-relaxed text-[var(--rc-ink)]">
                              {m}
                            </li>
                          ))}
                        </ul>
                        {/* The rest, for a student who wants all of it. Folded,
                            because the three above are the ones to act on. */}
                        {s.missed.length > 0 && (
                          <details className="mt-3">
                            <summary className="rc__label rc__summary cursor-pointer">
                              {Number.isFinite(s.meaning_percent) ? "All details to review" : "Everything else that slipped"} ({s.missed.length})
                            </summary>
                            <ul className="mt-2 space-y-1.5">
                              {s.missed.map((m) => (
                                <li
                                  key={m}
                                  className="text-sm leading-relaxed text-[var(--rc-ink-muted)]"
                                >
                                  {m}{s.incidental_misses?.includes(m) ? " (not deducted from meaning)" : ""}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </>
                    ) : (
                      <ul className="space-y-1.5">
                        {s.missed.map((m) => (
                          <li key={m} className="text-[15px] leading-relaxed text-[var(--rc-ink)]">
                            {m}{s.incidental_misses?.includes(m) ? " (not deducted from meaning)" : ""}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* How she ran this one, under what she lost on it. */}
                    {(s.reciting ||
                      s.listing ||
                      !s.coloured ||
                      (s.coloured && !s.colourSpecific) ||
                      s.dead_air_seconds >= section.dead_air_threshold_seconds) && (
                      <div className="mt-3 space-y-2">
                        {s.reciting && (
                          <p className="text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                            This one came back close to word for word, so the details on it were
                            carried by the page rather than by you. Say it in your own words instead,
                            even clumsily. That is the version that tells you what you actually have.
                          </p>
                        )}
                        {s.listing && (
                          <p className="text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                            This came out as a run of facts. Tell it as one connected argument.
                          </p>
                        )}
                        {!s.coloured && (
                          <p className="text-sm leading-relaxed text-[var(--rc-ink-muted)]">
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
                          <p className="text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                            Your reaction would have fitted any stimulus. React to what this one
                            actually claims.
                          </p>
                        )}
                        {s.dead_air_seconds >= section.dead_air_threshold_seconds && (
                          <p className="text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                            You went quiet for {s.dead_air_seconds}s in the middle of this recall.
                            That is the moment it went, and it is worth finding out what was there.
                          </p>
                        )}
                      </div>
                    )}
                  </Movement>

                  {/* Her Read, which is the half that predicts a score. */}
                  {s.readGiven !== undefined && (
                    <Movement label="Your Read" tone="read">
                      <p className="text-[15px] leading-relaxed text-[var(--rc-ink)]">
                        {!s.readGiven
                          ? "You stopped at telling it back. Say what the argument is doing, not only what it says."
                          : s.readMatches
                            ? "You found the move."
                            : "You gave a Read, but not the one this argument turns on."}
                      </p>
                      {/*
                        * Why, in the judge's words, and what the key names. Both
                        * were stored and neither was shown, so "not the one this
                        * argument turns on" was a verdict with no reason and no
                        * answer. The reason is what she can dispute; the key is
                        * what she can learn from.
                        */}
                      {s.readReason && (
                        <p className="mt-1.5 text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                          {s.readReason}
                        </p>
                      )}
                      {s.the_read && (
                        <p className="rc__panel mt-3 text-[15px] italic leading-relaxed text-[var(--rc-ink)]">
                          The Read this one turns on: {s.the_read}
                        </p>
                      )}
                    </Movement>
                  )}

                  {/*
                    * Line by line, because that is how she worked.
                    *
                    * She reads one line silently, looks away and says it back.
                    * The cut is worked out after the run from the silence in
                    * front of each spoken line, so it is approximate -- which is
                    * why it says what she carried and dropped rather than
                    * scoring the line. Coverage above is unchanged.
                    *
                    * Three things stacked per line, always in this order: the
                    * line as written, what she said for it, what the standard
                    * says for it. That is the comparison the drill is about, and
                    * pressing play walks the highlight down it.
                    */}
                  {!!s.lines?.length && (
                    <Movement label="Line by line" tone="detail">
                      <ol>
                        {s.lines.map((line) => {
                          const lineKey = `${key}-l${line.n}`;
                          const playable =
                            hers && line.startMs !== undefined && line.endMs !== undefined;
                          return (
                            <li
                              key={line.n}
                              className="rc__line"
                              data-playing={activeLine === line.n}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <p className="rc__line-text">
                                  {line.n}. {line.text}
                                </p>
                                {playable && (
                                  <button
                                    type="button"
                                    className="rc__hear shrink-0"
                                    data-playing={clip.playing === lineKey}
                                    onClick={() =>
                                      void clip.play(lineKey, hers!, line.startMs, line.endMs)
                                    }
                                  >
                                    {clip.playing === lineKey ? "Stop" : "Hear it"}
                                  </button>
                                )}
                              </div>

                              <p className="rc__line-spoken mt-2">
                                {line.spoken || "You did not say anything for this line."}
                              </p>

                              {line.note && (
                                <p className="mt-2 text-sm leading-relaxed text-[var(--rc-ink)]">
                                  {line.note}
                                </p>
                              )}

                              {(line.carried.length > 0 || line.dropped.length > 0) && (
                                <div className="mt-2.5 space-y-1.5">
                                  {line.carried.length > 0 && (
                                    <div className="rc__chips">
                                      <span className="rc__label mt-1 mr-1">Held</span>
                                      {line.carried.map((c) => (
                                        <span key={c} className="rc__chip rc__chip--held">
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {line.dropped.length > 0 && (
                                    <div className="rc__chips">
                                      <span className="rc__label mt-1 mr-1">Dropped</span>
                                      {line.dropped.map((d) => (
                                        <span key={d} className="rc__chip rc__chip--dropped">
                                          {d}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {pairedByLine && pairs[line.n - 1]?.recall && (
                                <div className="mt-3 rounded-lg border border-[var(--rc-hairline-soft)] bg-[var(--rc-card)] px-3.5 py-3">
                                  {/* A span, not a paragraph: the whole-run
                                      walkthrough below owns the paragraph form
                                      of this label, and only one of the two is
                                      ever on screen. */}
                                  <span className="rc__label block">Done right</span>
                                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                                    {pairs[line.n - 1].recall}
                                  </p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>

                      {s.recall && (
                        <div className="mt-4 rounded-lg border border-[var(--rc-hairline)] px-4 py-3">
                          <p className="text-sm font-medium text-[var(--rc-ink)]">
                            The whole thing, text off screen: {s.recall.verdict}
                          </p>
                          {s.recall.note && (
                            <p className="mt-1 text-sm leading-relaxed text-[var(--rc-ink-muted)]">
                              {s.recall.note}
                            </p>
                          )}
                        </div>
                      )}
                    </Movement>
                  )}

                  {/*
                    * What the machine heard.
                    *
                    * Reading the words back is the fastest way to tell a
                    * transcription failure from a memory failure. The v1 spec
                    * named transcription error as the top risk and showing her
                    * the transcript as the mitigation; the transcript was shown
                    * and nothing said what it was FOR, so a mis-hearing read as
                    * a verdict about her. In the audit's run stimulus 5's judge
                    * reason quoted her as saying "clearly moral characters"; the
                    * recording says immoral, and she was told she gave the wrong
                    * Read.
                    */}
                  {(s.spoken || (hers && clipWindow) || model?.walkthrough) && (
                    <Movement label="What you said" tone="method">
                      {s.spoken ? (
                        <>
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--rc-ink-muted)]">
                            {s.spoken}
                          </p>
                          <p className="mt-3 text-xs leading-relaxed text-[var(--rc-ink-faint)]">
                            The marking is done from these words. If they are not what you said, the
                            marking is wrong, not you. Play it back and say so.
                          </p>
                          <DisputeControl grade={grade} stimulus={s} />
                        </>
                      ) : (
                        <p className="text-[15px] leading-relaxed text-[var(--rc-ink-muted)]">
                          Nothing was picked up here.
                        </p>
                      )}
                      {model?.walkthrough && !pairedByLine && <Walkthrough md={model.walkthrough} />}
                    </Movement>
                  )}

                  {/*
                    * The last thing on the page, because it is the thing she
                    * leaves with. Empty when she carried everything, found the
                    * Read and reacted; then the card says so, because silence
                    * reads as an oversight.
                    */}
                  {everyCylinder(s) ? (
                    <Movement label="Nothing to fix" tone="colour">
                      <p className="text-[15px] leading-relaxed text-[var(--rc-ink)]">
                        Every cylinder on this one. You kept the whole thing, you found the move it
                        turns on, and you had something of your own to say about it, all in your own
                        words.
                      </p>
                    </Movement>
                  ) : (
                    s.nextTime && (
                      <Movement label="Next time" tone="method">
                        <p className="text-[15px] leading-relaxed text-[var(--rc-ink)]">
                          {s.nextTime}
                        </p>
                      </Movement>
                    )
                  )}
                </>
              )}
            </div>

            {/* Through twenty-two without going back to the ledger. */}
            {stimuli.length > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-[var(--rc-hairline)] pt-5">
                <button
                  type="button"
                  className="rc__hear disabled:opacity-40"
                  disabled={openStimulus === 0}
                  onClick={() => setOpenStimulus((i) => Math.max(0, i - 1))}
                >
                  Previous
                </button>
                <p className="rc__label">
                  {openStimulus + 1} of {stimuli.length}
                </p>
                <button
                  type="button"
                  className="rc__hear disabled:opacity-40"
                  disabled={openStimulus >= stimuli.length - 1}
                  onClick={() => setOpenStimulus((i) => Math.min(stimuli.length - 1, i + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {onStartFocusSet && <FocusSetPanel grade={grade} onStart={onStartFocusSet} />}

      {onDone && (
        <div className="border-t border-[var(--rc-hairline)] px-6 py-6 text-center">
          <Button onClick={onDone}>Done</Button>
        </div>
      )}
    </div>
  );
}

/**
 * "This is not what I said."
 *
 * One control, one row, no workflow. It is under the transcript rather than at
 * the card's head because it is about ONE stimulus's verdict, and because the
 * clip and the transcript are right there -- she can check before she claims,
 * which is what makes the claim worth storing.
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
      <p className="mt-2 text-xs text-[var(--rc-ink-faint)]" role="status">
        Noted. Joshua will see this beside the run.
      </p>
    );
  }

  if (state === "unavailable" || state === "failed") {
    return (
      <p className="mt-2 text-xs text-[var(--rc-ink-faint)]" role="status">
        That did not save. Tell Joshua directly and he will look at the recording.
      </p>
    );
  }

  return (
    <button
      type="button"
      className="mt-2 text-xs text-[var(--rc-ink-faint)] underline underline-offset-2 hover:text-[var(--rc-ink)] disabled:opacity-60"
      onClick={send}
      disabled={state === "sending"}
    >
      {state === "sending" ? "Saving..." : "This is not what I said"}
    </button>
  );
}

/**
 * "Run these again."
 *
 * The one thing on the card that asks for work. It appears only when the run
 * left something weak behind -- a band below the standard, a recital, a
 * stimulus with no reaction of her own, or a Read that was not the move the key
 * names. A run with none of those shows nothing here at all, because being made
 * to redo work you did properly is the fastest way to teach someone that the
 * Report Card is not worth reading.
 *
 * Pressing it builds a fresh Attempt containing only those stimuli, run exactly
 * the way the full section runs, recorded, saved and graded the same way. Its
 * own Report Card is the check on whether the quality bar has been cleared.
 */
function FocusSetPanel({
  grade,
  onStart,
}: {
  grade: SectionGrade;
  onStart: (slugs: string[]) => Promise<void> | void;
}) {
  const set = useMemo(() => pickFocusSet(grade), [grade]);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!set) {
    return (
      <div className="border-t border-[var(--rc-hairline)] px-6 py-6 md:px-9">
        <h2 className="rc__label">Nothing to run again</h2>
        <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-[var(--rc-ink-muted)]">
          Every stimulus in this run came back at the standard, said in your own words with a
          reaction of your own. There is no focus set for this one.
        </p>
      </div>
    );
  }

  const go = async () => {
    setFailed(false);
    setStarting(true);
    try {
      await onStart(set.slugs);
    } catch {
      setFailed(true);
      setStarting(false);
    }
  };

  return (
    <div className="border-t border-[var(--rc-hairline)] px-6 py-7 md:px-9">
      <h2 className="rc__label">Your focus set</h2>
      <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-[var(--rc-ink)]">
        {set.weakCount === 1
          ? "One stimulus fell short of the standard."
          : `${set.weakCount} stimuli fell short of the standard.`}{" "}
        Run these {set.slugs.length} again on their own, one recording, marked the same way.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {/* `item_order` is the AUTHORED position and is 1-based, which is how
            the ledger, the open stimulus and its heading all read it. Here it
            was `(item_order ?? i) + 1`, so every chip in the focus set named
            the stimulus after the one it meant: she was sent to run stimulus 5
            again over a fault in stimulus 4. The fallback keeps its `+ 1`,
            because `i` is an array index and 0-based. */}
        {set.stimuli.map((s, i) => (
          <li key={s.slug} className="rc__chip rc__chip--dropped">
            Stimulus {s.item_order ?? i + 1} · {s.reciting ? "said back word for word" : `${meaningPercent(s)}%`}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-4">
        <Button onClick={() => void go()} disabled={starting}>
          {starting ? "Setting it up..." : `Run these ${set.slugs.length} again`}
        </Button>
        <span className="text-xs text-[var(--rc-ink-faint)]">
          Optional. This run and its recording are saved either way.
        </span>
      </div>

      {failed && (
        <p className="mt-3 text-xs text-[var(--rc-ink-faint)]" role="status">
          That did not start. Try again in a moment — nothing has been lost.
        </p>
      )}
    </div>
  );
}
