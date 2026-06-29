import type { LRQuestion } from "@/lib/questionLoader";

export type SmartLRSearchQuestion = Pick<
  LRQuestion,
  "qid" | "pt" | "section" | "qnum" | "qtype" | "difficulty" | "stimulus" | "questionStem"
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
  pts?: number[];
  sections?: number[];
  qtypes?: string[];
  difficulties?: number[];
}

const SNIPPET_RADIUS = 52;

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

function buildSmartLRQuestionSnippet(
  question: SmartLRSearchQuestion,
  query: string,
): SmartLRSearchSnippet | null {
  const textFields = [question.stimulus ?? "", question.questionStem];

  for (const field of textFields) {
    const snippet = buildSmartLRSearchSnippet(field, query);
    if (snippet) return snippet;
  }

  const qidSnippet = buildSmartLRSearchSnippet(question.qid, query);
  if (qidSnippet) return qidSnippet;

  return null;
}

export function filterSmartLRQuestionMatches(
  questions: SmartLRSearchQuestion[],
  query: string,
  filters: SmartLRQuestionSearchFilters = {},
  limit = 6,
): SmartLRQuestionMatch[] {
  const normalizedQuery = normalizeSmartLRSearchText(query);

  const matches: SmartLRQuestionMatch[] = [];

  for (const question of questions) {
    if (filters.pt !== undefined && question.pt !== filters.pt) continue;
    if (filters.section !== undefined && question.section !== filters.section) continue;
    if (filters.qnum !== undefined && question.qnum !== filters.qnum) continue;
    if (filters.pts?.length && !filters.pts.includes(question.pt)) continue;
    if (filters.sections?.length && !filters.sections.includes(question.section)) continue;
    if (filters.qtypes?.length && !filters.qtypes.includes(question.qtype)) continue;
    if (filters.difficulties?.length && !filters.difficulties.includes(question.difficulty)) continue;

    const snippet = normalizedQuery
      ? buildSmartLRQuestionSnippet(question, normalizedQuery)
      : { before: "", match: question.qid, after: "" };
    if (!snippet) continue;

    matches.push({ question, snippet });
    if (matches.length >= limit) break;
  }

  return matches;
}
