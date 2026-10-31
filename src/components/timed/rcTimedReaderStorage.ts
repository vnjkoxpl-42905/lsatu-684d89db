import type { RcHighlight, RcPassage } from '@/features/rc/lib/rcTypes';

/**
 * Add a mark, cutting away what it covers on the same target with the same kind (highlight or underline).
 * Repeated drags over one sentence stay one mark instead of piling up, and a highlight can still carry an underline.
 */
export function addRcTimedMark(marks: RcHighlight[], mark: RcHighlight): RcHighlight[] {
  const kind = mark.kind ?? 'highlight';
  const kept: RcHighlight[] = [];
  for (const existing of marks) {
    if (existing.target !== mark.target || (existing.kind ?? 'highlight') !== kind || existing.end <= mark.start || existing.start >= mark.end) { kept.push(existing); continue; }
    if (existing.start < mark.start) kept.push({ ...existing, end: mark.start });
    if (existing.end > mark.end) kept.push({ ...existing, start: mark.end });
  }
  return [...kept, mark];
}

/** Stored marks are untrusted, and must belong to content in this sitting. */
export function validateRcTimedMarks(value: unknown, passages: RcPassage[]): Record<string, RcHighlight[]> {
  const result: Record<string, RcHighlight[]> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const passage of passages) {
    const rows = (value as Record<string, unknown>)[String(passage.passageId)];
    if (!Array.isArray(rows)) continue;
    const lengths = new Map<string, number>([['passage', passage.text.length]]);
    for (const question of passage.questions) {
      lengths.set(`q${question.questionId}:stem`, question.prompt?.length ?? 0);
      for (const choice of question.choices) lengths.set(`q${question.questionId}:${choice.letter}`, choice.text.length);
    }
    result[String(passage.passageId)] = rows.filter((row): row is RcHighlight => {
      if (!row || typeof row !== 'object') return false;
      const limit = lengths.get(row.target);
      return limit !== undefined && Number.isSafeInteger(row.start) && Number.isSafeInteger(row.end)
        && row.start >= 0 && row.end > row.start && row.end <= limit
        && ['yellow', 'pink', 'orange'].includes(row.color)
        && (row.kind === undefined || row.kind === 'highlight' || row.kind === 'underline');
    }).map(({ target, start, end, color, kind }) => ({ target, start, end, color, ...(kind ? { kind } : {}) }));
  }
  return result;
}
