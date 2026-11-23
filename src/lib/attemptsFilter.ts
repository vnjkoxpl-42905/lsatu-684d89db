/**
 * Shared PostgREST filter for queries reading from the `attempts` table.
 *
 * Historic blind review rows sit in `attempts` with `br_selected = true`
 * (audit F4). New blind review answers live in `section_review_records`, while
 * historic rows remain untouched. Every client query reading `attempts` must
 * wrap the builder with this helper so blind review rows never count as real
 * attempts in accuracy, freshness, adaptive selection, or teacher metrics.
 */
export function excludeBlindReviewAttempts<
  T extends { not: (column: 'br_selected', operator: 'is', value: true) => T },
>(query: T): T {
  return query.not('br_selected', 'is', true);
}
