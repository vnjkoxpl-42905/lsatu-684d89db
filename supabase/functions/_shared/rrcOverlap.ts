/**
 * Verbatim-overlap measurement, which in Read, Recall, Colour is a FAILURE
 * signal rather than a success one.
 *
 * This is the one comparison in RRC that is safe to compute from text, and the
 * distinction is worth keeping straight, because the `press` world next door
 * proved the opposite for coverage. Coverage compares a recall to an ANALYTIC
 * detail ("common view: ...") whose vocabulary a retelling never uses, so
 * overlap there means nothing: the measured median between an idea and its own
 * credited answer is 0.25 and many are zero. Own-words compares a recall to the
 * SOURCE SENTENCE she just read, where the vocabulary genuinely is shared, so
 * overlap means exactly what it looks like.
 *
 * High overlap means she is reciting rather than retelling, which is the habit
 * rereading produces and the thing hiding the text exists to prevent.
 */

const WORD = /[a-z0-9]+/g;

export function words(text: string): string[] {
  return text.toLowerCase().match(WORD) ?? [];
}

/** The longest run of words the response shares verbatim with the source. */
export function longestSharedRun(response: string, source: string): number {
  const r = words(response);
  const s = words(source);
  if (!r.length || !s.length) return 0;
  // Classic longest-common-substring over word arrays, rolled one row at a time
  // so a whole passage's worth of cumulative source does not allocate a matrix.
  let prev = new Uint32Array(s.length + 1);
  let best = 0;
  for (let i = 1; i <= r.length; i++) {
    const row = new Uint32Array(s.length + 1);
    for (let j = 1; j <= s.length; j++) {
      if (r[i - 1] === s[j - 1]) {
        row[j] = prev[j - 1] + 1;
        if (row[j] > best) best = row[j];
      }
    }
    prev = row;
  }
  return best;
}

/** Share of the response's word pairs that appear verbatim in the source. */
export function bigramOverlap(response: string, source: string): number {
  const r = words(response);
  const s = words(source);
  const pairs = new Set<string>();
  for (let i = 0; i + 2 <= s.length; i++) pairs.add(`${s[i]} ${s[i + 1]}`);
  const total = Math.max(0, r.length - 1);
  if (!total) return 0;
  let shared = 0;
  for (let i = 0; i < total; i++) {
    if (pairs.has(`${r[i]} ${r[i + 1]}`)) shared++;
  }
  return shared / total;
}

/**
 * The Reciting thresholds, and where they come from.
 *
 * Calibrated 2026-09-03 against three measured populations rather than chosen.
 * The first pair, 12 and 0.50, was neither measured nor written down, and it
 * flagged **all 22** of Joshua's own model runs -- the recordings that DEFINE a
 * correct performance -- plus 4 of 21 correct stimuli in the first real trial.
 * Telling a student she recited when she did not is the drill's named failure
 * pinned on her for our arithmetic.
 *
 *                                    longest run    bigram share
 *   Joshua, reading aloud + recall       19 - 43    0.180 - 0.404
 *   a student, done correctly             3 - 18    0.145 - 0.652
 *   a deliberate recite                        48            0.989
 *
 * Two things fall out of that table.
 *
 * The longest run is a poor primary signal. Joshua reads each chunk aloud
 * before recalling it, so his runs sit at 19 to 43 while he is doing the drill
 * perfectly; a single sentence read out loud pins the measure regardless of
 * everything said around it. The bigram share is a proportion of EVERYTHING
 * said, so the same reading-aloud dilutes rather than inflates it -- which is
 * why his share never passes 0.404 even while reading the whole stimulus.
 *
 * So the share is the real test and the run is a backstop, set above the entire
 * reading-aloud population rather than below it. At these two numbers all 22
 * model runs and all 21 correct stimuli come back clean and the deliberate
 * recite is still caught.
 *
 * They are deliberately set to avoid false positives rather than to catch every
 * marginal case: a Reciting flag tells a student something about herself, and a
 * missed one only fails to. One deliberate recite is thin evidence for the
 * upper bound, which is why `reciting_run` and `reciting_bigram` are now
 * recorded on every stimulus -- so the next calibration reads real runs instead
 * of reconstructing them.
 */
export const RECITING_RUN = 45;
export const RECITING_BIGRAM = 0.8;

export interface RecitingCheck {
  reciting: boolean;
  /** The longest run of words shared with the stimulus, in order. */
  run: number;
  /** The share of what she said whose word pairs came from the stimulus. */
  bigram: number;
}

/**
 * Whether this is a retelling or a recital, decided in code and not by a model.
 *
 * It is a measurement, so it is measured. The numbers come back with the
 * verdict because a flag with no reading behind it cannot be argued with, and
 * because the thresholds above were only fixable by going and measuring.
 */
export function checkReciting(spoken: string, stimulus: string): RecitingCheck {
  const run = longestSharedRun(spoken, stimulus);
  const bigram = bigramOverlap(spoken, stimulus);
  return { run, bigram: Math.round(bigram * 1000) / 1000, reciting: run >= RECITING_RUN || bigram >= RECITING_BIGRAM };
}
