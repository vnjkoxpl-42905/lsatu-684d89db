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
