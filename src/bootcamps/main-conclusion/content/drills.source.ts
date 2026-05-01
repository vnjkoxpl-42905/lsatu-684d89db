/**
 * Drill content — sample-tier authoring for Phase C engine wiring.
 * Stages 1 of each Stage-Gate drill are authored with 5 representative items.
 * Stages 2-4 carry stub items pending Joshua's authoring pass at C.10.
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
