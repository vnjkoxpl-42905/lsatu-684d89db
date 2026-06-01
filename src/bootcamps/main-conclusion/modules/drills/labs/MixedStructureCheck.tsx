/**
 * Final Mixed Structure Check — capstone drill that gates the Simulator.
 * Reuses the ArgumentStructureLab mechanic with a shuffled, mixed pool.
 */

import { useMemo } from 'react';
import { FIRST_SENTENCE_QUESTIONS, REBUTTAL_QUESTIONS } from '@/bootcamps/main-conclusion/content/newDrills.source';
import { ArgumentStructureLab } from './ArgumentStructureLab';

/**
 * Deterministic interleave: take questions alternately from first/rebuttal pools
 * so students cannot lean on the streak. Same order every visit — no Date.now.
 */
function interleave() {
  const out: typeof FIRST_SENTENCE_QUESTIONS = [];
  const max = Math.max(FIRST_SENTENCE_QUESTIONS.length, REBUTTAL_QUESTIONS.length);
  for (let i = 0; i < max; i++) {
    if (REBUTTAL_QUESTIONS[i]) out.push(REBUTTAL_QUESTIONS[i]!);
    if (FIRST_SENTENCE_QUESTIONS[i]) out.push(FIRST_SENTENCE_QUESTIONS[i]!);
  }
  return out;
}

export function MixedStructureCheck() {
  const pool = useMemo(interleave, []);
  return (
    <ArgumentStructureLab
      drillId="MC-DRL-MIX"
      eyebrow="Drill · Mixed Structure Check"
      title="Capstone mixed-structure check"
      description="First-sentence and rebuttal items shuffled together. Clear this drill to unlock the Simulator."
      questions={pool}
    />
  );
}
