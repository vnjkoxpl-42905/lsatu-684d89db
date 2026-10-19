// Pure helpers for the teacher's weekly-plan builder. The builder keeps one
// flat array of drafts; each day column shows the drafts for that day in
// array order. These helpers keep that order meaningful and make it the order
// that gets published.

interface DayDraft {
  day: string; // yyyy-MM-dd
}

/**
 * Swap a draft with its neighbour on the same day. Drafts on other days keep
 * their positions, so moving Tuesday's second task never disturbs Monday.
 */
export function moveWithinDay<T extends DayDraft>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = items[index];
  if (!target) return items;
  const sameDay = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.day === target.day)
    .map(({ i }) => i);
  const at = sameDay.indexOf(index);
  const swapWith = sameDay[at + direction];
  if (swapWith === undefined) return items;
  const next = items.slice();
  next[index] = items[swapWith];
  next[swapWith] = target;
  return next;
}

/**
 * The sort_order to publish for each draft, by its array index: day first,
 * then the order shown inside that day. Students read plans by day then
 * sort_order, so this makes the published order the order Joshua saw.
 */
export function prescribedSortOrder<T extends DayDraft>(items: T[]): number[] {
  const ranked = items
    .map((it, i) => ({ day: it.day, i }))
    .sort((a, b) => a.day.localeCompare(b.day) || a.i - b.i);
  const order = new Array<number>(items.length);
  ranked.forEach(({ i }, rank) => {
    order[i] = rank;
  });
  return order;
}

/** Replacing a builder that already holds tasks needs an explicit yes. */
export function replaceNeedsConfirm(currentCount: number): boolean {
  return currentCount > 0;
}
