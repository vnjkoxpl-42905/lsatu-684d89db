import type { RcHighlight, RcPassage } from '@/features/rc/lib/rcTypes';

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
