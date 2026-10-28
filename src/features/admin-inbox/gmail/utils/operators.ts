const OPERATOR_PREFIXES = [
  "from:",
  "to:",
  "cc:",
  "bcc:",
  "subject:",
  "has:",
  "label:",
  "in:",
  "is:",
  "before:",
  "after:",
  "older_than:",
  "newer_than:",
  "filename:",
];

export function startsWithOperator(query: string): boolean {
  const trimmed = query.trimStart().toLowerCase();
  return OPERATOR_PREFIXES.some((op) => trimmed.startsWith(op));
}
