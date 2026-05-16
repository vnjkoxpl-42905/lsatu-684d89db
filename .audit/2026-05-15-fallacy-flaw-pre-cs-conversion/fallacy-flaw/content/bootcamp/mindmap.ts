/**
 * Bootcamp mind-map · ported from NotebookLM artifact "LSAT Mindmap" generated
 * from the master guide. Five top-level branches; depth ≤ 4.
 */

export interface MindNode {
  name: string;
  children?: MindNode[];
}

export const BOOTCAMP_MINDMAP: MindNode = {
  name: 'LSAT Flaw Questions',
  children: [
    {
      name: 'Strategic Mindset',
      children: [
        { name: 'Aggressive Analysis' },
        { name: 'Translate Jargon' },
        { name: 'Binary Validity' },
        { name: 'Popping the Trunk' },
      ],
    },
    {
      name: 'The Three Languages',
      children: [
        {
          name: 'Assumption',
          children: [
            { name: 'Takes for granted' },
            { name: 'Two-Step Check' },
            { name: 'Negation Test' },
          ],
        },
        {
          name: 'Objection',
          children: [
            { name: 'Fails to consider' },
            { name: 'Overlooked possibilities' },
            { name: 'Weakener Test' },
          ],
        },
        {
          name: 'Description',
          children: [
            { name: 'Abstract language' },
            { name: 'Matching Test' },
            { name: 'Structural moves' },
          ],
        },
      ],
    },
    {
      name: 'Famous Flaws',
      children: [
        {
          name: 'Group 1 · Real Flaws',
          children: [
            { name: 'Causal Confusion' },
            { name: 'Necessary vs. Sufficient' },
            { name: 'Sampling Errors' },
            { name: 'Part vs. Whole' },
            { name: 'Unproven vs. False' },
            { name: 'Ad Hominem' },
          ],
        },
        {
          name: 'Group 2 · Distractors',
          children: [
            { name: 'Circular Reasoning' },
            { name: 'Equivocation' },
            { name: 'Internal Contradiction' },
            { name: 'Inappropriate Appeal' },
          ],
        },
        {
          name: 'Other Fallacies',
          children: [
            { name: 'False Dichotomy' },
            { name: 'Red Herring' },
            { name: 'Hasty Generalization' },
            { name: 'Straw Man' },
          ],
        },
      ],
    },
    {
      name: 'Hidden Weaknesses',
      children: [
        { name: 'Dangling Variables' },
        { name: 'Secret Value Judgments' },
        { name: 'Secret Downsides' },
        { name: 'Assumed Universal Goals' },
      ],
    },
    {
      name: 'Trap Answer Patterns',
      children: [
        { name: 'Too Strong' },
        { name: 'Bad Match' },
        { name: 'Reversed Logic' },
        { name: 'Wrong Flaw Label' },
        { name: 'Contradicted' },
      ],
    },
  ],
};
