/**
 * Lesson metadata that is authored rather than transcribed.
 *
 * `content.ts` is a mechanical transcription of the approved prototype and is
 * regenerated wholesale, so anything hand-written lives here instead.
 */

import { CHAPTERS } from './content';

/**
 * Storage key of the first from-memory write. The lesson plays this response
 * back to the student twice: beside the author's main point when it is first
 * revealed, and again on the completion screen.
 */
export const FIRST_ATTEMPT_KEY = 'recall-medieval';

/**
 * The lesson's four acts, by 0-based chapter index. Fixed mapping: the shape of
 * the lesson does not change, so neither does this.
 */
export interface Act {
  label: string;
  /** Inclusive range of chapter indices. */
  from: number;
  to: number;
}

export const ACTS: Act[] = [
  { label: 'Part One · The experiment', from: 0, to: 3 },
  { label: 'Part Two · The framework', from: 4, to: 7 },
  { label: 'Part Three · CEER in practice', from: 8, to: 15 },
  { label: 'Part Four · Where this leaves you', from: 16, to: 16 },
];

export function actOf(chapterIndex: number): Act | undefined {
  return ACTS.find((act) => chapterIndex >= act.from && chapterIndex <= act.to);
}

/** True when this chapter opens an act, so Contents can rule a divider above it. */
export function startsAct(chapterIndex: number): Act | undefined {
  return ACTS.find((act) => act.from === chapterIndex);
}

if (ACTS[ACTS.length - 1].to !== CHAPTERS.length - 1) {
  // A content change that adds or removes a chapter must revisit the act map
  // rather than silently leaving chapters unlabelled.
  console.warn('[rc-bootcamp] act map does not cover every chapter');
}
