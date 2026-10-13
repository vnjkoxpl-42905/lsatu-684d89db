export interface DisguiseMechanic {
  number: number;
  name: string;
  description: string;
  examples: { trigger: string; maps: string }[];
}

export const disguiseMechanics: DisguiseMechanic[] = [
  {
    number: 1,
    name: 'Abstract verb substitution',
    description:
      'The LSAT replaces the flaw’s name with an abstract action verb. Pattern: [verb] [flaw concept abstracted into a noun phrase].',
    examples: [
      { trigger: '"Conflates" / "Treats as equivalent" / "Fails to distinguish between"', maps: 'Sleight of Hand or Equivocation' },
      { trigger: '"Generalizes" / "Extrapolates" / "Infers from a small set"', maps: 'Sampling' },
      { trigger: '"Confuses" / "Mistakes" / "Treats... as if"', maps: 'Necessary vs. Sufficient or Causal' },
      { trigger: '"Presupposes" / "Assumes" / "Takes for granted"', maps: 'Any Assumption-language flaw' },
      { trigger: '"Fails to rule out" / "Fails to consider" / "Ignores"', maps: 'Objection-language for any flaw' },
    ],
  },
  {
    number: 2,
    name: 'Inverted formal description',
    description:
      'The LSAT describes the flaw by stating what the argument should have done, framed in formal language. Recognize that the argument failed to do exactly the thing being described.',
    examples: [
      { trigger: '"Treats a condition that ensures the truth of another condition for one that is necessary..."', maps: 'Necessary vs. Sufficient' },
      { trigger: '"Treats the failure to establish that a certain claim is false as equivalent to a demonstration that that claim is true."', maps: 'Unproven vs. Proven False' },
      { trigger: '"Fails to rule out the possibility that what appears to be the result of a given condition may in fact be the cause of that condition."', maps: 'Causal (reverse causation)' },
    ],
  },
  {
    number: 3,
    name: 'Specific-noun camouflage',
    description:
      'The LSAT references the SPECIFIC nouns of the stimulus rather than the abstract category. Mentally translate from "the policies" or "the report" to "the term Y" or "the population claim."',
    examples: [
      { trigger: '"It is assumed that what is true of persons individually is true of a country as a whole."', maps: 'Part vs. Whole' },
      { trigger: '"Generalizes from a sample that is unlikely to be representative of public sentiment."', maps: 'Sampling' },
      { trigger: '"Casts doubt on the reliability of a study by questioning the motives of those reporting it."', maps: 'Ad Hominem' },
    ],
  },
  {
    number: 4,
    name: 'Half-truth misdirection',
    description:
      'The LSAT describes a flaw the argument almost commits, but doesn’t quite. Verify the flaw is actually present (Trap 4 Wrong Flaw, Trap 5 Contradicted).',
    examples: [
      { trigger: '"Confuses correlation with causation" — when the stimulus didn’t actually invoke causation.', maps: 'Default-skeptical: scan stimulus for causal claim before selecting.' },
      { trigger: '"Argues from a biased sample" — when no sampling actually occurred.', maps: 'Same scan.' },
      { trigger: '"Attacks the source rather than the argument" — when the source’s bias is actually relevant evidence.', maps: 'Same scan.' },
    ],
  },
  {
    number: 5,
    name: 'Compound disguise',
    description: 'Two flaws stitched into one answer. Verify BOTH halves are present.',
    examples: [
      { trigger: '"Both relies on a sample that is too small AND fails to consider third-variable explanations"', maps: 'Sampling + Causal — both must be present' },
      { trigger: '"Treats a sufficient condition as if it were necessary AND assumes that what holds in one case holds in all cases"', maps: 'Necessary vs. Sufficient + Hasty Generalization — both must be present' },
    ],
  },
];
