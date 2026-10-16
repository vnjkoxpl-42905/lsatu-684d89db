import type { HistoryAnswer } from './firstAnswerDetails';

export type HistorySort = 'newest' | 'oldest' | 'question' | 'source';
export interface HistoryFilters {
  area: string;
  result: string;
  answer: string;
  source: string;
  mode: string;
  topic: string;
  search: string;
  sort: HistorySort;
}

/** Filtering never reselects first answers; identity comes from the complete ledger. */
export function filterProgressHistory(rows: HistoryAnswer[], filters: HistoryFilters): HistoryAnswer[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter((row) =>
    (filters.area === 'all' || row.area === filters.area)
    && (filters.result === 'all' || row.correct === (filters.result === 'correct'))
    && (filters.answer === 'all' || row.isFirst === (filters.answer === 'first'))
    && (filters.source === 'all' || row.source === filters.source)
    && (filters.mode === 'all' || row.mode === filters.mode)
    && (filters.topic === 'all' || row.topic === filters.topic)
    && (!search || `${row.questionKey} ${row.attemptId} ${row.topic ?? ''}`.toLocaleLowerCase().includes(search)),
  ).sort((a, b) => {
    const date = Date.parse(a.gradedAt) - Date.parse(b.gradedAt);
    if (filters.sort === 'oldest') return date || a.attemptId.localeCompare(b.attemptId);
    if (filters.sort === 'question') return a.questionKey.localeCompare(b.questionKey, undefined, { numeric: true }) || date || a.attemptId.localeCompare(b.attemptId);
    if (filters.sort === 'source') return a.source.localeCompare(b.source) || -date || a.attemptId.localeCompare(b.attemptId);
    return -date || a.attemptId.localeCompare(b.attemptId);
  });
}
