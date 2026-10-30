/**
 * A Read, Recall, Colour SECTION run: what is on screen, what she is doing, and
 * what one key press does next.
 *
 * Pure on purpose, like `session.ts`, and deliberately not a variant of it. The
 * v1 session has a `feedback` phase and cumulative rounds; a section has
 * neither, and the reason is not that they were dropped for time. Nothing may
 * be judged, shown or scored until the whole section ends, because a live
 * verdict trains her to vet before speaking, which is the exact habit colouring
 * exists to break (spec `docs/specs/2026-08-31-rrc-section-mode.md` section 4).
 * Sharing a machine with v1 would mean carrying that phase and remembering not
 * to enter it.
 *
 * The unit of work is the section, not the stimulus
 * (`docs/adr/0010-rrc-section-is-the-unit-of-work.md`). She runs 22 to 26
 * stimuli end to end against one clock without stopping.
 *
 * The machine does not track which chunk she is on
 * (`docs/adr/0013-she-chunks-freely-and-the-app-does-not-track-it.md`). She may
 * not chunk the way the content is cut, and a cursor that expects otherwise
 * scores her for disagreeing with our line breaks. Silence carries no signal to
 * drive one with either: a pause while reading and a pause after finishing are
 * the same sound. So the grain here is the stimulus, and a stimulus has exactly
 * two states.
 */

import type { RecallSectionItem, TimeGoalMinutes } from "../api/types";

/**
 * Where the run is within one stimulus.
 *
 * `working` is the whole of steps 1 to 3: the full stimulus is on screen and
 * she reads, recalls and colours in whatever units she likes. `recalling` is
 * The Recall: the text is gone and she says the whole argument back from
 * memory (`docs/adr/0012-the-recall-is-a-recap-from-memory.md`).
 */
export type SectionPhase = "working" | "recalling";

export interface SectionCursor {
  /** 0-based index into the section's items. */
  item: number;
  phase: SectionPhase;
}

/**
 * One stimulus, reduced to what the screen and the scorer need.
 *
 * `theRead` and `theReadType` are carried from the capture and read by nothing.
 * That is deliberate, not an oversight: the analytical takeaway is deferred to
 * a later level, and ADR 0012 records the unused key so nobody wires it in as
 * a fix.
 */
export interface SectionStimulus {
  slug: string;
  order: number;
  /**
   * The authored cuts, kept because the grader's Details live inside them and
   * they guide her eye on screen. Never a boundary she is held to.
   */
  chunks: { n: number; text: string; details: { n: number; text: string }[] }[];
  theRead: string;
  theReadType: string;
  modelRecording: string;
  modelTranscript: string;
}

export interface SectionRun {
  sourceSection: string;
  timeGoalMinutes: TimeGoalMinutes;
  stimuli: SectionStimulus[];
}

/** The three goals, by the accommodation the student runs under. */
export type Accommodation = "standard" | "accommodation_53" | "accommodation_70";

// --------------------------------------------------------------------------
// Building a run
// --------------------------------------------------------------------------

function isSectionItem(item: unknown): item is RecallSectionItem {
  const it = item as RecallSectionItem | undefined;
  return Boolean(
    it &&
      typeof it.slug === "string" &&
      typeof it.the_read === "string" &&
      it.the_read.trim() !== "" &&
      Array.isArray(it.chunks) &&
      it.chunks.length > 0 &&
      it.chunks.every(
        (c) =>
          typeof c?.text === "string" &&
          c.text.trim() !== "" &&
          Array.isArray(c.details) &&
          c.details.length > 0,
      ),
  );
}

/**
 * Build a run from an assignment's snapshot, or null if the snapshot is not a
 * section.
 *
 * Returning null rather than throwing is deliberate: the caller renders an
 * explanation instead of a blank screen, and a malformed snapshot is a content
 * bug that must not look like a crash to a student mid-assignment.
 */
export function buildSectionRun(
  items: unknown,
  sourceSection: string | null | undefined,
  timeGoalMinutes: unknown,
): SectionRun | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  if (!sourceSection) return null;
  const goal = timeGoalMinutes as TimeGoalMinutes | null | undefined;
  if (
    !goal ||
    typeof goal.standard !== "number" ||
    typeof goal.accommodation_53 !== "number" ||
    typeof goal.accommodation_70 !== "number"
  ) {
    return null;
  }
  if (!items.every(isSectionItem)) return null;

  const stimuli: SectionStimulus[] = items.map((it) => ({
    slug: it.slug,
    order: it.order,
    chunks: it.chunks.map((c) => ({
      n: c.n,
      text: c.text,
      details: c.details.map((d) => ({ n: d.n, text: d.text })),
    })),
    theRead: it.the_read,
    theReadType: it.the_read_type,
    modelRecording: it.model_recording,
    modelTranscript: it.model_transcript,
  }));

  return { sourceSection, timeGoalMinutes: goal, stimuli };
}

export function startCursor(): SectionCursor {
  return { item: 0, phase: "working" };
}

// --------------------------------------------------------------------------
// Advancing
// --------------------------------------------------------------------------

/**
 * One key press.
 *
 * There is exactly one input in the loop and no mouse, so this is the whole
 * interaction model: the first press on a stimulus is her saying "Recall Full
 * Stimulus" -- the text goes and she recaps it from memory -- and the second
 * ends the Recall and loads the next stimulus. Those two moments are the only
 * ones not recoverable from the audio afterwards, which is why they are the
 * only ones asked of her.
 *
 * Returns `null` when the section is over. The caller stops the clock there;
 * this function does not know about time, which is what makes it testable.
 */
export function advanceCursor(run: SectionRun, at: SectionCursor): SectionCursor | null {
  if (!run.stimuli[at.item]) return null;

  if (at.phase === "working") return { item: at.item, phase: "recalling" };

  // The Recall is finished. The stimulus does not come back until the Report
  // Card, so there is nothing between here and the next one.
  const nextItem = at.item + 1;
  if (nextItem >= run.stimuli.length) return null;
  return { item: nextItem, phase: "working" };
}

/**
 * Whether she is inside the goal for her accommodation.
 *
 * Time is a scored criterion and the goal cannot be one number: a student with
 * 53% or 70% extra time is not slow when she takes longer, and grading her
 * against the standard goal would score her accommodation as a failure.
 */
export function goalSeconds(run: SectionRun, accommodation: Accommodation): number {
  return run.timeGoalMinutes[accommodation] * 60;
}

/** Elapsed time as `M:SS`, which is how a clock she glances at should read. */
export function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
