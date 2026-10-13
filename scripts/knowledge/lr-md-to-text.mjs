// Deterministic Markdown -> plain-text derivation used by the LR knowledge
// generator. Keep this pure and stable; any change here bumps source_version.
//
// Rules (in order):
//   1. Strip fenced code fences (```lang ... ```) but keep the interior lines
//      verbatim. The language label is dropped, never emitted as text.
//   2. Remove leading list markers ("- ", "* ", "1. ", "2. " ...) from each
//      line while preserving the remaining text.
//   3. Preserve every other character (including "#", so "#1" stays "#1").
//   4. Collapse runs of whitespace (spaces, tabs, newlines) into a single
//      space. Trim leading/trailing whitespace.
export function markdownToPlainText(md) {
  if (typeof md !== "string") throw new TypeError("markdownToPlainText: expected string");
  // 1. Drop fenced code fences, keep inner content
  let s = md.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (_m, body) => body);
  // 2. Strip list markers per line
  s = s.split("\n").map((line) => line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")).join("\n");
  // 4. Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function buildEmbeddingText(rec, bodyText) {
  const headingPath = Array.isArray(rec.heading_path) ? rec.heading_path : [];
  const et = rec.entity_type === "reasoning_type" ? "Reasoning Type" : "Question Type";
  const label = headingPath[1] ?? rec.entity_key ?? "";
  const section = headingPath[headingPath.length - 1] ?? rec.section_key ?? "";
  const path = headingPath.join(" > ");
  return [
    "LSAT Logical Reasoning shared knowledge layer",
    "Authority: canonical source",
    `${et}: ${label}`,
    `Section: ${section}`,
    `Path: ${path}`,
    "",
    bodyText,
  ].join("\n");
}
