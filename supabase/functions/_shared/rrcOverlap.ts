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
 * Recalibrated 2026-09-04 against 274 of Joshua's own model runs, across all
 * twelve captured sections. The previous numbers were measured on ONE section,
 * PT102.S3, and the audit's finding is precisely that a one-section calibration
 * did not hold: the standard itself started flagging as a recital the moment a
 * longer stimulus appeared.
 *
 *                                        longest run     bigram share
 *   Joshua, reading aloud + recall (274)      9 - 60    0.066 - 0.462
 *   a student, done correctly (21)             3 - 18    0.145 - 0.652
 *   a deliberate recite (2)                  48, 57      0.989, 0.952
 *
 * The two measures are not comparable in quality, and the wider corpus makes
 * that stark rather than merely visible.
 *
 * The share separates cleanly. Nothing honest has ever been measured above
 * 0.462, both recitals are above 0.95, and the threshold sits in the empty band
 * between them with room on either side.
 *
 * The longest run does not separate at all. Joshua reads each chunk aloud
 * before recalling it, so a single long sentence pins the measure regardless of
 * how well he retells everything around it -- and across twelve sections his
 * runs reach 60. FOUR of the 274 already sit at or above 45, which means the
 * old rule flagged the standard, on the recordings that define a correct
 * performance. Their shares were 0.279, 0.353, 0.357 and 0.366: not close to
 * anything.
 *
 * So the run stops being an independent trigger and becomes what ADR 0022's
 * title always said it was. A recital is a share. A long run is only evidence
 * alongside one, and `RECITING_RUN_SHARE` is set above the highest share ever
 * measured in EITHER honest population, so the backstop cannot reintroduce the
 * false positives it exists to catch the tail of.
 *
 * Still deliberately set to avoid false positives rather than to catch every
 * marginal case: a Reciting flag tells a student something about herself, and a
 * missed one only fails to.
 */
export const RECITING_RUN = 45;
export const RECITING_BIGRAM = 0.8;
/**
 * The share a long run has to sit beside before the run means anything.
 *
 * Above 0.652, the highest share in either honest population, which is a
 * student's and not Joshua's. Between this and `RECITING_BIGRAM` is the band
 * where a partial recital lives: enough verbatim text to be worth naming, but
 * not enough to trip the share on its own.
 */
export const RECITING_RUN_SHARE = 0.7;

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
  const share = Math.round(bigram * 1000) / 1000;
  return {
    run,
    bigram: share,
    // The share on its own, or a long run WITH an elevated share. Never a long
    // run on its own: four of Joshua's own 274 model runs would flag on that.
    reciting: share >= RECITING_BIGRAM || (run >= RECITING_RUN && share >= RECITING_RUN_SHARE),
  };
}
