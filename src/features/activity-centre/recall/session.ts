/**
 * The Read, Recall, Colour session: what the student is asked to do, in what
 * order, and what each answer is judged against.
 *
 * Pure on purpose. RRC is a runner rather than a world
 * (`docs/adr/0009-read-recall-colour-is-a-runner-not-a-world.md`), so the phase
 * machine, the round sequence and the cumulative scoring are decided here and
 * tested here. The components render a session; they never compute one.
 *
 * Spec: `docs/specs/2026-08-29-read-recall-colour.md`.
 */

import type { ChunkDetail, RecallChunk, RecallItem } from "../api/types";
import { bigramOverlap, longestSharedRun } from "./overlap";

/**
 * One detail as the Coach will see it.
 *
 * `n` is its position in the list actually handed to the model, which for a
 * cumulative round is a fresh dense numbering over several chunks' lists. The
 * model answers in those numbers, so the origin has to be carried alongside or
 * a miss cannot be named back to the chunk it came from, and naming it is the
 * entire value of the feedback.
 */
export interface SessionDetail {
  n: number;
  text: string;
  /** The chunk this detail belongs to. */
  chunk: number;
  /** Its number within that chunk's own list. */
  chunkDetailN: number;
}

export type StepKind = "chunk" | "cumulative" | "the-read";

/**
 * One thing the student is asked to do.
 *
 * A `chunk` step is the ordinary loop: read it, lose it, say it back, react.
 * A `cumulative` step shows nothing at all and asks for everything so far.
 * `the-read` is her take on the whole stimulus, captured and stored, unscored
 * in v1 because scoring it needs a per-stimulus key that would block shipping.
 */
export interface RecallStep {
  kind: StepKind;
  /** 1-based position in the session. */
  index: number;
  /** The last chunk this step covers. */
  through: number;
  /** Every chunk number this step is judged against. */
  covers: number[];
  /**
   * The text shown during Read. Only a `chunk` step has one: a cumulative round
   * shows nothing, which is the whole reason it trains anything, and The Read
   * comes after everything is already hidden.
   */
  text: string | null;
  /** The details this step's recall is judged against, densely renumbered. */
  details: SessionDetail[];
  /**
   * What own-words overlap is measured against: the source text this step
   * covers. For a cumulative round that is every chunk it spans, joined, since
   * she is retelling all of them and reciting any one of them is the failure.
   */
  source: string;
}

export interface RecallSession {
  steps: RecallStep[];
  chunks: RecallChunk[];
  /** The whole stimulus. Never shown whole; kept for The Read's source. */
  stimulus: string;
}

/**
 * Where the run is.
 *
 * `read` is the only phase with the text on screen. `feedback` is the only
 * moment a chunk comes back, and it comes back once.
 */
export type Phase = "read" | "recall" | "feedback" | "colour" | "complete";

export interface SessionState {
  /** 0-based index into `steps`. */
  step: number;
  phase: Phase;
}

export type SessionEvent =
  | { type: "read-done" }
  /** A recall was captured. The transcript may be empty; silence does not pass. */
  | { type: "recall-captured"; transcript: string }
  /** The student has seen which details survived and moved on. */
  | { type: "feedback-done" }
  /** A colour was captured. Anything non-empty advances; nothing is judged. */
  | { type: "colour-captured"; transcript: string };

// --------------------------------------------------------------------------
// Building a session
// --------------------------------------------------------------------------

function isRecallItem(item: unknown): item is RecallItem {
  const it = item as RecallItem | undefined;
  return Boolean(
    it &&
      Array.isArray(it.chunks) &&
      it.chunks.length > 0 &&
      typeof it.prompt === "string" &&
      it.chunks.every(
        (c) =>
          typeof c?.text === "string" &&
          c.text.trim() !== "" &&
          Array.isArray(c.details) &&
          c.details.length > 0,
      ),
  );
}

function detailsFor(chunks: RecallChunk[], covers: number[]): SessionDetail[] {
  const out: SessionDetail[] = [];
  for (const n of covers) {
    const chunk = chunks.find((c) => c.n === n);
    if (!chunk) continue;
    for (const d of chunk.details as ChunkDetail[]) {
      out.push({ n: out.length + 1, text: d.text, chunk: n, chunkDetailN: d.n });
    }
  }
  return out;
}

/**
 * Turn an item into the run the student will actually work.
 *
 * Returns null when the item is not a spoken-recall item or its chunks are
 * unusable, so the caller can fall back rather than render an empty run. That
 * mirrors how a world returns null on content it cannot read.
 *
 * The cumulative rounds are exactly the ones the bank authored. None is
 * invented here: an item whose `cumulative_after` is empty gets no cumulative
 * rounds, and the content test is where "the last round must be the whole
 * stimulus" is enforced, because that is a claim about the bank rather than
 * about the runtime.
 */
export function buildSession(item: unknown): RecallSession | null {
  if (!isRecallItem(item)) return null;

  const chunks = [...item.chunks].sort((a, b) => a.n - b.n);
  const last = chunks[chunks.length - 1].n;
  const valid = new Set(chunks.map((c) => c.n));
  const after = new Set(
    (item.cumulative_after ?? []).filter((n) => valid.has(n) && n >= 2),
  );

  const steps: RecallStep[] = [];
  for (const chunk of chunks) {
    steps.push({
      kind: "chunk",
      index: steps.length + 1,
      through: chunk.n,
      covers: [chunk.n],
      text: chunk.text,
      details: detailsFor(chunks, [chunk.n]),
      source: chunk.text,
    });
    if (after.has(chunk.n)) {
      const covers = chunks.filter((c) => c.n <= chunk.n).map((c) => c.n);
      steps.push({
        kind: "cumulative",
        index: steps.length + 1,
        through: chunk.n,
        covers,
        text: null,
        details: detailsFor(chunks, covers),
        source: chunks
          .filter((c) => c.n <= chunk.n)
          .map((c) => c.text)
          .join(" "),
      });
    }
  }

  steps.push({
    kind: "the-read",
    index: steps.length + 1,
    through: last,
    covers: [],
    text: null,
    // Unscored in v1, so it is judged against nothing and says so, rather than
    // carrying a detail list nobody reads.
    details: [],
    source: item.prompt,
  });

  return { steps, chunks, stimulus: item.prompt };
}

// --------------------------------------------------------------------------
// The phase machine
// --------------------------------------------------------------------------

/** Where a step begins. Only a chunk step ever shows text. */
export function openingPhase(step: RecallStep): Phase {
  return step.kind === "chunk" ? "read" : "recall";
}

export function startSession(session: RecallSession): SessionState {
  return { step: 0, phase: openingPhase(session.steps[0]) };
}

function nextStep(session: RecallSession, state: SessionState): SessionState {
  const step = state.step + 1;
  if (step >= session.steps.length) return { step: state.step, phase: "complete" };
  return { step, phase: openingPhase(session.steps[step]) };
}

/**
 * Advance the run.
 *
 * Three rules are enforced here rather than in a component, because each of
 * them is a place the drill would quietly stop working if a screen got it
 * wrong:
 *
 * - **Silence does not advance.** An empty capture leaves the phase where it
 *   is, so a microphone that failed looks like a microphone that failed and not
 *   like a recall she skipped.
 * - **Colouring In is mandatory and never judged.** Any non-empty capture
 *   passes. The gate is that she reacted, not that she reacted well, because
 *   the reaction is the proof the recall was real: you cannot react to
 *   something you did not understand.
 * - **There is no retry.** Feedback leads to the colour, never back to the
 *   recall. The dropped detail gets its second chance in the next cumulative
 *   round, which is the drill's own answer and keeps the run moving toward the
 *   rounds where the load actually is.
 */
export function advance(
  session: RecallSession,
  state: SessionState,
  event: SessionEvent,
): SessionState {
  const step = session.steps[state.step];
  if (!step || state.phase === "complete") return state;

  switch (event.type) {
    case "read-done":
      return state.phase === "read" ? { ...state, phase: "recall" } : state;

    case "recall-captured": {
      if (state.phase !== "recall") return state;
      if (!event.transcript.trim()) return state;
      // The Read is captured and stored, never judged, so there is nothing to
      // show her about it and nothing to react to.
      if (step.kind === "the-read") return nextStep(session, state);
      return { ...state, phase: "feedback" };
    }

    case "feedback-done": {
      if (state.phase !== "feedback") return state;
      // A cumulative round has no colour: the colour belongs to meeting a chunk
      // for the first time, and she has already coloured every chunk this round
      // covers.
      if (step.kind === "cumulative") return nextStep(session, state);
      return { ...state, phase: "colour" };
    }

    case "colour-captured": {
      if (state.phase !== "colour") return state;
      if (!event.transcript.trim()) return state;
      return nextStep(session, state);
    }

    default:
      return state;
  }
}

// --------------------------------------------------------------------------
// Scoring one recall
// --------------------------------------------------------------------------

export interface RecallScore {
  /** How many details the Coach said survived. */
  kept: number;
  total: number;
  /** The ones that did not, named so she can be told which. */
  missed: SessionDetail[];
  /**
   * Longest run of words shared with the source, and the share of word pairs
   * shared. HIGH is the failure here: it means reciting, not retelling.
   */
  longestRun: number;
  overlap: number;
  /**
   * Absent when the Coach did not answer. Undefined must render as unjudged and
   * must never be scored as "nothing survived", which is a different claim and
   * one the app would have no basis for.
   */
  judged: boolean;
}


/**
 * What a recall earned.
 *
 * `covered` is the Coach's judgement, passed in. It is never derived from the
 * text: a recall is required to be in her own words, so it shares almost no
 * wording with an analytic detail, and any threshold over that either marks a
 * good recall as missing most of its details or marks everything covered. The
 * `press` world measured exactly this and its finding is carried forward here.
 */
export function scoreRecall(
  step: RecallStep,
  transcript: string,
  covered: number[] | undefined,
): RecallScore {
  const known = new Set(step.details.map((d) => d.n));
  const kept = covered ? [...new Set(covered.filter((n) => known.has(n)))] : [];
  const keptSet = new Set(kept);
  return {
    kept: kept.length,
    total: step.details.length,
    missed: covered ? step.details.filter((d) => !keptSet.has(d.n)) : [],
    longestRun: longestSharedRun(transcript, step.source),
    overlap: bigramOverlap(transcript, step.source),
    judged: Array.isArray(covered),
  };
}

/**
 * The missed details, grouped by the chunk they came from.
 *
 * A cumulative round can miss details from four different chunks at once, and
 * "you dropped detail 11" means nothing to her. "From the second sentence, you
 * dropped the ratio" does.
 */
export function missesByChunk(score: RecallScore): Map<number, SessionDetail[]> {
  const out = new Map<number, SessionDetail[]>();
  for (const detail of score.missed) {
    const list = out.get(detail.chunk) ?? [];
    list.push(detail);
    out.set(detail.chunk, list);
  }
  return out;
}
