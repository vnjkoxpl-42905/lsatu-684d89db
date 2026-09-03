import { words } from "./rrcOverlap.ts";

/**
 * Cut the verbatim reads out of what she said, before any of it is judged.
 *
 * ADR 0017 settled that the run is transcribed by the same engine that read the
 * standard, so the student is not graded on a weaker transcript than the
 * reference. There is a second asymmetry it did not close, and this is it.
 *
 * The 1,294 Details were calibrated against Joshua's own runs, and those runs
 * go through `system/scripts/activity-centre/student_shaped.py` first, which
 * removes the verbatim reads: "Joshua reads each chunk aloud before recalling
 * it. The student never does: she reads silently... Scoring Coverage against
 * his raw transcript therefore measures the wrong thing -- the source text is
 * in it, so every Detail is trivially present."
 *
 * The grader had no equivalent step, and the assumption underneath it is not
 * a rule the app enforces. Nothing stops a student reading aloud, and plenty
 * do: it is the natural thing to do with a text you are about to be tested on.
 * When she does, the source text lands in the evidence the judge is shown and
 * every Detail becomes trivially present -- so the student who reads aloud is
 * scored higher for doing less, on the same recording that gets her flagged for
 * Reciting.
 *
 * So the same cut is made here, on the same side of the same comparison.
 *
 * Two things make it safe to do without the corpus's full alignment machinery.
 * It only ever looks inside the WORKING window, never The Recall: she reads
 * while the text is up, and The Recall is from memory by definition, so a
 * word-for-word passage there is a recital and has to survive to be caught as
 * one. And it requires a long run that also covers most of a chunk, so an
 * ordinary paraphrase that happens to share a clause is never mistaken for a
 * read.
 */

/**
 * The shortest run of consecutive words that can be a read at all.
 *
 * Below this the measure stops separating a read from a coincidence. It also
 * means a chunk shorter than eight words is never cut, which is the right way
 * to be wrong: leaving a short read in costs a little accuracy on one Detail,
 * cutting a short paraphrase costs her the Detail entirely.
 */
const MIN_READ_RUN = 8;

/**
 * How much of the chunk the run has to account for.
 *
 * A read is the whole line. Someone saying a chunk back in her own words will
 * reuse the proper nouns and the odd clause; she will not reproduce three
 * fifths of it in order.
 */
const READ_SHARE = 0.6;

export interface StrippedReads {
  /** What she said, with the reads removed, in order. */
  kept: string[];
  /** How many words were cut. Recorded, so the effect is visible on the grade. */
  cut: number;
  /** Which chunks she was found to have read aloud, 1-based. */
  chunksReadAloud: number[];
}

/**
 * The longest run of `needle` words appearing consecutively in `haystack`,
 * with where it starts in the haystack.
 *
 * Word-level longest common substring, rolled one row at a time so a long
 * working window does not allocate a matrix.
 */
function longestRun(
  haystack: string[],
  needle: string[],
): { length: number; start: number } {
  let prev = new Uint32Array(needle.length + 1);
  let best = 0;
  let end = 0;
  for (let i = 1; i <= haystack.length; i++) {
    const row = new Uint32Array(needle.length + 1);
    for (let j = 1; j <= needle.length; j++) {
      if (haystack[i - 1] === needle[j - 1]) {
        row[j] = prev[j - 1] + 1;
        if (row[j] > best) {
          best = row[j];
          end = i;
        }
      }
    }
    prev = row;
  }
  return { length: best, start: end - best };
}

/**
 * Remove each chunk's read-aloud from the words spoken while the text was up.
 *
 * Chunks are taken in order and each cut advances a cursor, because she reads
 * them in order: without that, a phrase repeated across two chunks could be cut
 * twice, and the second cut would land on her recall of the first.
 */
export function stripVerbatimReads(spokenWorking: string[], chunks: string[]): StrippedReads {
  let kept = spokenWorking.slice();
  let cut = 0;
  const chunksReadAloud: number[] = [];
  let cursor = 0;

  chunks.forEach((chunk, i) => {
    const source = words(chunk);
    const need = Math.max(MIN_READ_RUN, Math.ceil(source.length * READ_SHARE));
    if (source.length < need) return;
    const region = kept.slice(cursor);
    const { length, start } = longestRun(region, source);
    if (length < need) return;
    const from = cursor + start;
    kept = [...kept.slice(0, from), ...kept.slice(from + length)];
    cut += length;
    chunksReadAloud.push(i + 1);
    // Everything before the cut is hers -- her say-back of an earlier chunk, or
    // her colouring of it -- and everything after is still to be searched.
    cursor = from;
  });

  return { kept, cut, chunksReadAloud };
}
