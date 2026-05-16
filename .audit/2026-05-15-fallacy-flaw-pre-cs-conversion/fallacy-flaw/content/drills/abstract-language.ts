import type { DrillItem } from '../../types/drill';

/**
 * Abstract Flaw Language Drill · 2 sets × 10 questions.
 * Source: Homework_Abstract Flaw Sets1 & 2.docx — explains the mechanic but
 * leaves question slots blank. GAP 2 from §10 of the build brief: BUILD-AGENT
 * INVENTED. Targeted drill on Match-language answer choices.
 *
 * Selection criteria for fill-in:
 *  · Correct answer uses Match-language verbs
 *    ("concludes... on the basis of", "infers... that", "confuses... with",
 *    "treats... as").
 *  · Difficulty: Set 1 ≈ level 7-8, Set 2 ≈ level 9-10.
 *  · Span all 15 catalog flaws to cover the catalog evenly.
 *  · Pull from PT 100+ to keep the bank modern.
 */

const stub = (set: 1 | 2, n: number): DrillItem => ({
  id: `abs-${set}-${n}`,
  cite: `Abstract Set ${set} · Q${n}`,
  invented: true,
});

export const abstractSet1: DrillItem[] = Array.from({ length: 10 }, (_, i) => stub(1, i + 1));
export const abstractSet2: DrillItem[] = Array.from({ length: 10 }, (_, i) => stub(2, i + 1));
