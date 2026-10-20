/**
 * The one predicate for "this question has an authored written explanation".
 *
 * Shared by the app (`src/hooks/useLrExplanation.ts` re-implements it in TS)
 * and by `scripts/missing-explanations-census.mjs`. Both are run against the
 * same fixtures in `src/lib/explanationProse.fixtures.test.ts`, so the census
 * cannot count a question one way while the drill surface treats it another.
 *
 * A style has prose when at least one breakdown step or one choice note has a
 * body that is non-empty after trim(). Tags and student percentages never
 * count: a question can have every choice tagged and still have nothing to
 * read.
 *
 * @typedef {{ body?: string | null }} ProseRow
 * @typedef {{ steps?: ProseRow[] | null, notes?: ProseRow[] | null }} ProseStyle
 */

/** @param {unknown} body */
export function isProse(body) {
  return typeof body === 'string' && body.trim().length > 0;
}

/** @param {ProseStyle[] | null | undefined} styles */
export function hasAuthoredProse(styles) {
  if (!Array.isArray(styles)) return false;
  return styles.some(
    (style) =>
      (style?.steps ?? []).some((row) => isProse(row?.body)) ||
      (style?.notes ?? []).some((row) => isProse(row?.body)),
  );
}
