/**
 * Whimsical-evaluator — local-only classifier for Drill 3.6 designed-conclusion responses.
 *
 * v1 ships ONLY the keyword-overlap step. The MiniLM cosine-similarity step lives behind a
 * lazy-load gate (`evaluateWithMiniLM`) so the model bundle (~50 MB) does not hit the bundle
 * unless the user opts into semantic checks.
 *
 * Per architecture-plan §7. Three classifications: Valid, Invalid but interesting, Misses the
 * premises entirely. Outside-knowledge import → "Misses the premises entirely."
 */

export type Classification = 'Valid' | 'Invalid but interesting' | 'Misses the premises entirely';

export interface EvaluationInput {
  premise_pair: { p1: string; p2: string };
  student_text: string;
  valid_model: string;
  invalid_model: string;
}

export interface EvaluationResult {
  classification: Classification;
  reason: string;
  scores: {
    overlap_with_premises: number;
    overlap_with_valid_model: number;
    overlap_with_invalid_model: number;
  };
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'do', 'does', 'for', 'from', 'has', 'have',
  'in', 'is', 'it', 'its', 'no', 'not', 'of', 'on', 'or', 'so', 'that', 'the', 'this', 'to', 'was',
  'will', 'with', 'who', 'whom', 'which', 'all', 'any', 'every', 'each', 'must', 'should', 'cannot',
  'can', 'may', 'might', 'would', 'only', 'always', 'never',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function overlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const matches = a.filter((w) => setB.has(w)).length;
  return matches / a.length;
}

const PREMISE_OVERLAP_FLOOR = 0.30; // below = outside-knowledge
const MODEL_OVERLAP_HIGH = 0.40;

export function evaluateDesignedConclusion(input: EvaluationInput): EvaluationResult {
  const studentTokens = tokenize(input.student_text);
  const premiseTokens = tokenize(`${input.premise_pair.p1} ${input.premise_pair.p2}`);
  const validTokens = tokenize(input.valid_model);
  const invalidTokens = tokenize(input.invalid_model);

  const premiseOverlap = overlap(studentTokens, premiseTokens);
  const validOverlap = overlap(studentTokens, validTokens);
  const invalidOverlap = overlap(studentTokens, invalidTokens);

  // Step 1 — outside-knowledge guard.
  if (premiseOverlap < PREMISE_OVERLAP_FLOOR) {
    return {
      classification: 'Misses the premises entirely',
      reason: `Premise-keyword overlap ${(premiseOverlap * 100).toFixed(0)}% is below the ${PREMISE_OVERLAP_FLOOR * 100}% floor — likely outside-knowledge import.`,
      scores: {
        overlap_with_premises: premiseOverlap,
        overlap_with_valid_model: validOverlap,
        overlap_with_invalid_model: invalidOverlap,
      },
    };
  }

  // Step 2 — match against valid vs invalid model.
  if (validOverlap >= invalidOverlap && validOverlap >= MODEL_OVERLAP_HIGH) {
    return {
      classification: 'Valid',
      reason: `High overlap with the valid model (${(validOverlap * 100).toFixed(0)}%).`,
      scores: {
        overlap_with_premises: premiseOverlap,
        overlap_with_valid_model: validOverlap,
        overlap_with_invalid_model: invalidOverlap,
      },
    };
  }
  if (invalidOverlap > validOverlap && invalidOverlap >= MODEL_OVERLAP_HIGH) {
    return {
      classification: 'Invalid but interesting',
      reason: `Higher overlap with the invalid model (${(invalidOverlap * 100).toFixed(0)}%) than the valid one — looks like a logical mistake the premises don't license.`,
      scores: {
        overlap_with_premises: premiseOverlap,
        overlap_with_valid_model: validOverlap,
        overlap_with_invalid_model: invalidOverlap,
      },
    };
  }

  // Default: tokens overlap with premises but not strongly with either model.
  return {
    classification: 'Misses the premises entirely',
    reason: `Inside the premise universe but neither model lights up — restate the premises before drawing the conclusion.`,
    scores: {
      overlap_with_premises: premiseOverlap,
      overlap_with_valid_model: validOverlap,
      overlap_with_invalid_model: invalidOverlap,
    },
  };
}

/**
 * Lazy MiniLM evaluator. NOT bundled by default — only loads when called, and only on this route.
 * v1 leaves this stubbed; Phase D wires the actual transformers.js call when the team is ready
 * to ship the ~50MB model.
 */
export async function evaluateWithMiniLM(_input: EvaluationInput): Promise<EvaluationResult> {
  throw new Error(
    'MiniLM evaluator not yet enabled in v1. Run `npm install @xenova/transformers` and uncomment the import in src/lib/ai-templates/whimsical-evaluator.ts to enable.',
  );
}
