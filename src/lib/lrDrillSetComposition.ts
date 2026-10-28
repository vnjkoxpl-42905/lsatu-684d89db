import type { LRQuestion } from '@/lib/questionLoader';

export interface LRDrillSetAvailability {
  selectedCount: number;
  availableCount: number;
  missingCount: number;
  exceedsSize: boolean;
}

function uniqueByQid(questions: readonly LRQuestion[]): LRQuestion[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.qid)) return false;
    seen.add(question.qid);
    return true;
  });
}

/** Exact picks keep their order and the remaining places come from the filtered pool. */
export function getLRDrillSetAvailability(
  selectedQids: ReadonlySet<string>,
  filteredQuestions: readonly LRQuestion[],
  setSize: number,
): LRDrillSetAvailability {
  const availableCount = uniqueByQid(filteredQuestions.filter((question) => !selectedQids.has(question.qid))).length;
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

  // One place per canonical ID: an exact pick never comes back through the
  // sampled pool, and a pool that lists a question twice cannot fill two places.
  const remaining = uniqueByQid(filteredQuestions.filter((question) => !selectedQids.has(question.qid)));
  return [...(selected as LRQuestion[]), ...shuffle(remaining).slice(0, setSize - selected.length)];
}
