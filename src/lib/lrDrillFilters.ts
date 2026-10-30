import type { LRQuestion } from '@/lib/questionLoader';

/** Shared filter state for every LR drill-building surface. */
export interface LRDrillFilters {
  prepTests: number[];
  sections: number[];
  /**
   * Question numbers, OR-ed like every other facet. An empty array means
   * unrestricted, matching `prepTests` and `sections`. This replaced a single
   * `questionNumber: number | null`, which could not express "Q1, 6, 8, 23" —
   * the thing you most often want when rebuilding a specific set.
   */
  questionNumbers: number[];
  questionTypes: string[];
  reasoningTypes: string[];
  questionFeatures: string[];
  difficulties: number[];
  searchQuery: string;
}

export interface LRDrillFacetValues {
  prepTests: number;
  sections: number;
  questionTypes: string;
  reasoningTypes: string;
  questionFeatures: string;
  difficulties: number;
}

export type LRDrillFilterFacet = keyof LRDrillFacetValues;

export const LR_DRILL_FILTER_FACETS: readonly LRDrillFilterFacet[] = [
  'prepTests',
  'sections',
  'questionTypes',
  'reasoningTypes',
  'questionFeatures',
  'difficulties',
];

export function createEmptyLRDrillFilters(): LRDrillFilters {
  return {
    prepTests: [],
    sections: [],
    questionNumbers: [],
    questionTypes: [],
    reasoningTypes: [],
    questionFeatures: [],
    difficulties: [],
    searchQuery: '',
  };
}

function intersects<T>(selected: readonly T[], actual: readonly T[] | undefined): boolean {
  if (selected.length === 0) return true;
  if (!actual?.length) return false;

  const selectedValues = new Set(selected);
  return actual.some((value) => selectedValues.has(value));
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function getQuestionSearchText(question: LRQuestion): string {
  return normalizeSearchText(
    [
      question.qid,
      `PT${question.pt}.S${question.section}.Q${question.qnum}`,
      question.stimulus ?? '',
      question.questionStem,
      ...Object.values(question.answerChoices ?? {}),
    ].join(' '),
  );
}

function getQuestionFacetValues<F extends LRDrillFilterFacet>(
  question: LRQuestion,
  facet: F,
): LRDrillFacetValues[F][] {
  switch (facet) {
    case 'prepTests':
      return [question.pt] as LRDrillFacetValues[F][];
    case 'sections':
      return [question.section] as LRDrillFacetValues[F][];
    case 'questionTypes':
      return [question.qtype] as LRDrillFacetValues[F][];
    case 'reasoningTypes':
      return (question.reasoningType ?? []) as LRDrillFacetValues[F][];
    case 'questionFeatures':
      return (question.questionFeatures ?? []) as LRDrillFacetValues[F][];
    case 'difficulties':
      return [question.difficulty] as LRDrillFacetValues[F][];
  }
}

/**
 * Matches with OR semantics inside each array facet and AND semantics across
 * facets. An empty facet is unrestricted. `omitFacet` is used to derive
 * contextual counts without a facet filtering its own options.
 */
export function matchesLRDrillFilters(
  question: LRQuestion,
  filters: Readonly<LRDrillFilters>,
  omitFacet?: LRDrillFilterFacet,
): boolean {
  if (omitFacet !== 'prepTests' && filters.prepTests.length > 0 && !filters.prepTests.includes(question.pt)) {
    return false;
  }
  if (omitFacet !== 'sections' && filters.sections.length > 0 && !filters.sections.includes(question.section)) {
    return false;
  }
  if (
    omitFacet !== 'questionTypes' &&
    filters.questionTypes.length > 0 &&
    !filters.questionTypes.includes(question.qtype)
  ) {
    return false;
  }
  if (
    omitFacet !== 'reasoningTypes' &&
    !intersects(filters.reasoningTypes, question.reasoningType)
  ) {
    return false;
  }
  if (
    omitFacet !== 'questionFeatures' &&
    !intersects(filters.questionFeatures, question.questionFeatures)
  ) {
    return false;
  }
  if (
    omitFacet !== 'difficulties' &&
    filters.difficulties.length > 0 &&
    !filters.difficulties.includes(question.difficulty)
  ) {
    return false;
  }
  if (
    filters.questionNumbers.length > 0 &&
    !filters.questionNumbers.includes(question.qnum)
  ) {
    return false;
  }

  const query = normalizeSearchText(filters.searchQuery);
  const address = /^pt(\d+)\.s(\d+)\.q(\d+)$/i.exec(query);
  if (address) {
    if (question.pt !== Number(address[1]) || question.section !== Number(address[2]) || question.qnum !== Number(address[3])) return false;
  } else if (query && !getQuestionSearchText(question).includes(query)) {
    return false;
  }

  return true;
}

export function filterLRQuestions(
  questions: readonly LRQuestion[],
  filters: Readonly<LRDrillFilters>,
): LRQuestion[] {
  return questions.filter((question) => matchesLRDrillFilters(question, filters));
}

/**
 * Counts each option after applying all active filters except the facet being
 * counted. This makes sibling options independently discoverable even when a
 * different option in the same facet is already selected.
 */
export function getLRDrillContextualOptionCounts<F extends LRDrillFilterFacet>(
  questions: readonly LRQuestion[],
  filters: Readonly<LRDrillFilters>,
  facet: F,
  options: readonly LRDrillFacetValues[F][],
): Map<LRDrillFacetValues[F], number> {
  const counts = new Map<LRDrillFacetValues[F], number>(
    options.map((option) => [option, 0]),
  );
  if (counts.size === 0) return counts;

  for (const question of questions) {
    if (!matchesLRDrillFilters(question, filters, facet)) continue;

    const values = new Set(getQuestionFacetValues(question, facet));
    for (const value of values) {
      if (counts.has(value)) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return counts;
}

/** Selected options stay removable even when their contextual count is zero. */
export function isLRDrillOptionVisible<T extends string | number>(
  option: T,
  selectedOptions: readonly T[],
  contextualCount: number,
): boolean {
  return selectedOptions.includes(option) || contextualCount > 0;
}

export function getVisibleLRDrillOptions<T extends string | number>(
  options: readonly T[],
  selectedOptions: readonly T[],
  contextualCounts: ReadonlyMap<T, number>,
): T[] {
  return options.filter((option) =>
    isLRDrillOptionVisible(option, selectedOptions, contextualCounts.get(option) ?? 0),
  );
}
