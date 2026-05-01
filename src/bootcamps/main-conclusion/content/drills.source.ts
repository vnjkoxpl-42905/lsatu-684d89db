/**
 * Drill content — sample-tier authoring for Phase C engine wiring.
 * Stage 1 (3.1–3.4) authored at Phase C.
 * Stage 2 (3.1–3.4) authored at Gate 5 additive pass (2026-05-01).
 * Stages 3–4 stub pending future C.10 authoring (Stage 4 of 3.4 reuses canonical 20).
 *
 * This file is hand-authored. Pipeline parity-verifies it like lessons + calibration
 * (per JOSHUA DIRECTIVE 2026-04-30 scope split).
 */

// ── Common types ─────────────────────────────────────────────────────────────
export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';

export interface IndicatorIdQuestion {
  id: string;
  prompt: string;
  text: string; // sentence with the indicator inline
  highlighted_word: string;
  category_options: ('conclusion' | 'premise' | 'pivot' | 'concession' | 'opposing' | 'opinion')[];
  correct_category: 'conclusion' | 'premise' | 'pivot' | 'concession' | 'opposing' | 'opinion';
  rationale: string;
}

export interface XRayQuestion {
  id: string;
  prompt: string;
  stimulus: string;
  candidates: { letter: Letter; text: string; is_correct: boolean }[];
  rationale: string;
}

export interface FirstSentenceQuestion {
  id: string;
  prompt: string;
  stimulus: string;
  is_first_sentence_conclusion: boolean;
  rationale: string;
}

export interface FamilyQuestion {
  id: string;
  prompt: string;
  stimulus: string;
  family: 'First-sentence' | 'Rebuttal';
  rationale: string;
}

export interface ChainMappingQuestion {
  id: string;
  prompt: string;
  stimulus: string;
  layers: {
    main_conclusion: string;
    intermediate_conclusion?: string;
    premises: string[];
  };
}

export interface PronounReplacementQuestion {
  id: string;
  candidate_conclusion: string;
  pronoun: string;
  acceptable_replacements: string[];
  rationale: string;
}

export interface DesignConclusionQuestion {
  id: string;
  premise_pair: { p1: string; p2: string };
  valid_model: string;
  invalid_model: string;
  diagnostic_messages: {
    valid_match: string;
    invalid_but_interesting: string;
    misses_the_premises: string;
  };
}

export interface RrPassage {
  id: string;
  title: string;
  passage: string;
  key_phrases: string[]; // hint set; the user's restate should overlap with these
}

export interface NestedClaimsQuestion {
  id: string;
  prompt: string;
  stimulus: string;
  candidates: { letter: Letter; text: string; is_main: boolean; role: 'main' | 'intermediate' | 'premise' }[];
  rationale: string;
}

// ── Drill 3.1 · Indicator Word ID (Stage 1) ──────────────────────────────────
export const DRILL_3_1_STAGE_1: IndicatorIdQuestion[] = [
  {
    id: 'D31-S1-Q1',
    prompt: 'Which category does the highlighted word belong to?',
    text: 'The proposal should be rejected, since it has failed in three pilot programs.',
    highlighted_word: 'since',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'premise',
    rationale: '"Since" introduces support — it’s the S in FABS.',
  },
  {
    id: 'D31-S1-Q2',
    prompt: 'Which category does the highlighted word belong to?',
    text: 'Granted, the program had setbacks. But its long-term outcomes justify continued funding.',
    highlighted_word: 'Granted',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'concession',
    rationale: '"Granted" is the canonical concession opener — the author is briefly inhabiting the opposing view.',
  },
  {
    id: 'D31-S1-Q3',
    prompt: 'Which category does the highlighted word belong to?',
    text: 'The data is compelling. However, the conclusion drawn from it overreaches.',
    highlighted_word: 'However',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'pivot',
    rationale: '"However" is the pivot — the author’s actual claim follows it.',
  },
  {
    id: 'D31-S1-Q4',
    prompt: 'Which category does the highlighted word belong to?',
    text: 'Therefore, the policy should be repealed.',
    highlighted_word: 'Therefore',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'conclusion',
    rationale: '"Therefore" introduces a conclusion. The claim follows it.',
  },
  {
    id: 'D31-S1-Q5',
    prompt: 'Which category does the highlighted word belong to?',
    text: 'Critics argue that the bill is too vague.',
    highlighted_word: 'Critics argue',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'opposing',
    rationale: '"Critics argue" attributes a view to others — that view is not the author’s.',
  },
];

// ── Drill 3.2 · X-Ray Drill (Stage 1) ────────────────────────────────────────
export const DRILL_3_2_STAGE_1: XRayQuestion[] = [
  {
    id: 'D32-S1-Q1',
    prompt: 'Which sentence in the stimulus is the conclusion?',
    stimulus:
      'The new transit policy should be expanded. Pilot data shows ridership up 22%. Maintenance costs have stayed flat. Adjacent districts have asked to opt in.',
    candidates: [
      { letter: 'A', text: 'The new transit policy should be expanded.', is_correct: true },
      { letter: 'B', text: 'Pilot data shows ridership up 22%.', is_correct: false },
      { letter: 'C', text: 'Maintenance costs have stayed flat.', is_correct: false },
      { letter: 'D', text: 'Adjacent districts have asked to opt in.', is_correct: false },
    ],
    rationale: 'First sentence is the recommendation. The next three are support.',
  },
  {
    id: 'D32-S1-Q2',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'It is true that the climate proposal is expensive. But the alternative is decades of compounding damage. We should adopt it.',
    candidates: [
      { letter: 'A', text: 'It is true that the climate proposal is expensive.', is_correct: false },
      { letter: 'B', text: 'But the alternative is decades of compounding damage.', is_correct: false },
      { letter: 'C', text: 'We should adopt it.', is_correct: true },
    ],
    rationale: 'Concession → pivot → claim. The recommendation is the third sentence.',
  },
  {
    id: 'D32-S1-Q3',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'Since the studies were funded by the manufacturer, their results should be treated cautiously.',
    candidates: [
      { letter: 'A', text: 'Since the studies were funded by the manufacturer.', is_correct: false },
      { letter: 'B', text: 'Their results should be treated cautiously.', is_correct: true },
    ],
    rationale: '"Since" is FABS — what follows it is support; the conclusion comes after.',
  },
  {
    id: 'D32-S1-Q4',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'No fiscal-restraint argument should override basic public-health protections. While cost matters, lives matter more.',
    candidates: [
      { letter: 'A', text: 'No fiscal-restraint argument should override basic public-health protections.', is_correct: true },
      { letter: 'B', text: 'While cost matters, lives matter more.', is_correct: false },
    ],
    rationale: 'First sentence is the claim. The second is support.',
  },
  {
    id: 'D32-S1-Q5',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'Many believe the city should privatize trash collection. They are mistaken. Privatization in nearby cities raised costs without improving service.',
    candidates: [
      { letter: 'A', text: 'Many believe the city should privatize trash collection.', is_correct: false },
      { letter: 'B', text: 'They are mistaken.', is_correct: true },
      { letter: 'C', text: 'Privatization in nearby cities raised costs without improving service.', is_correct: false },
    ],
    rationale: 'Opposing view → flat rebuttal → support. "They are mistaken" is the claim.',
  },
];

// ── Drill 3.3 · First-Sentence Reading (Stage 1) ─────────────────────────────
export const DRILL_3_3_STAGE_1: FirstSentenceQuestion[] = [
  {
    id: 'D33-S1-Q1',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'We should phase out single-use plastic bags. They take centuries to decompose, and most are never recycled.',
    is_first_sentence_conclusion: true,
    rationale: 'Recommendation in sentence one; support in sentence two.',
  },
  {
    id: 'D33-S1-Q2',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Many people think solar panels degrade quickly. This is false; field data shows minimal degradation over 25 years.',
    is_first_sentence_conclusion: false,
    rationale: 'First sentence is the opposing view. The author’s claim is "This is false."',
  },
  {
    id: 'D33-S1-Q3',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Public libraries deserve more funding. They serve as cooling centers, employment-counseling hubs, and after-school care for low-income families.',
    is_first_sentence_conclusion: true,
    rationale: 'First sentence is the claim. The rest enumerates support.',
  },
  {
    id: 'D33-S1-Q4',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Studies have shown that exercise reduces anxiety. Therefore, doctors should recommend regular physical activity to patients with anxiety disorders.',
    is_first_sentence_conclusion: false,
    rationale: 'First sentence is support. The conclusion ("doctors should recommend...") follows "Therefore."',
  },
  {
    id: 'D33-S1-Q5',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Driverless vehicles will not be widely adopted within a decade. The technology is reliable in clear weather but still fails in snow, fog, and heavy rain.',
    is_first_sentence_conclusion: true,
    rationale: 'Prediction first; weather-failure support second.',
  },
];

// ── Drill 3.4 · Rebuttal vs First-Sentence Stage-Gate (Stage 1) ──────────────
// Stage 1 trains First-sentence recognition. Stage 2 trains Rebuttal.
// Stage 3 mixes families. Stage 4 uses canonical-20 stimuli (per G2.DRL-3.4).
export const DRILL_3_4_STAGE_1: FamilyQuestion[] = [
  {
    id: 'D34-S1-Q1',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'The vision test for obtaining a driver’s license should not be limited to measuring daylight vision. Many people with adequate daylight vision have inadequate night vision.',
    family: 'First-sentence',
    rationale: 'Recommendation first; support follows.',
  },
  {
    id: 'D34-S1-Q2',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Many in the public believe online news is inherently less reliable than print. They are wrong. Print newsrooms have shed staff and copy-editors at a faster rate than online newsrooms over the past decade.',
    family: 'Rebuttal',
    rationale: 'Opposing view → flat rebuttal → support. Rebuttal family.',
  },
  {
    id: 'D34-S1-Q3',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Freedom of speech is the only rational policy for this government. When ideas air openly, good ideas flourish and bad ideas get refuted.',
    family: 'First-sentence',
    rationale: 'Policy claim first; support follows.',
  },
  {
    id: 'D34-S1-Q4',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'It is widely held that workplace flexibility reduces productivity. The evidence does not support this. Companies allowing remote work show comparable or higher output across most measured roles.',
    family: 'Rebuttal',
    rationale: 'Opposing view → rebuttal → support.',
  },
  {
    id: 'D34-S1-Q5',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Ranked-choice voting deserves wider adoption. It reduces the spoiler effect, encourages broader campaigns, and tends to elect more consensus-favored candidates.',
    family: 'First-sentence',
    rationale: 'Recommendation first; three support clauses follow.',
  },
];

// ── Drill 3.1 · Indicator Word ID (Stage 2 — multi-word phrases) ─────────────
export const DRILL_3_1_STAGE_2: IndicatorIdQuestion[] = [
  {
    id: 'D31-S2-Q1',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'Critics argue that the proposal would gut local oversight. The data, however, tells a different story.',
    highlighted_word: 'Critics argue that',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'opposing',
    rationale: '"Critics argue that" attributes a view to others — flag it as opposing, not the author’s claim.',
  },
  {
    id: 'D31-S2-Q2',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'The pilot reduced wait times in every test corridor. It follows that the program should be expanded city-wide.',
    highlighted_word: 'It follows that',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'conclusion',
    rationale: '"It follows that" introduces what the author derives from the prior support — a conclusion marker.',
  },
  {
    id: 'D31-S2-Q3',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'Critics call the policy a giveaway to insiders. On the other hand, it has measurably reduced backlog at three intake centers.',
    highlighted_word: 'On the other hand',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'pivot',
    rationale: '"On the other hand" pivots from the opposing view to the author’s actual position.',
  },
  {
    id: 'D31-S2-Q4',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'Granted that the rollout had real coordination problems, the program’s long-term outcomes still justify continued funding.',
    highlighted_word: 'Granted that',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'concession',
    rationale: '"Granted that" is a concession — the author briefly inhabits the critics’ point before pivoting.',
  },
  {
    id: 'D31-S2-Q5',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'It is widely held that remote work hurts productivity. The companies that have measured it most carefully report otherwise.',
    highlighted_word: 'It is widely held that',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'opposing',
    rationale: '"It is widely held that" frames a popular view the author is about to push back on — opposing.',
  },
];

// ── Drill 3.2 · X-Ray Drill (Stage 2 — closer-call distractors) ──────────────
export const DRILL_3_2_STAGE_2: XRayQuestion[] = [
  {
    id: 'D32-S2-Q1',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'The arts council should be defunded. Its grant program has shrunk three years running. Most of its remaining staff have moved to private foundations. The council itself has missed its last two annual reports.',
    candidates: [
      { letter: 'A', text: 'The arts council should be defunded.', is_correct: true },
      { letter: 'B', text: 'Its grant program has shrunk three years running.', is_correct: false },
      { letter: 'C', text: 'Most of its remaining staff have moved to private foundations.', is_correct: false },
      { letter: 'D', text: 'The council itself has missed its last two annual reports.', is_correct: false },
    ],
    rationale: 'Recommendation first. The next three sentences are decline-evidence used to support the call.',
  },
  {
    id: 'D32-S2-Q2',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'It is true that the safety record of light-rail systems has improved. But the underlying engineering tradeoffs have not changed. The proposed extension should not move forward as designed.',
    candidates: [
      { letter: 'A', text: 'It is true that the safety record of light-rail systems has improved.', is_correct: false },
      { letter: 'B', text: 'But the underlying engineering tradeoffs have not changed.', is_correct: false },
      { letter: 'C', text: 'The proposed extension should not move forward as designed.', is_correct: true },
    ],
    rationale: 'Concession → pivot → claim. Sentence three is the recommendation.',
  },
  {
    id: 'D32-S2-Q3',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'Standardized achievement scores correlate with family income. They do not correlate as strongly with later workplace performance. So treating them as a primary admissions filter overweights one signal at the expense of better ones.',
    candidates: [
      { letter: 'A', text: 'Standardized achievement scores correlate with family income.', is_correct: false },
      { letter: 'B', text: 'They do not correlate as strongly with later workplace performance.', is_correct: false },
      { letter: 'C', text: 'Treating them as a primary admissions filter overweights one signal at the expense of better ones.', is_correct: true },
    ],
    rationale: 'Two premises set up the claim. The "so" sentence is the conclusion.',
  },
  {
    id: 'D32-S2-Q4',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'Many believe a steeper carbon tax would slow the economy. They are reading the data backwards. Jurisdictions that raised the rate fastest also posted the strongest GDP growth.',
    candidates: [
      { letter: 'A', text: 'Many believe a steeper carbon tax would slow the economy.', is_correct: false },
      { letter: 'B', text: 'They are reading the data backwards.', is_correct: true },
      { letter: 'C', text: 'Jurisdictions that raised the rate fastest also posted the strongest GDP growth.', is_correct: false },
    ],
    rationale: 'Opposing view → flat rebuttal → support. The flat rebuttal is the claim.',
  },
  {
    id: 'D32-S2-Q5',
    prompt: 'Which sentence is the conclusion?',
    stimulus:
      'Vaccination rates in the district have dropped four years running. Pediatric exemption requests are up nearly threefold over the same period. Public-health funding to the schools should be conditioned on closing the exemption loopholes.',
    candidates: [
      { letter: 'A', text: 'Vaccination rates in the district have dropped four years running.', is_correct: false },
      { letter: 'B', text: 'Pediatric exemption requests are up nearly threefold over the same period.', is_correct: false },
      { letter: 'C', text: 'Public-health funding to the schools should be conditioned on closing the exemption loopholes.', is_correct: true },
    ],
    rationale: 'Two trend premises support the recommendation in the third sentence.',
  },
];

// ── Drill 3.3 · First-Sentence Reading (Stage 2 — tricky openings) ───────────
export const DRILL_3_3_STAGE_2: FirstSentenceQuestion[] = [
  {
    id: 'D33-S2-Q1',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'How long can a city pretend its transit system is solvent? Fares have not risen in twelve years, ridership has fallen, and reserves are nearly gone. The honest answer is: not much longer.',
    is_first_sentence_conclusion: false,
    rationale: 'Rhetorical question opener — it sets up the claim. The actual conclusion is the final sentence.',
  },
  {
    id: 'D33-S2-Q2',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Many parents believe phonics-only reading instruction is outdated. The evidence does not back them up; structured phonics outperforms whole-language methods on every controlled measure.',
    is_first_sentence_conclusion: false,
    rationale: 'First sentence is the opposing view. The author’s claim begins with "The evidence does not back them up."',
  },
  {
    id: 'D33-S2-Q3',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Eighty percent of pedestrian fatalities in this city occur on six corridors. Those corridors should be the first to receive lower posted limits and protected crossings.',
    is_first_sentence_conclusion: false,
    rationale: 'First sentence is a statistic — that’s support. The recommendation follows in sentence two.',
  },
  {
    id: 'D33-S2-Q4',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'The grant program should be wound down. Its three pilot cycles missed every benchmark, its administrative overhead exceeds its disbursements, and no peer foundation has copied the model.',
    is_first_sentence_conclusion: true,
    rationale: 'Recommendation first; three reasons follow.',
  },
  {
    id: 'D33-S2-Q5',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Granted, the new building has aesthetic merit. But it will permanently overshadow a public park, displace twenty-eight rent-stabilized units, and stress an already overloaded grid. The variance should be denied.',
    is_first_sentence_conclusion: false,
    rationale: 'First sentence is a concession. The conclusion is the final sentence.',
  },
];

// ── Drill 3.4 · Rebuttal vs First-Sentence (Stage 2 — Rebuttal-dominant) ─────
// Calibration design: 4 Rebuttal items + 1 First-sentence calibration check.
// Tests rebuttal recognition under harder surface conditions (rhetorical-question rebuttal,
// late pivot, "nevertheless"/"and yet" pivots, opposing-view openings without an explicit
// "they are mistaken"). The single First-sentence item prevents the answer-bias shortcut.
export const DRILL_3_4_STAGE_2: FamilyQuestion[] = [
  {
    id: 'D34-S2-Q1',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Many in the industry argue the new compliance rule will drive small operators out of the market. The actual filings tell a different story: small-operator share has held steady in the three jurisdictions where the rule is already in force.',
    family: 'Rebuttal',
    rationale: 'Opposing view → corrective claim → support. Rebuttal family.',
  },
  {
    id: 'D34-S2-Q2',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'It is true that ranked-choice ballots take longer to tabulate. Nevertheless, the method delivers winners with broader majority support and reduces the spoiler effect that plain plurality systems chronically generate.',
    family: 'Rebuttal',
    rationale: 'Concession → "nevertheless" pivot → defense of the method. Rebuttal family.',
  },
  {
    id: 'D34-S2-Q3',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Coastal infrastructure spending should be doubled over the next decade. Sea-level projections have steepened, the existing seawalls are already past their design life, and the cost of repair after a major storm dwarfs the cost of upgrade now.',
    family: 'First-sentence',
    rationale: 'Recommendation first; three lines of support follow. First-sentence family.',
  },
  {
    id: 'D34-S2-Q4',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'How could a watchdog journal accept a six-figure grant from the very industry it covers and still claim to report independently? It cannot. The journal’s editorial firewall has not survived this arrangement.',
    family: 'Rebuttal',
    rationale: 'Rhetorical question floats the opposing position; the author rejects it. Rebuttal family.',
  },
  {
    id: 'D34-S2-Q5',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Defenders of the current zoning code call it the city’s last protection against sprawl. The opposite is closer to the truth — the code as written has produced sprawl by forcing low-density development outward into farmland.',
    family: 'Rebuttal',
    rationale: 'Opposing view → flat reversal ("the opposite is closer to the truth") → support. Rebuttal family.',
  },
];

// ── Drill 3.1 · Indicator Word ID (Stage 3 — mixed signals) ──────────────────
// Tests recognition when multiple indicator-class words appear in the same sentence
// or when an opener mimics one role while playing another.
export const DRILL_3_1_STAGE_3: IndicatorIdQuestion[] = [
  {
    id: 'D31-S3-Q1',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'Although the program had setbacks in its first year, its second-year metrics now exceed forecast.',
    highlighted_word: 'Although',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'concession',
    rationale: '"Although" is a concession opener — the author briefly grants the setback before pivoting to the favorable metric.',
  },
  {
    id: 'D31-S3-Q2',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'Some commentators insist the policy works. The post-rollout data flatly contradicts them.',
    highlighted_word: 'Some commentators insist',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'opposing',
    rationale: '"Some commentators insist" attributes the claim to others — opposing view, not the author’s.',
  },
  {
    id: 'D31-S3-Q3',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'The bridge inspection logs document fifteen failures over five years. Hence, the structure should be condemned.',
    highlighted_word: 'Hence',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'conclusion',
    rationale: '"Hence" is a conclusion marker — the recommendation follows directly from the logged failures.',
  },
  {
    id: 'D31-S3-Q4',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'Some say the policy is a waste. But the policy has saved the city six million in audit fees.',
    highlighted_word: 'But',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'pivot',
    rationale: '"But" pivots from the opposing view to the author’s defense of the policy.',
  },
  {
    id: 'D31-S3-Q5',
    prompt: 'Which category does the highlighted phrase belong to?',
    text: 'In my view, the proposal trades short-term savings for long-term structural risk.',
    highlighted_word: 'In my view',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'opinion',
    rationale: '"In my view" flags the author’s own stance — opinion, not opposing.',
  },
];

// ── Drill 3.1 · Indicator Word ID (Stage 4 — speed run) ──────────────────────
// Compressed stimuli, single-clause sentences. Built for sub-3-second decisions.
export const DRILL_3_1_STAGE_4: IndicatorIdQuestion[] = [
  {
    id: 'D31-S4-Q1',
    prompt: 'Category?',
    text: 'Therefore, the audit findings should be reopened.',
    highlighted_word: 'Therefore',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'conclusion',
    rationale: '"Therefore" — conclusion marker.',
  },
  {
    id: 'D31-S4-Q2',
    prompt: 'Category?',
    text: 'Because the trial sample was self-selected, the result generalizes poorly.',
    highlighted_word: 'Because',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'premise',
    rationale: '"Because" — support marker.',
  },
  {
    id: 'D31-S4-Q3',
    prompt: 'Category?',
    text: 'Detractors say the rule is unworkable. They are wrong.',
    highlighted_word: 'Detractors say',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'opposing',
    rationale: '"Detractors say" — opposing-view attribution.',
  },
  {
    id: 'D31-S4-Q4',
    prompt: 'Category?',
    text: 'Yet the underlying problem remains.',
    highlighted_word: 'Yet',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'pivot',
    rationale: '"Yet" — pivot.',
  },
  {
    id: 'D31-S4-Q5',
    prompt: 'Category?',
    text: 'Admittedly, the proposal carries political risk; even so, the program is essential.',
    highlighted_word: 'Admittedly',
    category_options: ['conclusion', 'premise', 'pivot', 'concession', 'opposing', 'opinion'],
    correct_category: 'concession',
    rationale: '"Admittedly" — concession.',
  },
];

// ── Drill 3.2 · X-Ray Drill (Stage 3 — multi-claim with intermediate) ────────
export const DRILL_3_2_STAGE_3: XRayQuestion[] = [
  {
    id: 'D32-S3-Q1',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'A diet high in refined sugar can make a person overweight. Being overweight predisposes a person to adult-onset diabetes. So it is inaccurate to say that refined sugar cannot cause adult-onset diabetes.',
    candidates: [
      { letter: 'A', text: 'A diet high in refined sugar can make a person overweight.', is_correct: false },
      { letter: 'B', text: 'Being overweight predisposes a person to adult-onset diabetes.', is_correct: false },
      { letter: 'C', text: 'It is inaccurate to say that refined sugar cannot cause adult-onset diabetes.', is_correct: true },
    ],
    rationale: 'A and B chain into B; C is the rebuttal claim the chain supports. C is the main conclusion.',
  },
  {
    id: 'D32-S3-Q2',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'The proposed road extension would cut commute times by 15 minutes per traveler. Reduced commutes correlate with higher productivity. Higher productivity benefits regional employers. Hence the extension should be approved.',
    candidates: [
      { letter: 'A', text: 'The proposed road extension would cut commute times by 15 minutes per traveler.', is_correct: false },
      { letter: 'B', text: 'Reduced commutes correlate with higher productivity.', is_correct: false },
      { letter: 'C', text: 'Higher productivity benefits regional employers.', is_correct: false },
      { letter: 'D', text: 'The extension should be approved.', is_correct: true },
    ],
    rationale: 'A → B → C is the support chain. D is the recommendation the chain serves.',
  },
  {
    id: 'D32-S3-Q3',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'Critics argue the new licensing rule is overreach. The rule does not change who can practice — it only standardizes how malpractice claims are reported. So the criticism misreads the rule’s scope.',
    candidates: [
      { letter: 'A', text: 'Critics argue the new licensing rule is overreach.', is_correct: false },
      { letter: 'B', text: 'The rule does not change who can practice — it only standardizes how malpractice claims are reported.', is_correct: false },
      { letter: 'C', text: 'The criticism misreads the rule’s scope.', is_correct: true },
    ],
    rationale: 'Opposing view → corrective premise → claim. C is the author’s point.',
  },
  {
    id: 'D32-S3-Q4',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'Three rounds of independent testing produced consistent results. The results withstood adversarial review by competing labs. The methodology has now been adopted by two regulatory bodies. The protocol should be considered settled science.',
    candidates: [
      { letter: 'A', text: 'Three rounds of independent testing produced consistent results.', is_correct: false },
      { letter: 'B', text: 'The results withstood adversarial review by competing labs.', is_correct: false },
      { letter: 'C', text: 'The methodology has now been adopted by two regulatory bodies.', is_correct: false },
      { letter: 'D', text: 'The protocol should be considered settled science.', is_correct: true },
    ],
    rationale: 'Three lines of evidence converge on the final claim. D is the conclusion.',
  },
  {
    id: 'D32-S3-Q5',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'A thorough archival search has turned up no record of the meeting. The two participants who would have attended both deny it occurred. Therefore, the meeting almost certainly did not happen, and any account that depends on it is unreliable.',
    candidates: [
      { letter: 'A', text: 'A thorough archival search has turned up no record of the meeting.', is_correct: false },
      { letter: 'B', text: 'The two participants who would have attended both deny it occurred.', is_correct: false },
      { letter: 'C', text: 'The meeting almost certainly did not happen, and any account that depends on it is unreliable.', is_correct: true },
    ],
    rationale: 'Two premises support the compound claim in C. The claim is the conclusion.',
  },
];

// ── Drill 3.2 · X-Ray Drill (Stage 4 — speed run) ────────────────────────────
export const DRILL_3_2_STAGE_4: XRayQuestion[] = [
  {
    id: 'D32-S4-Q1',
    prompt: 'Conclusion?',
    stimulus: 'The fund should be liquidated. Its returns have lagged for six years.',
    candidates: [
      { letter: 'A', text: 'The fund should be liquidated.', is_correct: true },
      { letter: 'B', text: 'Its returns have lagged for six years.', is_correct: false },
    ],
    rationale: 'Recommendation, then evidence.',
  },
  {
    id: 'D32-S4-Q2',
    prompt: 'Conclusion?',
    stimulus: 'Cost matters. But the proposal will save more than it spends. Adopt it.',
    candidates: [
      { letter: 'A', text: 'Cost matters.', is_correct: false },
      { letter: 'B', text: 'The proposal will save more than it spends.', is_correct: false },
      { letter: 'C', text: 'Adopt it.', is_correct: true },
    ],
    rationale: 'Concession → support → recommendation.',
  },
  {
    id: 'D32-S4-Q3',
    prompt: 'Conclusion?',
    stimulus: 'Many think the bill is too narrow. They miss the bigger structural problem the bill leaves untouched.',
    candidates: [
      { letter: 'A', text: 'Many think the bill is too narrow.', is_correct: false },
      { letter: 'B', text: 'They miss the bigger structural problem the bill leaves untouched.', is_correct: true },
    ],
    rationale: 'Opposing view → corrective claim.',
  },
  {
    id: 'D32-S4-Q4',
    prompt: 'Conclusion?',
    stimulus: 'Energy prices have stabilized. Inventories have rebuilt. The shortage is over.',
    candidates: [
      { letter: 'A', text: 'Energy prices have stabilized.', is_correct: false },
      { letter: 'B', text: 'Inventories have rebuilt.', is_correct: false },
      { letter: 'C', text: 'The shortage is over.', is_correct: true },
    ],
    rationale: 'Two trend premises support the conclusion.',
  },
  {
    id: 'D32-S4-Q5',
    prompt: 'Conclusion?',
    stimulus: 'Since the witness has recanted, the conviction cannot stand on the witness’s testimony alone.',
    candidates: [
      { letter: 'A', text: 'The witness has recanted.', is_correct: false },
      { letter: 'B', text: 'The conviction cannot stand on the witness’s testimony alone.', is_correct: true },
    ],
    rationale: '"Since" introduces support; the claim follows.',
  },
];

// ── Drill 3.3 · First-Sentence Reading (Stage 3 — concession openers) ────────
export const DRILL_3_3_STAGE_3: FirstSentenceQuestion[] = [
  {
    id: 'D33-S3-Q1',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'It is true that the licensing process is slow. But the slowness is what keeps unqualified practitioners out of the field, and rushing it would compromise public safety.',
    is_first_sentence_conclusion: false,
    rationale: 'First sentence is a concession. The defense after "But" is the actual claim.',
  },
  {
    id: 'D33-S3-Q2',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'The state should phase out tax incentives for stadium construction. Studies of comparable subsidies show no measurable impact on regional employment, and the public cost typically exceeds projections by a wide margin.',
    is_first_sentence_conclusion: true,
    rationale: 'Recommendation in sentence one; two lines of support follow.',
  },
  {
    id: 'D33-S3-Q3',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'Granted, the older codebase ran more reliably. But it also accumulated technical debt the team could no longer service safely. The migration was the right call.',
    is_first_sentence_conclusion: false,
    rationale: 'Concession → pivot → claim. The conclusion is the final sentence.',
  },
  {
    id: 'D33-S3-Q4',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'No reasonable reading of the contract supports the buyer’s interpretation. The disputed clause is unambiguous on its face, and the surrounding sections reinforce, rather than narrow, its meaning.',
    is_first_sentence_conclusion: true,
    rationale: 'Strong claim first; two lines of textual support follow.',
  },
  {
    id: 'D33-S3-Q5',
    prompt: 'Is the first sentence the conclusion?',
    stimulus:
      'While the new pesticide kills target insects efficiently, it also accumulates in the soil and disrupts beneficial microorganisms. For agricultural use it is a poor trade.',
    is_first_sentence_conclusion: false,
    rationale: 'First sentence is a concession (efficiency granted); the verdict in sentence two is the conclusion.',
  },
];

// ── Drill 3.3 · First-Sentence Reading (Stage 4 — speed run) ─────────────────
export const DRILL_3_3_STAGE_4: FirstSentenceQuestion[] = [
  {
    id: 'D33-S4-Q1',
    prompt: 'First sentence the conclusion?',
    stimulus: 'The deal should not close. Two of the three financing conditions remain unmet.',
    is_first_sentence_conclusion: true,
    rationale: 'Claim first; support second.',
  },
  {
    id: 'D33-S4-Q2',
    prompt: 'First sentence the conclusion?',
    stimulus: 'Public-opinion polls have favored the candidate for three weeks. The challenger is unlikely to recover before the vote.',
    is_first_sentence_conclusion: false,
    rationale: 'Polling evidence first; prediction second.',
  },
  {
    id: 'D33-S4-Q3',
    prompt: 'First sentence the conclusion?',
    stimulus: 'Critics call the protocol unsafe. The trial data does not support that label.',
    is_first_sentence_conclusion: false,
    rationale: 'Opposing view first; rebuttal second.',
  },
  {
    id: 'D33-S4-Q4',
    prompt: 'First sentence the conclusion?',
    stimulus: 'The committee should reject the nomination. Documented conflicts of interest disqualify the nominee.',
    is_first_sentence_conclusion: true,
    rationale: 'Recommendation first; reason second.',
  },
  {
    id: 'D33-S4-Q5',
    prompt: 'First sentence the conclusion?',
    stimulus: 'It is widely held that newer is better. In language acquisition, older immersion methods consistently outperform.',
    is_first_sentence_conclusion: false,
    rationale: 'Opposing view first; corrective claim second.',
  },
];

// ── Drill 3.5 · Chain Mapping samples ────────────────────────────────────────
export const DRILL_3_5_QUESTIONS: ChainMappingQuestion[] = [
  {
    id: 'D35-Q1',
    prompt: 'Map the chain. Identify main conclusion, intermediate conclusion, and premises.',
    stimulus:
      'A diet high in refined sugar can make a person overweight. Being overweight predisposes a person to adult-onset diabetes. So it is inaccurate to say that refined sugar cannot cause adult-onset diabetes.',
    layers: {
      main_conclusion: 'It is inaccurate to say that refined sugar cannot cause adult-onset diabetes.',
      intermediate_conclusion: 'Being overweight predisposes a person to adult-onset diabetes.',
      premises: ['A diet high in refined sugar can make a person overweight.'],
    },
  },
  {
    id: 'D35-Q2',
    prompt: 'Map the chain.',
    stimulus:
      'No computer can do everything human minds can do, because computers solve problems only by following mechanical rules, and some problems cannot be solved by any set of mechanical rules.',
    layers: {
      main_conclusion: 'No computer can do everything human minds can do.',
      premises: [
        'Computers solve problems only by following mechanical rules.',
        'Some problems cannot be solved by any set of mechanical rules.',
      ],
    },
  },
];

// ── Drill 3.6 · Design the Conclusion (3 questions) ──────────────────────────
export const DRILL_3_6_QUESTIONS: DesignConclusionQuestion[] = [
  {
    id: 'D36-Q1',
    premise_pair: {
      p1: 'All pet dragons hoard glittery objects.',
      p2: 'Daphne is a pet dragon.',
    },
    valid_model: 'Daphne hoards glittery objects.',
    invalid_model: 'All glittery objects belong to dragons.',
    diagnostic_messages: {
      valid_match: 'Direct application of the universal premise to the named dragon. Clean.',
      invalid_but_interesting:
        'You reversed the universal — that’s the affirming-the-consequent move. Real-world reasoning trap, not what the premises license.',
      misses_the_premises:
        'Your conclusion uses concepts not in the premises. Stay in the dragon-and-glitter universe.',
    },
  },
  {
    id: 'D36-Q2',
    premise_pair: {
      p1: 'Every wizard who owns a broom can teleport.',
      p2: 'Mortimer owns a broom.',
    },
    valid_model: 'Mortimer can teleport.',
    invalid_model: 'Anyone who can teleport must own a broom.',
    diagnostic_messages: {
      valid_match: 'Modus ponens on the named wizard. Clean.',
      invalid_but_interesting:
        'You inverted the conditional. The premises only license teleportation downstream of broom-ownership, not the reverse.',
      misses_the_premises: 'Outside-knowledge import — your conclusion uses concepts not in the premises.',
    },
  },
  {
    id: 'D36-Q3',
    premise_pair: {
      p1: 'No moonlight cricket sings on a Tuesday.',
      p2: 'Today is Tuesday.',
    },
    valid_model: 'No moonlight cricket is singing today.',
    invalid_model: 'A moonlight cricket only sings on Tuesdays.',
    diagnostic_messages: {
      valid_match: 'Universal-negative applied to the named day. Clean.',
      invalid_but_interesting:
        'You reversed the polarity — universal-negative does not entail "only on Tuesdays."',
      misses_the_premises: 'Outside-knowledge import — concepts not in the premises.',
    },
  },
];

// ── Drill 3.7 · Pronoun Replacement (5 items) ────────────────────────────────
export const DRILL_3_7_QUESTIONS: PronounReplacementQuestion[] = [
  {
    id: 'D37-Q1',
    candidate_conclusion: 'This position should not stand.',
    pronoun: 'This position',
    acceptable_replacements: [
      'The view that Mosston should resign',
      'The position that the judge must resign',
      'The argument for forcing Mosston’s resignation',
    ],
    rationale: 'Replace "This position" with the actual stance the author rejects.',
  },
  {
    id: 'D37-Q2',
    candidate_conclusion: 'They should be banned outright.',
    pronoun: 'They',
    acceptable_replacements: ['Single-use plastic bags', 'Plastic bags', 'Single-use bags'],
    rationale: 'The pronoun antecedent is the actual subject the recommendation targets.',
  },
  {
    id: 'D37-Q3',
    candidate_conclusion: 'Such laws merit reconsideration.',
    pronoun: 'Such laws',
    acceptable_replacements: ['Mandatory minimum sentencing laws', 'Mandatory-minimum laws', 'Mandatory minimums'],
    rationale: 'Replace "Such laws" with the antecedent class.',
  },
  {
    id: 'D37-Q4',
    candidate_conclusion: 'These results cannot be trusted.',
    pronoun: 'These results',
    acceptable_replacements: ['The manufacturer-funded study results', 'The funded-study findings', 'Those results'],
    rationale: 'Pronoun → antecedent (manufacturer-funded study).',
  },
  {
    id: 'D37-Q5',
    candidate_conclusion: 'It will not deliver the promised gains.',
    pronoun: 'It',
    acceptable_replacements: ['The proposed merger', 'The merger', 'The merger plan'],
    rationale: 'Replace "It" with the antecedent (the proposed merger).',
  },
];

// ── Drill 3.8 · R&R passages (3 items) ───────────────────────────────────────
export const DRILL_3_8_PASSAGES: RrPassage[] = [
  {
    id: 'D38-P1',
    title: 'Vision test passage',
    passage:
      'The vision test for obtaining a driver’s license should not be limited to measuring daylight vision. Many people with adequate daylight vision have inadequate night vision. Most accidents occur at night, and inadequate vision plays a role in 80% of them.',
    key_phrases: ['vision test', 'driver’s license', 'daylight', 'night vision', 'accidents', '80 percent'],
  },
  {
    id: 'D38-P2',
    title: 'Trade and yeti analogy',
    passage:
      'Arguing that there was no trade between Europe and East Asia in the early Middle Ages because there are no written records is like arguing that the yeti does not exist because there have been no confirmed sightings. Absence of evidence is not evidence of absence.',
    key_phrases: ['trade', 'Europe', 'East Asia', 'yeti', 'sightings', 'absence of evidence'],
  },
  {
    id: 'D38-P3',
    title: 'Mosston rebuttal',
    passage:
      'Judge Mosston was convicted of criminal assault, which is shocking. Nevertheless, he should not be forced to resign as judge — his record of community service has benefited the city greatly.',
    key_phrases: ['Mosston', 'convicted', 'criminal assault', 'resign', 'community service'],
  },
];

// ── Drill 3.9 · Nested Claims (3 items) ──────────────────────────────────────
export const DRILL_3_9_QUESTIONS: NestedClaimsQuestion[] = [
  {
    id: 'D39-Q1',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'The city should fund the new bus rapid transit line. Pilot data shows ridership up 22% on the corridor. Increased ridership reduces congestion. Congestion costs the regional economy $500M annually.',
    candidates: [
      { letter: 'A', text: 'The city should fund the new bus rapid transit line.', is_main: true, role: 'main' },
      { letter: 'B', text: 'Pilot data shows ridership up 22% on the corridor.', is_main: false, role: 'premise' },
      { letter: 'C', text: 'Increased ridership reduces congestion.', is_main: false, role: 'intermediate' },
      { letter: 'D', text: 'Congestion costs the regional economy $500M annually.', is_main: false, role: 'premise' },
    ],
    rationale: 'A is the recommendation. C is intermediate (used to support A). B and D are bottom-layer premises.',
  },
  {
    id: 'D39-Q2',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'Refined sugar can cause adult-onset diabetes. A high-sugar diet can lead to weight gain. Weight gain predisposes people to diabetes. Therefore, the popular claim that refined sugar is harmless is wrong.',
    candidates: [
      { letter: 'A', text: 'Refined sugar can cause adult-onset diabetes.', is_main: false, role: 'intermediate' },
      { letter: 'B', text: 'A high-sugar diet can lead to weight gain.', is_main: false, role: 'premise' },
      { letter: 'C', text: 'Weight gain predisposes people to diabetes.', is_main: false, role: 'premise' },
      { letter: 'D', text: 'The popular claim that refined sugar is harmless is wrong.', is_main: true, role: 'main' },
    ],
    rationale: 'D is the main rebuttal claim. A is the intermediate conclusion that supports D.',
  },
  {
    id: 'D39-Q3',
    prompt: 'Which sentence is the main conclusion?',
    stimulus:
      'Studies show exercise reduces anxiety. Reducing anxiety improves productivity. Improved productivity benefits employers. Employers should fund workplace exercise programs.',
    candidates: [
      { letter: 'A', text: 'Studies show exercise reduces anxiety.', is_main: false, role: 'premise' },
      { letter: 'B', text: 'Reducing anxiety improves productivity.', is_main: false, role: 'premise' },
      { letter: 'C', text: 'Improved productivity benefits employers.', is_main: false, role: 'intermediate' },
      { letter: 'D', text: 'Employers should fund workplace exercise programs.', is_main: true, role: 'main' },
    ],
    rationale: 'D is the recommendation. C is intermediate. A and B are bottom premises.',
  },
];

// ── Drill 3.4 · Rebuttal vs First-Sentence (Stage 3 — Mixed family) ──────────
// Balanced 3 Rebuttal + 2 First-sentence under subtle conditions: late pivots,
// embedded concessions, recommendation openers that read corrective, and
// corrective claims that read like flat declarations. No dominant family
// signal — students must read the structure, not the surface.
export const DRILL_3_4_STAGE_3: FamilyQuestion[] = [
  {
    id: 'D34-S3-Q1',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'The municipal bond program has performed exactly as projected: revenues are within two percent of forecast, default rates are negligible, and the rating agencies have held their position. Critics calling for a pause have nothing in the numbers to point to.',
    family: 'First-sentence',
    rationale:
      'The first sentence is the claim ("performed exactly as projected"). Three lines of support follow. The closing jab at critics is decoration, not the conclusion. First-sentence family.',
  },
  {
    id: 'D34-S3-Q2',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Proponents of the four-day work week point to a handful of pilot studies showing productivity gains. Look closer. Those pilots self-selected for firms already running below capacity, and once the schedule was extended to firms with normal utilization, output fell.',
    family: 'Rebuttal',
    rationale:
      '"Look closer" is the pivot. The author rejects the proponents’ reading of the evidence and supports the rejection. Rebuttal family.',
  },
  {
    id: 'D34-S3-Q3',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'The committee’s draft framework for AI procurement is the right starting point. It assumes risk tiers, requires red-team disclosure, and forces vendors to publish post-deployment incident data — three things every prior framework left optional.',
    family: 'First-sentence',
    rationale:
      'Recommendation/endorsement first; three reasons follow. The "three things every prior framework left optional" line is comparative support, not a rebuttal. First-sentence family.',
  },
  {
    id: 'D34-S3-Q4',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Granted, the new high-speed rail corridor will not be profitable on operating revenue alone for at least a decade. That fact does not condemn the project; rail rarely pays in the early years, and the freight relief and emissions reduction are worth the bridging cost on their own.',
    family: 'Rebuttal',
    rationale:
      'Concession opener → "that fact does not condemn the project" pivot → defense. Rebuttal family. (The first sentence is the conceded position, not the claim.)',
  },
  {
    id: 'D34-S3-Q5',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'A strain of skepticism running through the trade press holds that the new battery chemistry will plateau short of grid-scale viability. The third-party cell tests released this month tell a different story: cycle life and energy density both exceeded the targets the chemistry was supposed to plateau below.',
    family: 'Rebuttal',
    rationale:
      'Opposing view (industry skepticism) → "tell a different story" pivot → corrective evidence. Rebuttal family.',
  },
];

// ── Drill 3.4 · Rebuttal vs First-Sentence (Stage 4 — Canonical 20 subset) ───
// 5 picks from the canonical 20 (MCFIRST). Balanced 3 First-sentence + 2 Rebuttal,
// chosen to span the trait surface: clean recommendation opener (Q1), declarative-
// claim opener (Q19), since-clause-leading first-sentence that smells rebuttal-shaped
// (Q20), rhetorical-question rebuttal (Q12), so-called dismissal rebuttal (Q14).
// Stimulus text is sourced verbatim from src/bootcamps/main-conclusion/data/mcfirst.extracted.json.
// Joshua may revise this subset; current selection authored autonomously 2026-05-01
// per "take liberty" directive.
export const DRILL_3_4_STAGE_4: FamilyQuestion[] = [
  {
    id: 'D34-S4-Q1',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'The vision test for obtaining a driver’s license should not be limited to measuring the adequacy of vision in daylight conditions, as is the current practice. Many people whose daylight vision is adequate have night vision that is inadequate for safe night driving. Most car accidents occur at night, and inadequate vision plays a role in 80 percent of these accidents.',
    family: 'First-sentence',
    rationale:
      'MC-SIM-Q1. Recommendation opener ("should not be limited to") → two lines of empirical support. First-sentence family.',
  },
  {
    id: 'D34-S4-Q2',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Some people believe that witnessing violence in movies will discharge aggressive energy. Does watching someone else eat fill one’s own stomach?',
    family: 'Rebuttal',
    rationale:
      'MC-SIM-Q12. Opposing view stated → rhetorical question used as the corrective. The rhetorical question IS the rebuttal claim. Rebuttal family.',
  },
  {
    id: 'D34-S4-Q3',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'So-called environmentalists have argued that the proposed Golden Lake Development would interfere with bird-migration patterns. However, the fact that these same people have raised environmental objections to virtually every development proposal brought before the council in recent years indicates that their expressed concern for bird migration patterns is nothing but a mask for their antidevelopment, antiprogress agenda. Their claim, therefore, should be dismissed without further consideration.',
    family: 'Rebuttal',
    rationale:
      'MC-SIM-Q14. Opposing view ("environmentalists have argued") → "however" pivot → ad hominem dismissal. The "their claim should be dismissed" line is the corrective conclusion. Rebuttal family.',
  },
  {
    id: 'D34-S4-Q4',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'There is no mystery as to why figurative painting revived in the late 1970s. People want to look at recognizable images. Sorting out art theories reflected in abstract paintings is no substitute for the sense of empathy that comes from looking at a realistic painting of a figure in a landscape. Perhaps members of the art-viewing public resented abstract art because they felt that its lack of realistic subject matter was a rejection of the viewers and their world.',
    family: 'First-sentence',
    rationale:
      'MC-SIM-Q19. Declarative claim ("there is no mystery as to why...") opens; subsequent sentences are the explanation. First-sentence family.',
  },
  {
    id: 'D34-S4-Q5',
    prompt: 'Which family does this stimulus belong to?',
    stimulus:
      'Since multinational grain companies operate so as to maximize profits, they cannot be relied on to initiate economic changes that would reform the world’s food-distribution system. Although it is true that the actions of multinational companies sometimes do result in such economic change, this result is incidental, arising not from the desire for reform but from the desire to maximize profits. The maximization of profits normally depends on a stable economic environment, one that discourages change.',
    family: 'First-sentence',
    rationale:
      'MC-SIM-Q20. The "since"-clause is a premise; the main clause ("they cannot be relied on...") is the conclusion. The "although it is true" concession that follows is structural support, not a pivot. First-sentence family — wildcard pick because the "since" + later concession surface tempts a Rebuttal misread.',
  },
];
