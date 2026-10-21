import type { LRQuestion } from '@/lib/questionLoader';

export interface LRDrillSetAvailability {
  selectedCount: number;
  availableCount: number;
  missingCount: number;
  exceedsSize: boolean;
}

/** Exact picks keep their order and the remaining places come from the filtered pool. */
export function getLRDrillSetAvailability(
  selectedQids: ReadonlySet<string>,
  filteredQuestions: readonly LRQuestion[],
  setSize: number,
): LRDrillSetAvailability {
  const availableCount = filteredQuestions.filter((question) => !selectedQids.has(question.qid)).length;
  return {
    selectedCount: selectedQids.size,
    availableCount,
    missingCount: Math.max(0, setSize - selectedQids.size - availableCount),
    exceedsSize: selectedQids.size > setSize,
  };
}

export function composeLRDrillSet(
  selectedQids: ReadonlySet<string>,
  allQuestions: readonly LRQuestion[],
  filteredQuestions: readonly LRQuestion[],
  setSize: number,
  shuffle: (questions: LRQuestion[]) => LRQuestion[],
): LRQuestion[] | null {
  const availability = getLRDrillSetAvailability(selectedQids, filteredQuestions, setSize);
  if (availability.exceedsSize || availability.missingCount > 0) return null;

  const byQid = new Map(allQuestions.map((question) => [question.qid, question]));
  const selected = Array.from(selectedQids).map((qid) => byQid.get(qid));
  if (selected.some((question) => !question)) return null;

  const remaining = filteredQuestions.filter((question) => !selectedQids.has(question.qid));
  return [...(selected as LRQuestion[]), ...shuffle(remaining).slice(0, setSize - selected.length)];
}
