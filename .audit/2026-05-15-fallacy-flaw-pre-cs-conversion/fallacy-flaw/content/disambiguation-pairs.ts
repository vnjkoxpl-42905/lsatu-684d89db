export interface DisambiguationPair {
  pair: string;
  similar: string;
  distinction: string;
  ask: string;
}

export const disambiguationPairs: DisambiguationPair[] = [
  {
    pair: 'Necessary vs. Sufficient ↔ Causal',
    similar: 'Both involve a relationship that gets reasoned about wrong.',
    distinction: 'Logical condition (if-then) → Necessary vs. Sufficient. Cause-and-effect → Causal.',
    ask: 'Is the relationship a logical condition or a real-world cause?',
  },
  {
    pair: 'Sampling ↔ Hasty Generalization',
    similar: 'Both generalize from limited evidence.',
    distinction: 'SIZE problem → Hasty Generalization. SELECTION-method problem → biased Sampling. (Hasty Generalization is a subtype of Sampling.)',
    ask: 'Is the problem the size, the selection method, or both?',
  },
  {
    pair: 'Sleight of Hand ↔ Equivocation',
    similar: 'Both falsely equate concepts via language.',
    distinction: 'SAME word with shifting meaning → Equivocation. TWO DIFFERENT words treated as equivalent → Sleight of Hand.',
    ask: 'Same word being used twice, or two different words being treated as equivalent?',
  },
  {
    pair: 'Sleight of Hand ↔ Value Assumption',
    similar: 'Both involve a conclusion concept the premises didn’t establish.',
    distinction: 'EVALUATIVE term in the conclusion → Value Assumption. Otherwise → Sleight of Hand.',
    ask: 'Is the new conclusion-term a moral / appropriate / should word?',
  },
  {
    pair: 'Ad Hominem ↔ Unproven vs. Proven False',
    similar: 'Both involve dismissing a claim.',
    distinction: 'Attack on the SOURCE → Ad Hominem. Attack on the EVIDENCE or lack thereof → Unproven vs. Proven False.',
    ask: 'What’s being attacked — the speaker or the evidence?',
  },
  {
    pair: 'Part vs. Whole ↔ Sampling',
    similar: 'Both move scope.',
    distinction: 'SAMPLE → POPULATION = Sampling. PART → WHOLE / WHOLE → PART = Part vs. Whole.',
    ask: 'Sample-to-population or part-to-whole?',
  },
  {
    pair: 'Sleazy Sales Pitch ↔ Secret Downsides',
    similar: 'Both hide negatives.',
    distinction: 'COMPARISON between two options → Sleazy Sales Pitch. Promotes ONE option → Secret Downsides.',
    ask: 'Is this a comparison or a single-option pitch?',
  },
  {
    pair: 'Causal ↔ Sleight of Hand',
    similar: 'Both involve the conclusion overreaching the premises.',
    distinction: 'Conclusion claims CAUSATION → Causal. Conclusion introduces a NEW concept → Sleight of Hand.',
    ask: 'Is the new claim about cause-and-effect, or about a new term entirely?',
  },
  {
    pair: 'Equivocation ↔ Necessary vs. Sufficient',
    similar: 'Both can hide inside a conditional argument.',
    distinction: 'SAME conditional term used inconsistently → Equivocation. Conditional logic moves done backwards → Necessary vs. Sufficient.',
    ask: 'Are the terms in the conditional defined consistently?',
  },
  {
    pair: 'Universal Desires ↔ Value Assumption',
    similar: 'Both involve unjustified normative claims.',
    distinction: 'About what people WANT → Universal Desires. About whether something IS good/moral/appropriate → Value Assumption.',
    ask: 'Is the unjustified claim about desires or about values?',
  },
];
