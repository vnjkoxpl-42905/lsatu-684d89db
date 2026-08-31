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
 */

import type { RecallSectionItem, TimeGoalMinutes } from "../api/types";

/**
 * What one chunk looks like right now.
 *
 * The whole stimulus is readable the whole time. It was not always: the first
 * cut blurred what she had not reached and blanked the chunk she was saying
 * back, so the screen enforced the not-rereading rule for her.
 *
 * That enforcement is gone on purpose, and the method is the reason. The step
 * she is running is explicit that the way you avoid rereading is to **look away
 * from the text, or close your eyes**. That is the accountability mechanism as
 * taught, it is hers rather than the app's, and it is the one that still works
 * when she runs a section on paper. A screen that hides the text instead
 * replaces her habit with a crutch, and it cannot be there on test day.
 *
 * So the states are now only a place marker: which chunk she is on, and which
 * side of it she is on. Nothing is concealed and nothing moves.
 */
export type ChunkState = "done" | "reading" | "speaking" | "upcoming";

/**
 * Where the run is within one stimulus.
 *
 * `read` and `speak` alternate, chunk by chunk. `the-read` comes once, after
 * the last chunk, with the whole stimulus sharp again: it is the synthesis, and
 * it is why a section has no cumulative round.
 */
export type SectionPhase = "read" | "speak" | "the-read";

export interface SectionCursor {
  /** 0-based index into the section's items. */
  item: number;
  /** 0-based index into that item's chunks. Equal to the chunk count during `the-read`. */
  chunk: number;
  phase: SectionPhase;
}

/** One stimulus, reduced to what the screen and the scorer need. */
export interface SectionStimulus {
  slug: string;
  order: number;
  chunks: { n: number; text: string; details: { n: number; text: string }[] }[];
  /** The captured Read. Never shown before she has given hers. */
  theRead: string;
  theReadType: string;
  modelRecording: string;
  modelTranscript: string;
}

export interface SectionRun {
  sourceSection: string;
  timeGoalMinutes: TimeGoalMinutes;
  stimuli: SectionStimulus[];
  /** Every chunk in the section, across every stimulus. What progress is out of. */
  totalChunks: number;
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

  return {
    sourceSection,
    timeGoalMinutes: goal,
    stimuli,
    totalChunks: stimuli.reduce((n, s) => n + s.chunks.length, 0),
  };
}

export function startCursor(): SectionCursor {
  return { item: 0, chunk: 0, phase: "read" };
}

// --------------------------------------------------------------------------
// Advancing
// --------------------------------------------------------------------------

/**
 * One key press.
 *
 * There is exactly one input in the loop and no mouse, so this is the whole
 * interaction model: read -> blank it and speak -> next chunk, and after the
 * last chunk of a stimulus, The Read, then the next stimulus.
 *
 * Returns `null` when the section is over. The caller stops the clock there;
 * this function does not know about time, which is what makes it testable.
 */
export function advanceCursor(run: SectionRun, at: SectionCursor): SectionCursor | null {
  const stimulus = run.stimuli[at.item];
  if (!stimulus) return null;

  if (at.phase === "read") return { ...at, phase: "speak" };

  if (at.phase === "speak") {
    const next = at.chunk + 1;
    if (next < stimulus.chunks.length) return { item: at.item, chunk: next, phase: "read" };
    // Past the last chunk: the whole stimulus comes back sharp and she gives
    // her Read of it. That IS the synthesis, which is why there is no
    // cumulative round to reach here instead.
    return { item: at.item, chunk: stimulus.chunks.length, phase: "the-read" };
  }

  const nextItem = at.item + 1;
  if (nextItem >= run.stimuli.length) return null;
  return { item: nextItem, chunk: 0, phase: "read" };
}

/**
 * What each chunk of the current stimulus looks like at this cursor.
 *
 * Every chunk of the stimulus is on screen from its first frame, so she can see
 * how much is left against the clock. Only the state changes.
 */
export function chunkStates(run: SectionRun, at: SectionCursor): ChunkState[] {
  const stimulus = run.stimuli[at.item];
  if (!stimulus) return [];
  return stimulus.chunks.map((_, i) => {
    // The Read is about the whole stimulus, so no one chunk is marked.
    if (at.phase === "the-read") return "done";
    if (i < at.chunk) return "done";
    if (i > at.chunk) return "upcoming";
    return at.phase === "speak" ? "speaking" : "reading";
  });
}

/**
 * How many chunks are behind her, across the whole section.
 *
 * A chunk counts once she has said it back, not once she has read it, so the
 * count does not tick forward while she is still mid-recall. `at.chunk` is
 * already the number of finished chunks during both `read` and `speak`, and
 * equals the stimulus's chunk count during `the-read`.
 */
export function chunksDone(run: SectionRun, at: SectionCursor): number {
  let n = 0;
  for (let i = 0; i < at.item; i++) n += run.stimuli[i].chunks.length;
  return n + at.chunk;
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
