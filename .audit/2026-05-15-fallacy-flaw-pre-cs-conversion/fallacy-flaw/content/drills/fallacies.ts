import type { DrillItem } from '../../types/drill';

/**
 * Famous Fallacies Dual-Task Drill · 40 questions.
 * Source: Fallacy Homework.md (older PTs) + _scan_Fallacy_Homework.pdf (modern PTs).
 *
 * Mechanic: name the flaw in the stimulus AND label every answer choice for
 * fallacies present.
 *
 * Items below are scaffolded with PT cites; full stimulus + choice transcripts
 * are GAP 1 from §10 of the build brief: BUILD-AGENT INVENTED. Fill in next pass.
 */
export const fallacies: DrillItem[] = Array.from({ length: 40 }, (_, i) => ({
  id: `fal-${i + 1}`,
  cite: `Fallacy HW · Q${i + 1}`,
  invented: true,
}));
