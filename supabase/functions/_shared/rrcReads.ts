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
 * So the same cut is made here, on the same side of the same comparison, and
 * since 2026-09-04 by the same method: `transcript_align.locate`, ported.
 *
 * One thing makes it safe to do without the corpus's full machinery. It only
 * ever looks inside the WORKING window, never The Recall: she reads while the
 * text is up, and The Recall is from memory by definition, so a word-for-word
 * passage there is a recital and has to survive to be caught as one.
 */

/**
 * Words, for the purpose of matching a read.
 *
 * NOT `rrcOverlap.words`, and the difference is the whole of one of the two
 * defects this file was rewritten to fix. That tokeniser is `/[a-z0-9]+/`,
 * which splits "don't" into "don" and "t"; the corpus aligner this is ported
 * from is `[a-z0-9']+`, which keeps it whole. The two are not interchangeable
 * here, and `rrcOverlap.words` cannot simply be widened: ADR 0022's reciting
 * thresholds were calibrated on its output four commits ago.
 *
 * The curly apostrophe is folded to the straight one first. The stimulus text
 * carries curly quotes in 18 of the corpus's 990 chunks; no ASR engine emits
 * them, so without the fold those chunks tokenise differently on the two sides
 * of the comparison and their reads can never be found.
 */
const READ_WORD = /[a-z0-9']+/g;

export function readWords(text: string): string[] {
  return text.toLowerCase().replace(/’/g, "'").match(READ_WORD) ?? [];
}

/**
 * The shortest chunk that can be matched at all.
 *
 * Below this the measure stops separating a read from a coincidence, and a
 * fuzzy measure needs the floor more than an exact one did: on the 956 chunks
 * of the captured corpus, every one of the false cuts at the chosen tolerance
 * that survived this floor was a short chunk whose words happened to recur in
 * her own retelling. Leaving a short read in costs a little accuracy on one
 * Detail; cutting a short paraphrase costs her the Detail entirely, so this
 * errs the safe way.
 */
const MIN_CHUNK_WORDS = 8;

/**
 * How closely the best window has to match the chunk before it is called a read.
 *
 * Measured, not chosen. `model-run-reads.json` holds the best alignment ratio
 * for all 956 chunks of the twelve captured sections, scored twice: once
 * against the transcript that contains the read, and once against the same
 * transcript with the read already removed, which leaves only his retelling and
 * colouring -- the shape a student's recording has. Those two distributions are
 * what a threshold has to separate, and at 0.80, with the floor above:
 *
 *     tolerance   reads found     her own words cut by mistake
 *     0.70          98.1%              6.6%
 *     0.75          97.5%              3.4%
 *     0.80          96.1%              1.7%
 *     0.85          92.2%              0.7%
 *
 * The corpus aligner's own 0.55 is not portable to this side of the comparison
 * and taking it would have been the wrong kind of faithful. It answers "where
 * in this transcript is the read", in a corpus where every chunk is known to
 * have been read aloud. The question here is the different one of "was this
 * chunk read aloud at all", asked of a window that very often contains no read
 * -- and at 0.55 it cuts something for 27% of chunks that hold no read at all.
 */
export const MIN_READ_RATIO = 0.8;

export interface StrippedReads {
  /** What she said, with the reads removed, in order. Original tokens, not normalised. */
  kept: string[];
  /** How many words were cut. Recorded, so the effect is visible on the grade. */
  cut: number;
  /** Which chunks she was found to have read aloud, 1-based. */
  chunksReadAloud: number[];
}

/**
 * `difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()`, ported.
 *
 * 2*M/T, where M is the total size of the matching blocks found by recursively
 * taking the longest common run and repeating on what is left of each side, and
 * T is the combined length. Ported rather than approximated because the
 * calibration band was set on this function's output; a different similarity
 * measure with a re-tuned threshold would be a second ear again, which is the
 * defect being closed.
 *
 * `autojunk` is off and there is no junk predicate, so difflib's two extension
 * loops after the search cannot extend a block the search already took to its
 * maximum, and are omitted.
 */
export function alignmentRatio(a: string[], b: string[]): number {
  const total = a.length + b.length;
  if (total === 0) return 1;

  const b2j = new Map<string, number[]>();
  for (let j = 0; j < b.length; j++) {
    const at = b2j.get(b[j]);
    if (at) at.push(j);
    else b2j.set(b[j], [j]);
  }

  /** The longest run common to a[alo,ahi) and b[blo,bhi), as difflib finds it. */
  function longest(alo: number, ahi: number, blo: number, bhi: number) {
    let besti = alo;
    let bestj = blo;
    let bestsize = 0;
    let j2len = new Map<number, number>();
    for (let i = alo; i < ahi; i++) {
      const next = new Map<number, number>();
      for (const j of b2j.get(a[i]) ?? []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        next.set(j, k);
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
      j2len = next;
    }
    return { i: besti, j: bestj, k: bestsize };
  }

  let matched = 0;
  const queue: [number, number, number, number][] = [[0, a.length, 0, b.length]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const { i, j, k } = longest(alo, ahi, blo, bhi);
    if (!k) continue;
    matched += k;
    if (alo < i && blo < j) queue.push([alo, i, blo, j]);
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
  }
  return (2 * matched) / total;
}

/** Where a chunk's read sits in the window, in normalised word indices. */
export interface ReadSpan {
  start: number;
  /** Exclusive. */
  end: number;
  ratio: number;
}

/**
 * The best window for `needle` anywhere in `hay`. `transcript_align.locate`,
 * ported, minus the tolerance: this answers where the closest thing to the
 * chunk sits and how close it is, and `MIN_READ_RATIO` decides whether that is
 * a read. Kept apart so the calibration fixture is generated by the same
 * function the grader runs, rather than by a copy of it.
 *
 * Every start is scored, at the needle's own length and at a third longer,
 * because a read is not a fixed-width thing: the engine drops words, adds
 * words, and hears "immoral" as "moral". The scan stops early once a window
 * has matched almost exactly, which is the common case and the whole reason
 * this is affordable.
 */
export function locateRead(needle: string[], hay: string[]): ReadSpan | null {
  if (!needle.length || !hay.length) return null;
  const widths = [needle.length, Math.floor(needle.length * 1.35) + 3];
  let best: ReadSpan | null = null;
  for (let start = 0; start < hay.length; start++) {
    for (const width of widths) {
      const window = hay.slice(start, start + width);
      if (!window.length) continue;
      const ratio = alignmentRatio(needle, window);
      if (best === null || ratio > best.ratio) best = { start, end: start + window.length, ratio };
    }
    if (best && best.ratio > 0.93) break;
  }
  return best;
}

/**
 * Remove each chunk's read-aloud from the words spoken while the text was up.
 *
 * `spokenWorking` arrives as the engine wrote it -- "Thus," and "Hot" and
 * "don't", capitalised and punctuated, because the grader passes Deepgram's
 * `punctuated_word` through. It is normalised here for the comparison ONLY and
 * the cut is made on the original tokens, so what the judge and the student are
 * shown keeps its capitals and its full stops.
 *
 * That normalisation is the second defect this rewrite closes and it was the
 * larger of the two. Before it, the haystack was compared token-for-token
 * against a normalised chunk, so "Thus," could never equal "thus" and only a
 * word that was already lowercase and unpunctuated could match at all. On the
 * twelve captured sections that alone took the reads found from 800 of 956
 * chunks down to 463.
 *
 * Every chunk is located independently over the whole window and the ordering
 * is resolved afterwards, highest-confidence first, admitting a match only if
 * it does not cross one already accepted. A single forward-advancing cursor
 * looks equivalent and is not: one chunk whose read is missing or truncated
 * matches junk somewhere arbitrary, and the cursor then starves every chunk
 * after it. PT134.S3.Q16 is the case that proved it in the corpus -- the
 * recording starts mid-sentence, so chunk 1 matched badly and chunks 2 to 5
 * were all reported unread when every one of them had been read aloud.
 */
export function stripVerbatimReads(spokenWorking: string[], chunks: string[]): StrippedReads {
  // The normalised view of the window, and the original index each word came
  // from, so a span found in one can be cut out of the other.
  const hay: string[] = [];
  const source: number[] = [];
  spokenWorking.forEach((token, i) => {
    for (const w of readWords(token)) {
      hay.push(w);
      source.push(i);
    }
  });

  const candidates = chunks.map((chunk) => {
    const needle = readWords(chunk);
    if (needle.length < MIN_CHUNK_WORDS) return null;
    const best = locateRead(needle, hay);
    return best && best.ratio >= MIN_READ_RATIO ? best : null;
  });

  // Confident matches first: they are the anchors the rest are ordered against.
  const byConfidence = candidates
    .map((span, i) => ({ span, i }))
    .filter((c): c is { span: ReadSpan; i: number } => c.span !== null)
    .sort((a, b) => b.span.ratio - a.span.ratio);

  const accepted = new Map<number, ReadSpan>();
  for (const { span, i } of byConfidence) {
    // He reads the chunks in order, so a read cannot start before a read that
    // is accepted for an earlier chunk, nor after one accepted for a later one.
    let crosses = false;
    for (const [j, other] of accepted) {
      if (j < i && span.start < other.start) crosses = true;
      if (j > i && span.start > other.start) crosses = true;
      if (crosses) break;
    }
    if (!crosses) accepted.set(i, span);
  }

  // Overlapping spans drop the same word once, so the count stays honest.
  const drop = new Set<number>();
  for (const span of accepted.values()) {
    for (let k = span.start; k < Math.min(span.end, hay.length); k++) drop.add(source[k]);
  }

  return {
    kept: spokenWorking.filter((_, i) => !drop.has(i)),
    cut: drop.size,
    chunksReadAloud: [...accepted.keys()].sort((a, b) => a - b).map((i) => i + 1),
  };
}
