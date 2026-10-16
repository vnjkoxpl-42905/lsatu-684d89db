// Structured relationship answer keys (Spot the Relationship). Read only from
// the trusted, server-built canonical payload. Pure, so it runs under Deno in
// the Edge Function and under Vitest unchanged.

export type RelationshipType = "conditional" | "causal" | "comparative";
export interface KeyedRelationship {
  type: RelationshipType;
  indicators: string[];
  required_parts?: string[][];
  connects: string;
  why: string;
}
export interface AnswerKey {
  relationships: KeyedRelationship[];
  traps: string[];
  context_benchmark: string | null;
}

const TYPES = new Set(["conditional", "causal", "comparative"]);
const text = (v: unknown, max = 2000) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

/**
 * Returns the validated key, null when the payload carries no key (legacy
 * activities and historical snapshots), or throws when a key is present but
 * malformed. A malformed upgraded key must never reach the provider.
 */
export function readAnswerKey(raw: unknown): AnswerKey | null {
  if (raw === undefined || raw === null) return null;
  const bad = () => { throw new Error("Malformed answer key"); };
  if (typeof raw !== "object" || Array.isArray(raw)) bad();
  const k = raw as Record<string, unknown>;
  const rels = k.relationships;
  if (!Array.isArray(rels) || rels.length < 1 || rels.length > 3) bad();
  const seen = new Set<string>();
  const relationships = (rels as unknown[]).map((r) => {
    const o = r as Record<string, unknown>;
    if (!o || typeof o !== "object" || !TYPES.has(o.type as string) || seen.has(o.type as string)) bad();
    seen.add(o.type as string);
    if (!Array.isArray(o.indicators) || !o.indicators.length || !o.indicators.every((x) => text(x, 200))) bad();
    if (!text(o.connects) || !text(o.why)) bad();
    if (o.required_parts !== undefined && (!Array.isArray(o.required_parts) || !o.required_parts.length
      || !o.required_parts.every((p) => Array.isArray(p) && p.length >= 2 && p.every((x) => text(x, 200))))) bad();
    return o as unknown as KeyedRelationship;
  });
  if (!Array.isArray(k.traps) || !k.traps.every((t) => text(t))) bad();
  if (k.context_benchmark !== null && k.context_benchmark !== undefined && !text(k.context_benchmark)) bad();
  void relationships;
  // Pass the trusted key through verbatim so the model sees exactly what the
  // receipt hashed.
  return raw as AnswerKey;
}

/** Upgraded rules win; returns null when absent; throws when present but malformed. */
export function readGradingRubric(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw) || !raw.length || raw.length > 50 || !raw.every((r) => text(r, 4000))) {
    throw new Error("Malformed grading rubric");
  }
  return raw as string[];
}

const TYPE_WORDS: Record<RelationshipType, RegExp> = {
  conditional: /\bcondition(?:al|s)?\b|\bif\s*[-/]?\s*then\b/i,
  causal: /\bcaus(?:al|e|es|ation|ality)\b/i,
  comparative: /\bcompar(?:ative|ison|isons|e)\b/i,
};
const norm = (s: string) => s.toLowerCase().replace(/[‘’“”"'`*]/g, " ").replace(/[-_/]/g, " ").replace(/\s+/g, " ");
const has = (hay: string, needle: string) => new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(hay);

// Everyday words ("so", "if") leak when quoted or explicitly singled out.
const COMMON = new Set(["so", "if", "when", "since", "as", "than", "because", "unless", "whenever"]);
const quoted = (raw: string, p: string) => new RegExp("[\"'‘“*`]\\s*" + p + "\\s*[\"'’”*`]", "i").test(raw);
// Common words are harmless in ordinary prose, but naming one as the answer
// discloses it even without quotation marks.
const singledOut = (feedback: string, p: string) => {
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(?:indicator|signal|keyword|word|phrase|answer)(?:\\s+words?)?\\s*(?:(?:is|are|was|would be)\\s+|[:=]\\s*)${escaped}\\b|\\b(?:look for|quote|use|notice|identify|spot|focus on)\\s+(?:the\\s+(?:word|phrase|indicator)\\s+)?${escaped}\\b|\\b${escaped}\\s+(?:is|acts as|serves as)\\s+(?:the\\s+|an?\\s+)?(?:indicator|signal|keyword)\\b`, "i").test(norm(feedback));
};

/**
 * First-attempt hint boundary. A first unsuccessful hint must not quote a key
 * indicator the student has not already written, nor name a type the student
 * has not already named (that would list the missing types).
 */
export function hintLeaks(feedback: string, studentResponse: string, key: AnswerKey): boolean {
  const f = norm(feedback), s = norm(studentResponse);
  for (const r of key.relationships) {
    const phrases = [...r.indicators, ...(r.required_parts ?? []).flat()]
      .flatMap((x) => x.split(/…|\.\.\./)).map((x) => norm(x).trim()).filter((x) => x.length >= 2);
    if (phrases.some((p) => !has(s, p) && (COMMON.has(p) ? quoted(feedback, p) || singledOut(feedback, p) : has(f, p)))) return true;
    if (TYPE_WORDS[r.type].test(feedback) && !TYPE_WORDS[r.type].test(studentResponse)) return true;
  }
  return false;
}

export const SAFE_FIRST_HINT =
  "Check each relationship you name against the exact words in the sentence that create it. Then reread the sentence for anything you have not yet named.";
