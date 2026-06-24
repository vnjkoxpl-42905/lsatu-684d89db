import type { LRQuestion } from "@/lib/questionLoader";

export type SmartLRSearchQuestion = Pick<
  LRQuestion,
  "qid" | "pt" | "section" | "qnum" | "qtype" | "stimulus" | "questionStem"
>;

export interface SmartLRQuestionMatch {
  question: SmartLRSearchQuestion;
  snippet: SmartLRSearchSnippet;
}

export interface SmartLRSearchSnippet {
  before: string;
  match: string;
  after: string;
}

export interface SmartLRQuestionSearchFilters {
  pt?: number;
  section?: number;
  qnum?: number;
}

const SNIPPET_RADIUS = 92;

export function normalizeSmartLRSearchText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getSmartLRQuestionSearchText(question: SmartLRSearchQuestion): string {
  return normalizeSmartLRSearchText(
    [question.qid, question.stimulus ?? "", question.questionStem].join(" "),
  );
}

export function buildSmartLRSearchSnippet(
  text: string,
  query: string,
): SmartLRSearchSnippet | null {
  const normalizedText = normalizeSmartLRSearchText(text);
  const normalizedQuery = normalizeSmartLRSearchText(query);
  if (!normalizedText || !normalizedQuery) return null;

  const lowerText = normalizedText.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index < 0) return null;

  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(
    normalizedText.length,
    index + normalizedQuery.length + SNIPPET_RADIUS,
  );

  return {
    before: `${start > 0 ? "... " : ""}${normalizedText.slice(start, index)}`,
    match: normalizedText.slice(index, index + normalizedQuery.length),
    after: `${normalizedText.slice(index + normalizedQuery.length, end)}${
      end < normalizedText.length ? " ..." : ""
    }`,
  };
}

export function filterSmartLRQuestionMatches(
  questions: SmartLRSearchQuestion[],
  query: string,
  filters: SmartLRQuestionSearchFilters = {},
  limit = 6,
): SmartLRQuestionMatch[] {
  const normalizedQuery = normalizeSmartLRSearchText(query);
  if (!normalizedQuery) return [];

  const matches: SmartLRQuestionMatch[] = [];

  for (const question of questions) {
    if (filters.pt !== undefined && question.pt !== filters.pt) continue;
    if (filters.section !== undefined && question.section !== filters.section) continue;
    if (filters.qnum !== undefined && question.qnum !== filters.qnum) continue;

    const snippet = buildSmartLRSearchSnippet(
      getSmartLRQuestionSearchText(question),
      normalizedQuery,
    );
    if (!snippet) continue;

    matches.push({ question, snippet });
    if (matches.length >= limit) break;
  }

  return matches;
}
