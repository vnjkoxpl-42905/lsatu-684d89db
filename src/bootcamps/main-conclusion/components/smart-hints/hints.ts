/**
 * Smart Hints registry — surface-specific 1-3 hints per page.
 * Each hint reveals progressively (Hint 1 → Hint 2 → Hint 3 → answer reveal).
 * Voice register 1 (procedural).
 */

export interface HintSet {
  surface_id: string;
  hints: string[]; // ordered, increasing in directness
}

export const HINT_REGISTRY: HintSet[] = [
  {
    surface_id: 'MC-DRL-3.1',
    hints: [
      'Read the highlighted word, then read what comes after it. Does the word INTRODUCE that clause or merely sit beside it?',
      'Concession words (granted, although, while) sit at the start of a sentence and signal "I see your view, but…"',
      'Pivot words (but, however, yet) signal a turn from concession to claim. The conclusion is on the other side.',
    ],
  },
  {
    surface_id: 'MC-DRL-3.4',
    hints: [
      'First-sentence stimuli state the claim, then support. Rebuttal stimuli state someone else’s view, then refute.',
      'Look for the pivot. If you can find a "but," "however," or "they are wrong," you are in Rebuttal family.',
      'If the first sentence sounds like the author’s recommendation or prediction with no opposing view set up, you are in First-sentence family.',
    ],
  },
  {
    surface_id: 'MC-SIM-Q1',
    hints: [
      'The vision-test stimulus opens with the recommendation. The next three sentences are support.',
      'Run the 2-Part Conclusion Check on each candidate answer. Most distractors fail part 2 (no support inside the stimulus).',
    ],
  },
  {
    surface_id: 'MC-LSN-1.7',
    hints: [
      'The Stegosaurus Interrogation: ask "How do I know that?" of every sentence. If the answer is "another sentence in this stimulus," you found support.',
      'Premises support; intermediate conclusions both support AND are supported; the main conclusion is only supported.',
    ],
  },
];

export function findHints(surfaceId: string | null | undefined): string[] {
  if (!surfaceId) return [];
  return HINT_REGISTRY.find((s) => s.surface_id === surfaceId)?.hints ?? [];
}
