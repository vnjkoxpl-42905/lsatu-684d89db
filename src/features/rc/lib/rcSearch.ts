/**
 * Filter and snippet logic for the RC search page (`/rc/search`). Pure
 * functions over the passage index and the flat question index so the page
 * stays a thin shell and the semantics stay testable.
 *
 * Semantics: OR within one filter dimension, AND across dimensions — the same
 * rule the hub's Customize panel uses. A passage survives question-level
 * filters only if at least one of its questions matches, so a result is never
 * a passage the student cannot actually drill for that tag.
 */
import {
  RC_PREPTEST_MAX,
  RC_PREPTEST_MIN,
  type RcIndexPassage,
  type RcQuestionIndexEntry,
} from './rcTypes';

export type RcSearchPassage = RcIndexPassage & { preptest: number };

export interface RcSearchFilters {
  topics: string[];
  formats: string[];
  frameworks: string[];
  passageDifficulties: number[];
  preptestMin: number;
  preptestMax: number;
  families: string[];
  questionTypes: string[];
  features: string[];
  questionDifficulties: number[];
}

export const DEFAULT_RC_SEARCH_FILTERS: RcSearchFilters = {
  topics: [],
  formats: [],
  frameworks: [],
  passageDifficulties: [],
  preptestMin: RC_PREPTEST_MIN,
  preptestMax: RC_PREPTEST_MAX,
  families: [],
  questionTypes: [],
  features: [],
  questionDifficulties: [],
};

export interface RcSearchSnippet {
  before: string;
  match: string;
  after: string;
}

export interface RcSearchPassageResult {
  passage: RcSearchPassage;
  /** Questions in this passage matching the question filters and query. */
  matchedQuestionCount: number;
  titleMatched: boolean;
}

export interface RcSearchQuestionResult {
  question: RcQuestionIndexEntry;
  passage: RcSearchPassage;
  snippet: RcSearchSnippet | null;
}

export interface RcSearchResult {
  passages: RcSearchPassageResult[];
  questions: RcSearchQuestionResult[];
  totalPassages: number;
  totalQuestions: number;
}

const SNIPPET_RADIUS = 52;

export function normalizeRcSearchText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function questionFiltersActive(filters: RcSearchFilters): boolean {
  return (
    filters.families.length > 0 ||
    filters.questionTypes.length > 0 ||
    filters.features.length > 0 ||
    filters.questionDifficulties.length > 0
  );
}

export function passageMatchesFilters(
  passage: RcSearchPassage,
  filters: RcSearchFilters,
): boolean {
  if (passage.preptest < filters.preptestMin || passage.preptest > filters.preptestMax)
    return false;
  if (filters.topics.length && (!passage.topic || !filters.topics.includes(passage.topic)))
    return false;
  if (filters.formats.length && (!passage.format || !filters.formats.includes(passage.format)))
    return false;
  if (
    filters.frameworks.length &&
    !passage.frameworks.some((f) => filters.frameworks.includes(f))
  )
    return false;
  if (
    filters.passageDifficulties.length &&
    (passage.difficulty == null || !filters.passageDifficulties.includes(passage.difficulty))
  )
    return false;
  return true;
}

export function questionMatchesFilters(
  question: RcQuestionIndexEntry,
  filters: RcSearchFilters,
): boolean {
  if (filters.families.length && !filters.families.includes(question.questionTypeFamily))
    return false;
  if (filters.questionTypes.length && !filters.questionTypes.includes(question.questionType))
    return false;
  if (
    filters.features.length &&
    !question.features.some((f) => filters.features.includes(f))
  )
    return false;
  if (
    filters.questionDifficulties.length &&
    (question.difficulty == null || !filters.questionDifficulties.includes(question.difficulty))
  )
    return false;
  return true;
}

export function buildRcSearchSnippet(text: string, query: string): RcSearchSnippet | null {
  const normalizedText = normalizeRcSearchText(text);
  const normalizedQuery = normalizeRcSearchText(query);
  if (!normalizedText || !normalizedQuery) return null;

  const index = normalizedText.toLowerCase().indexOf(normalizedQuery.toLowerCase());
  if (index < 0) return null;

  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(
    normalizedText.length,
    index + normalizedQuery.length + SNIPPET_RADIUS,
  );

  return {
    before: `${start > 0 ? '… ' : ''}${normalizedText.slice(start, index)}`,
    match: normalizedText.slice(index, index + normalizedQuery.length),
    after: `${normalizedText.slice(index + normalizedQuery.length, end)}${
      end < normalizedText.length ? ' …' : ''
    }`,
  };
}

export function runRcSearch({
  passages,
  questions,
  query,
  filters,
  limit = 200,
}: {
  passages: RcSearchPassage[];
  questions: RcQuestionIndexEntry[];
  query: string;
  filters: RcSearchFilters;
  limit?: number;
}): RcSearchResult {
  const q = normalizeRcSearchText(query).toLowerCase();
  const questionLevel = questionFiltersActive(filters);

  const byPassage = new Map<number, RcQuestionIndexEntry[]>();
  for (const question of questions) {
    const list = byPassage.get(question.passageId);
    if (list) list.push(question);
    else byPassage.set(question.passageId, [question]);
  }

  const matchedPassages: RcSearchPassageResult[] = [];
  const matchedQuestions: RcSearchQuestionResult[] = [];

  for (const passage of passages) {
    if (!passageMatchesFilters(passage, filters)) continue;

    const matching = (byPassage.get(passage.passageId) ?? []).filter(
      (question) =>
        questionMatchesFilters(question, filters) &&
        (!q || (question.prompt ?? '').toLowerCase().includes(q)),
    );

    const titleMatched = q.length > 0 && (passage.title ?? '').toLowerCase().includes(q);

    if (questionLevel && matching.length === 0) continue;
    if (q && !titleMatched && matching.length === 0) continue;

    matchedPassages.push({
      passage,
      matchedQuestionCount: matching.length,
      titleMatched,
    });
    for (const question of matching) {
      matchedQuestions.push({
        question,
        passage,
        snippet: q ? buildRcSearchSnippet(question.prompt ?? '', query) : null,
      });
    }
  }

  return {
    passages: matchedPassages.slice(0, limit),
    questions: matchedQuestions.slice(0, limit),
    totalPassages: matchedPassages.length,
    totalQuestions: matchedQuestions.length,
  };
}
