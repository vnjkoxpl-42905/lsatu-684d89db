/** Explicit native identities. These are filtered rounds, not disjoint question pools. */
export const CONDITIONAL_GUIDED_SETS = [
  ['w2-04-conditional-logic-easier-set-1', 'Conditional Logic (Easier) Set 1', 'easier', 'conditional-logic-drill-one'],
  ['w3-12-conditional-logic-easier-set-2', 'Conditional Logic (Easier) Set 2', 'easier', 'conditional-logic-drill-two'],
  ['w5-02-conditional-logic-easier-set-4', 'Conditional Logic (Easier) Set 4', 'easier', 'conditional-logic-drill-four'],
  ['w5-09-conditional-logic-medium-set-1', 'Conditional Logic (Medium) Set 1', 'medium', 'conditional-logic-medium-drill-one'],
  ['w5-13-conditional-logic-medium-set-2', 'Conditional Logic (Medium) Set 2', 'medium', 'conditional-logic-medium-drill-two'],
  ['w7-04-conditional-logic-medium-set-3', 'Conditional Logic (Medium) Set 3', 'medium', 'conditional-logic-medium-drill-three'],
  ['w7-08-conditional-logic-medium-set-4', 'Conditional Logic (Medium) Set 4', 'medium', 'conditional-logic-medium-drill-four'],
  ['w8-04-conditional-logic-medium-set-5', 'Conditional Logic (Medium) Set 5', 'medium', 'conditional-logic-medium-drill-five'],
  ['w8-02-conditional-logic-medium-set-6', 'Conditional Logic (Medium) Set 6', 'medium', 'conditional-logic-medium-drill-six'],
  ['w9-05-conditional-logic-harder-set-1', 'Conditional Logic (Harder) Set 1', 'harder', 'conditional-logic-harder-drill-one'],
  ['w10-01-conditional-logic-harder-set-2', 'Conditional Logic (Harder) Set 2', 'harder', 'conditional-logic-harder-drill-two'],
  ['w10-05-conditional-logic-harder-set-3', 'Conditional Logic (Harder) Set 3', 'harder', 'conditional-logic-harder-drill-three'],
  ['w12-03-conditional-logic-harder-set-4', 'Conditional Logic (Harder) Set 4', 'harder', 'conditional-logic-harder-drill-four'],
].map(([slug, title, band, manifestSlug]) => ({ slug, title, band, manifestSlug }));

export function conditionalGuidedSet(slug: string) {
  return CONDITIONAL_GUIDED_SETS.find(set => set.slug === slug || set.manifestSlug === slug);
}
