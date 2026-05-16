// Migrated from src/bootcamps/fallacy-flaw/content/bootcamp/days.ts (6 days · 34 items),
// src/bootcamps/fallacy-flaw/content/drills/pop-quiz.ts (16 items),
// src/bootcamps/fallacy-flaw/content/drills/fallacies.ts (40 placeholder items),
// src/bootcamps/fallacy-flaw/content/drills/flaw-drill.ts (30 placeholder items),
// src/bootcamps/fallacy-flaw/content/drills/abstract-language.ts (20 placeholder items).
//
// Real LSAT-cited items from Day 6 + all `invented: true` items from drills/* go to
// the capstone module by spec. Day 1, 2, and Day 5 trap-pattern items are meta /
// methodology items also routed to capstone (no flaw-family match).

import { Question, QuestionModuleId } from '../../types/fallacyFlaw';

// ────────────────────────────────────────────────────────────────────────────
// Module 1: Causal Flaws
// ────────────────────────────────────────────────────────────────────────────
const module1Questions: Question[] = [
  {
    id: 'M1-Q01',
    moduleId: 'causal-flaws',
    sourceId: 'd3-2',
    stem: 'Cities with more police officers per capita have higher crime rates. Clearly, hiring more police officers increases crime. Which Group 1 flaw is this?',
    choices: [
      { text: 'Necessary vs. Sufficient' },
      { text: 'Causal' },
      { text: 'Ad Hominem' },
      { text: 'Unproven vs. Proven False' },
    ],
    correctIndex: 1,
    explanation:
      'Correlation between two variables, conclusion picks one causal direction (police → crime), ignores reverse causation (high crime → more police hired) and third-factor explanations. Whenever the LSAT names a single cause for a correlation, 99.9% of the time it is wrong.',
    difficulty: 'Medium',
    primaryConcept: 'causal',
  },
  {
    id: 'M1-Q02',
    moduleId: 'causal-flaws',
    sourceId: 'd5-5',
    stem: 'Three of the five Olympic gold medalists from 2024 trained at the same facility. Therefore, that facility produces the best athletes in the world. Disambiguate Sampling vs. Causal.',
    choices: [
      { text: 'Sampling — the sample is too small to support the conclusion' },
      { text: 'Causal — the facility may not be what produced the athletes' },
      { text: 'Both apply equally; pick the one named in the answer choices' },
      { text: 'Neither — this is Part vs. Whole' },
    ],
    correctIndex: 1,
    explanation:
      "The leap is from a co-occurrence (medalists trained there) to a causal claim (the facility produces the athletes). The athletes might have been world-class before they arrived; the facility might attract talent rather than create it. Causal is the right diagnosis. Sampling would apply if the conclusion were a population claim; here it's a causal claim.",
    difficulty: 'Hard',
    primaryConcept: 'causal',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Module 2: Conditional Flaws
// ────────────────────────────────────────────────────────────────────────────
const module2Questions: Question[] = [
  {
    id: 'M2-Q01',
    moduleId: 'conditional-flaws',
    sourceId: 'd3-1',
    stem: 'All highway exits are marked. Therefore, anything marked is a highway exit. Which Group 1 flaw is this?',
    choices: [
      { text: 'Necessary vs. Sufficient' },
      { text: 'Causal' },
      { text: 'Part vs. Whole' },
      { text: 'Sampling' },
    ],
    correctIndex: 0,
    explanation:
      'Classic conditional reversal. "All A are B" does not mean "all B are A." The argument flips a sufficient relationship into a necessary one. Tell: an "all X are Y" rule that gets read backwards in the conclusion.',
    difficulty: 'Medium',
    primaryConcept: 'necessary-vs-sufficient',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Module 3: Sampling, Comparison & Scope Flaws
// ────────────────────────────────────────────────────────────────────────────
const module3Questions: Question[] = [
  {
    id: 'M3-Q01',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd3-3',
    stem: 'Every player on the all-star team is the best at their position. Therefore, the all-star team is the best team in the league. Which flaw?',
    choices: [
      { text: 'Sampling' },
      { text: 'Causal' },
      { text: 'Part vs. Whole' },
      { text: 'Necessary vs. Sufficient' },
    ],
    correctIndex: 2,
    explanation:
      'A property of every individual member (best at their position) gets transferred to the group as a whole (best team). The all-stars might never have played together. Coordination, chemistry, and roles are properties of the team, not the individuals.',
    difficulty: 'Medium',
    primaryConcept: 'part-vs-whole',
  },
  {
    id: 'M3-Q02',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd3-4',
    stem: 'Despite years of investigation, no one has proven that aliens have visited Earth. Therefore, aliens have never visited Earth. Which flaw?',
    choices: [
      { text: 'Ad Hominem' },
      { text: 'Unproven vs. Proven False' },
      { text: 'Sampling' },
      { text: 'Causal' },
    ],
    correctIndex: 1,
    explanation:
      'Absence of evidence is not evidence of absence. "Not proven true" is not the same as "proven false." The author treats a failure to establish a claim as a demonstration of its opposite.',
    difficulty: 'Medium',
    primaryConcept: 'unproven-vs-proven-false',
  },
  {
    id: 'M3-Q03',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd3-5',
    stem: 'The senator argues that the new tax bill will hurt small businesses. But she has accepted donations from major corporations. Therefore, her argument should be dismissed. Which flaw?',
    choices: [
      { text: 'Ad Hominem' },
      { text: 'Sampling' },
      { text: 'Unproven vs. Proven False' },
      { text: 'Causal' },
    ],
    correctIndex: 0,
    explanation:
      "The author rejects the senator's argument by attacking the source (her donor history) instead of the substance of the argument. Her donors do not make her wrong about the tax bill. Address the claim, not the speaker.",
    difficulty: 'Medium',
    primaryConcept: 'ad-hominem',
  },
  {
    id: 'M3-Q04',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd4-1',
    stem: 'Companies with high employee satisfaction scores have higher revenue per employee. Therefore, treating employees well is the most ethical business strategy. Which flaw?',
    choices: [
      { text: 'Causal' },
      { text: 'Sleight of Hand' },
      { text: 'Sampling' },
      { text: 'Sleazy Sales Pitch' },
    ],
    correctIndex: 1,
    explanation:
      'New term in the conclusion: "ethical." Premise talks about revenue and satisfaction. Where did "ethical" come from? Nowhere. The author equates "high revenue + happy employees" with "ethical" without showing the link. Put a ≠ between the premise concept and the conclusion concept.',
    difficulty: 'Medium',
    primaryConcept: 'sleight-of-hand',
  },
  {
    id: 'M3-Q05',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd4-2',
    stem: 'Studies show that people who exercise regularly have higher life satisfaction. Therefore, exercise is morally required for the good life. Which flaw?',
    choices: [
      { text: 'Sleight of Hand' },
      { text: 'Value Assumption' },
      { text: 'Either of the above could be defended' },
      { text: 'Causal' },
    ],
    correctIndex: 1,
    explanation:
      'The conclusion uses an evaluative term ("morally required") that the premises never defined. Value Assumption is the specific case of Sleight of Hand where the dangling variable is a moral or normative word. (a) is technically defensible but (b) is more precise — when the new term is evaluative, name it Value Assumption.',
    difficulty: 'Hard',
    primaryConcept: 'value-assumptions',
  },
  {
    id: 'M3-Q06',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd4-3',
    stem: "We should hire Marcus over Lily. Marcus has a stronger technical background and Lily lacks Marcus's industry connections. Which flaw?",
    choices: [
      { text: 'Ad Hominem' },
      { text: 'Sampling' },
      { text: 'Sleazy Sales Pitch' },
      { text: 'Universal Desires' },
    ],
    correctIndex: 2,
    explanation:
      "Marcus's strengths and Lily's weaknesses are listed. Lily's strengths and Marcus's weaknesses are nowhere on the page. Classic one-sided comparison. The author is selling Marcus like a used car, full of upside, no downside listed.",
    difficulty: 'Medium',
    primaryConcept: 'sleazy-sales-pitch',
  },
  {
    id: 'M3-Q07',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd4-4',
    stem: 'Everyone should adopt the new productivity app. It will help them get more work done in less time. Which flaw?',
    choices: [
      { text: 'Universal Desires' },
      { text: 'Sleight of Hand' },
      { text: 'Sleazy Sales Pitch' },
      { text: 'Secret Downsides' },
    ],
    correctIndex: 0,
    explanation:
      'The argument concludes "everyone should" because the app delivers a commonly-marketed goal (more output, less time). It never establishes that everyone wants this. Some people prefer slower, more deliberate work. The conclusion pretends maximum productivity is a universal goal.',
    difficulty: 'Medium',
    primaryConcept: 'universal-desires',
  },
  {
    id: 'M3-Q08',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd4-5',
    stem: 'The city should switch all its buses to electric. Electric buses produce no tailpipe emissions. Which flaw is the BEST description?',
    choices: [
      { text: 'Sleight of Hand' },
      { text: 'Causal' },
      { text: 'Secret Downsides' },
      { text: 'Universal Desires' },
    ],
    correctIndex: 2,
    explanation:
      'The argument recommends an action based on one benefit (zero tailpipe emissions) and never addresses costs or unintended consequences (battery sourcing, grid emissions, range issues, capital expense). Secret Downsides — single-option pitch missing the downsides.',
    difficulty: 'Medium',
    primaryConcept: 'secret-downsides',
  },
  {
    id: 'M3-Q09',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd5-3',
    stem: 'Every player on the championship team is undefeated this season. Therefore, the team is undefeated this season. Disambiguate: which is it?',
    choices: [
      { text: 'Sampling' },
      { text: 'Part vs. Whole' },
      { text: 'Causal' },
      { text: 'Sleight of Hand' },
    ],
    correctIndex: 1,
    explanation:
      "Part-to-whole hierarchy. Each player is undefeated individually, the team's collective record could differ. (Imagine a 50% win-rate team where each individual won at least one game.) Sampling is sample → population, not part → whole. Ask: sample-to-population or part-to-whole?",
    difficulty: 'Hard',
    primaryConcept: 'part-vs-whole',
  },
  {
    id: 'M3-Q10',
    moduleId: 'sampling-comparison-scope',
    sourceId: 'd5-4',
    stem: 'The bank refused to honor the check. Clearly, the bank does not honor its commitments. Disambiguate Equivocation vs. Sleight of Hand.',
    choices: [
      { text: 'Equivocation' },
      { text: 'Sleight of Hand' },
      { text: 'Either is defensible' },
      { text: 'Neither — this is a different flaw' },
    ],
    correctIndex: 0,
    explanation:
      'The word "honor" is used twice with shifting meaning: refusing to pay a check (financial sense) vs. failing to keep promises (ethical sense). Same word, two meanings. That is Equivocation. Sleight of Hand uses two DIFFERENT words; Equivocation uses the SAME word with shifting meaning.',
    difficulty: 'Hard',
    primaryConcept: 'equivocation',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Module 4: Famous Flaws Capstone
// Day 1, 2, 5-meta, and all of Day 6 (real PT cites). Pop-quiz items. All
// placeholder items from fallacies.ts, flaw-drill.ts, and abstract-language.ts.
// ────────────────────────────────────────────────────────────────────────────

// Day 1 — Hostile mode / cake-on-blocks / commandments (meta items, real content)
const day1Items: Question[] = [
  {
    id: 'M4-Q01',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd1-q1',
    stem: 'Before you read a Flaw stimulus, the right mental move is to assume:',
    choices: [
      { text: 'The argument is probably fine; check carefully.' },
      { text: 'The argument might have a flaw worth checking for.' },
      { text: 'The argument has done something wrong. Not might have. Has. 100%.' },
      { text: 'The argument is too tricky to assume anything; reserve judgment.' },
    ],
    correctIndex: 2,
    explanation:
      "Logical Hostility is binary. Not 'might have.' Has. The premise of the protocol is that the LSAT writer planted a flaw on purpose, so your job is to assume it and find it.",
    difficulty: 'Easy',
    primaryConcept: 'methodology',
  },
  {
    id: 'M4-Q02',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd1-q2',
    stem: 'In the Cake-on-Blocks model, what role do the premises play?',
    choices: [
      { text: 'The cake — the thing being argued for.' },
      { text: 'The blocks — solid, given, not to be argued with.' },
      { text: 'The walkway between blocks — where validity lives.' },
      { text: 'The floor — what we are trying to keep the cake off of.' },
    ],
    correctIndex: 1,
    explanation:
      'The blocks are the premises. They are given as true. Burning them down (saying "what if that premise is wrong?") is the rookie move. You argue with whether the blocks hold up the cake.',
    difficulty: 'Easy',
    primaryConcept: 'methodology',
  },
  {
    id: 'M4-Q03',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd1-q3',
    stem: 'Where does validity live?',
    choices: [
      { text: 'Inside whichever premise is most central.' },
      { text: 'Inside the conclusion itself.' },
      { text: 'In the connection between the premises and the conclusion — the space between them.' },
      { text: 'In whether the premises are factually true in the real world.' },
    ],
    correctIndex: 2,
    explanation:
      'Validity lives in the relationship, not in any single premise. The Land of Validity Lives Upon the Intersection of the Premises. If the conclusion brings in a fresh term the premises never set up, the cake is on the floor.',
    difficulty: 'Easy',
    primaryConcept: 'methodology',
  },
  {
    id: 'M4-Q04',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd1-r1',
    stem: 'Stimulus: "Coffee is delicious. I love anything delicious. Therefore, I will drink coffee tomorrow." Which what-if violates Commandment I (do not negate the premises)?',
    choices: [
      { text: 'What if all the coffee tomorrow is too hot to drink?' },
      { text: 'What if I actually find coffee disgusting, not delicious?' },
      { text: 'What if a doctor tells me I cannot have caffeine tomorrow?' },
      { text: 'What if I am fasting for a procedure tomorrow?' },
    ],
    correctIndex: 1,
    explanation:
      'Option (b) attacks the premise that the speaker finds coffee delicious. The premises are blocks; you do not burn them down. (a), (c), (d) all attack the connection between premises and conclusion — that is where loopholes legally live.',
    difficulty: 'Medium',
    primaryConcept: 'commandments',
  },
  {
    id: 'M4-Q05',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd1-r2',
    stem: 'Which sentence violates Commandment II (do not just negate the conclusion)?',
    choices: [
      { text: 'What if individual ability does not predict team-level performance under pressure?' },
      { text: 'What if the conclusion does not have to be true?' },
      { text: 'What if a stronger team also entered this year and the championship is competitive?' },
      { text: 'What if past wins do not carry forward to a new lineup?' },
    ],
    correctIndex: 1,
    explanation:
      'Saying "what if the conclusion is not true" is showing up at the finish line and declaring yourself the winner. Of course it does not have to be true. Your job is to show why. (a), (c), (d) show why.',
    difficulty: 'Medium',
    primaryConcept: 'commandments',
  },
  // d1-g1 is generative (free-text loophole construction). No MCQ shape. Preserved
  // as placeholder so it isn't drilled, but the stimulus + canonical answers are
  // kept here for future curriculum work.
  {
    id: 'M4-Q06',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd1-g1',
    placeholder: true,
    stem: 'Generative loophole drill (free-text, no MCQ): "Most successful tech founders dropped out of college. Therefore, dropping out of college is a smart move for anyone who wants to start a tech company." Canonical loopholes: survivor bias, causal mismatch, overgeneralization to "anyone." Original source: d1-g1, kept as placeholder until reformatted.',
    choices: [],
    correctIndex: 0,
    explanation:
      'Any loophole that drives a wedge between the premise (success of founders who dropped out) and the conclusion (dropping out is smart for anyone) is valid. The canonical loopholes attack causation, selection bias, and overgeneralization.',
    difficulty: 'Hard',
    primaryConcept: 'generative-loophole',
  },
];

// Day 2 — Three languages (trigger-phrase classification, meta items)
const day2Items: Question[] = [
  {
    id: 'M4-Q07',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd2-r1',
    stem: 'Trigger phrase: "takes for granted that X". Which language is the answer choice speaking?',
    choices: [
      { text: 'Assumption' },
      { text: 'Objection' },
      { text: 'Match' },
      { text: 'Cannot be determined from the trigger alone' },
    ],
    correctIndex: 0,
    explanation:
      '"Takes for granted" is one of the four canonical Assumption verbs (along with presumes, assumes, fails to establish). The test is the Two-Step Check: make X FALSE, ask if the argument crashes.',
    difficulty: 'Easy',
    primaryConcept: 'three-languages',
  },
  {
    id: 'M4-Q08',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd2-r2',
    stem: 'Trigger phrase: "fails to consider that Y". Which language?',
    choices: [
      { text: 'Assumption' },
      { text: 'Objection' },
      { text: 'Match' },
      { text: 'Either Assumption or Objection — context decides' },
    ],
    correctIndex: 1,
    explanation:
      '"Fails to consider" is Objection language (along with overlooks, ignores, neglects). The test is the Weakener Test: take Y to be TRUE, ask if the conclusion dies.',
    difficulty: 'Easy',
    primaryConcept: 'three-languages',
  },
  {
    id: 'M4-Q09',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd2-a1',
    stem: 'Real LSAT answer choice: "The argument confuses a condition that ensures the truth of another condition with one that is necessary for the truth of that condition." What language and what test?',
    choices: [
      { text: 'Assumption · Two-Step Check (make X FALSE)' },
      { text: 'Objection · Weakener Test (take Y TRUE)' },
      { text: 'Match · Translation Test (does the abstract fit the text?)' },
      { text: 'None of the above; this is a Trap pattern.' },
    ],
    correctIndex: 2,
    explanation:
      'The verb "confuses" is Match-language. The choice is describing the structural error. Run the Translation Test: take the abstract terms ("ensures" and "necessary") and check whether they fit the actual conditional move in the stimulus.',
    difficulty: 'Medium',
    primaryConcept: 'three-languages',
  },
  {
    id: 'M4-Q10',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd2-a2',
    stem: 'Real LSAT answer choice: "The argument takes for granted that a labeling error is proof of an intention to deceive." Apply the Negation Test. If the claim is FALSE, what should happen?',
    choices: [
      { text: 'The argument should still hold up — the claim is incidental.' },
      { text: 'The argument should crash — the claim is load-bearing.' },
      { text: 'The conclusion should still be probable, just not certain.' },
      { text: 'You cannot tell without seeing the stimulus.' },
    ],
    correctIndex: 1,
    explanation:
      'The Two-Step Check on an Assumption answer: if making the claim FALSE crashes the argument, this is the right answer. That is exactly how you confirm Assumption answers — by negating and watching the structure collapse.',
    difficulty: 'Medium',
    primaryConcept: 'three-languages',
  },
  {
    id: 'M4-Q11',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd2-a3',
    stem: 'You see two answer choices that say roughly the same thing about the same hidden gap. (A) starts with "fails to consider that..." (B) starts with "takes for granted that..." Which test do you run on each?',
    choices: [
      { text: '(A) Negation Test · (B) Weakener Test' },
      { text: '(A) Weakener Test · (B) Negation Test' },
      { text: 'Same test on both — same answer.' },
      { text: 'No test until you read the stimulus again.' },
    ],
    correctIndex: 1,
    explanation:
      'Same correct answer, different test. Objection ("fails to consider") → take Y TRUE, does the conclusion die. Assumption ("takes for granted") → make X FALSE, does the argument crash. Apply the wrong test and you eliminate the right answer because it failed your wrong protocol.',
    difficulty: 'Hard',
    primaryConcept: 'three-languages',
  },
];

// Day 5 — Trap patterns (meta) — d5-1, d5-2
const day5MetaItems: Question[] = [
  {
    id: 'M4-Q12',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd5-1',
    stem: 'Answer choice: "The argument relies SOLELY on the testimony of a single witness." The stimulus mentioned the witness as one of three pieces of evidence. Which trap pattern?',
    choices: [
      { text: '1 · Too Strong' },
      { text: '2 · Bad Match' },
      { text: '5 · Contradicted' },
      { text: '4 · Wrong Flaw' },
    ],
    correctIndex: 0,
    explanation:
      '"Solely" is the tell. Extreme words (only, solely, merely, always, never, impossible) push the answer beyond what the stimulus says. Even if the witness is mentioned, "solely" overstates the role and kills the answer.',
    difficulty: 'Medium',
    primaryConcept: 'trap-pattern',
  },
  {
    id: 'M4-Q13',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd5-2',
    stem: 'Answer choice: "The argument confuses correlation with causation." The stimulus is a conditional logic argument that never mentions correlation or causation. Which trap?',
    choices: [
      { text: '1 · Too Strong' },
      { text: '2 · Bad Match' },
      { text: '4 · Wrong Flaw' },
      { text: '5 · Contradicted' },
    ],
    correctIndex: 2,
    explanation:
      'Wrong Flaw. The label sounds familiar (correlation/causation is famous), so your brain accepts it. But the stimulus is a conditional argument, not a causal one. Verify the flaw is actually committed before selecting. Group 2 distractors live here.',
    difficulty: 'Medium',
    primaryConcept: 'trap-pattern',
  },
];

// Day 6 — Live Fire (real PT-cited) — capstone by spec
const day6Items: Question[] = [
  {
    id: 'M4-Q14',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-1',
    sourcePT: 'PT 17 · S2 · Q10 territory',
    stimulus:
      'Cafeteria patron: The apples sold here are greasy. The cashier said the apples come in that condition and the cafeteria does not wash them. Most fruit is sprayed with dangerous pesticides before harvest, and is dangerous until washed. Clearly, the cafeteria is selling pesticide-covered fruit.',
    stem: 'Name the flaw (PT 17 territory).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Sampling — the patron only knows about these apples' },
      { text: 'Sleight of Hand — "greasy" is treated as evidence for "pesticide-covered"' },
      { text: 'Causal — the conclusion picks one cause for the grease' },
      { text: 'Ad Hominem — the cashier might not be reliable' },
    ],
    correctIndex: 1,
    explanation:
      'Premise establishes that the apples are greasy and that most fruit has pesticides. Conclusion says the apples have pesticides. Grease ≠ pesticides. The author silently equates two different concepts. Classic Sleight of Hand. (PT 17, S2, Q10 territory.)',
    difficulty: 'Hard',
    primaryConcept: 'sleight-of-hand',
  },
  {
    id: 'M4-Q15',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-2',
    sourcePT: 'June 2007 · S3 · Q21',
    stimulus:
      'On average, animals raised on grain must be fed sixteen pounds of grain to produce one pound of meat. Sixteen pounds of grain could feed many more people. With grain yields leveling off and population expanding, we must accept that consumption of meat will soon be morally unacceptable.',
    stem: 'Name the flaw (June 2007).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Causal' },
      { text: 'Sleight of Hand / Value Assumption' },
      { text: 'Sampling' },
      { text: 'Necessary vs. Sufficient' },
    ],
    correctIndex: 1,
    explanation:
      '"Morally unacceptable" appears in the conclusion. The premises never set up morality. The author treats "doesn\'t feed the most people" as equivalent to "morally unacceptable." That is the dangling-variable move, and because the new term is evaluative, the most precise label is Value Assumption (a specific case of Sleight of Hand). (June 2007, S3, Q21.)',
    difficulty: 'Hard',
    primaryConcept: 'value-assumptions',
  },
  {
    id: 'M4-Q16',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-3',
    sourcePT: 'PT 16 · S2 · Q10',
    stimulus:
      'A fundamental illusion in robotics is the belief that improvements in robots will liberate humanity from hazardous and demeaning work. Engineers are designing only those types of robots that can be properly maintained with the least expensive, least skilled human labor possible. Therefore, robots will not eliminate demeaning work — only substitute one type of demeaning work for another.',
    stem: 'Name the flaw (PT 16.2.10).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Value Assumption — "demeaning" is the author\'s judgment, not a fact in evidence' },
      { text: 'Necessary vs. Sufficient' },
      { text: 'Causal' },
      { text: 'Internal Contradiction' },
    ],
    correctIndex: 0,
    explanation:
      'The premise describes labor as "least expensive, least skilled." The conclusion calls it "demeaning." That is a value judgment, not a description in evidence. Cleaning floors is unskilled and many people find it perfectly fine. The label is the author\'s judgment, not a fact. (PT 16, S2, Q10.)',
    difficulty: 'Hard',
    primaryConcept: 'value-assumptions',
  },
  {
    id: 'M4-Q17',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-4',
    sourcePT: 'PT 16 · S2 · Q19',
    stimulus:
      "The Volunteers for Literacy Program would benefit if Dolores takes Victor's place as director, since Dolores is far more skillful than Victor at securing financial support and Dolores does not have Victor's propensity for alienating dedicated volunteers.",
    stem: 'Name the flaw (PT 16.2.19).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Causal' },
      { text: 'Sampling' },
      { text: 'Sleazy Sales Pitch' },
      { text: 'Sleight of Hand' },
    ],
    correctIndex: 2,
    explanation:
      "Dolores's strengths and Victor's weaknesses are listed. Dolores's weaknesses and Victor's strengths are nowhere. Classic one-sided pitch. The argument hides half the picture and hopes we don't notice. (PT 16, S2, Q19.)",
    difficulty: 'Hard',
    primaryConcept: 'sleazy-sales-pitch',
  },
  {
    id: 'M4-Q18',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-5',
    stimulus:
      "The latest Connolly Report suggests Ocksenfrey prepackaged meals are virtually devoid of nutritional value. But the Connolly Report is commissioned by Danto Foods, Ocksenfrey's largest corporate rival, and early drafts are submitted for approval to Danto's PR department. Because of the obvious bias of this report, it is clear that Ocksenfrey's prepackaged meals really are nutritious.",
    stem: 'Name the flaw (Connolly Report).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Ad Hominem only' },
      { text: 'Unproven vs. Proven False — bias makes the report unreliable, not its claim false' },
      { text: 'Equivocation' },
      { text: 'Sampling' },
    ],
    correctIndex: 1,
    explanation:
      'The author rejects the Connolly Report by attacking the source\'s bias, then concludes the OPPOSITE of what the report says. Even if the report is biased, that does not mean the meals are nutritious. It just means we do not know either way. Showing a witness has an axe to grind does not prove the witness was lying. Best label: Unproven vs. Proven False (with an Ad Hominem move along the way).',
    difficulty: 'Hard',
    primaryConcept: 'unproven-vs-proven-false',
  },
  {
    id: 'M4-Q19',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-6',
    stimulus:
      'All seasoned trial lawyers can think on their feet. Maya is a seasoned trial lawyer. Therefore, anyone who can think on their feet is a seasoned trial lawyer.',
    stem: 'Name the flaw (seasoned trial lawyers).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Necessary vs. Sufficient' },
      { text: 'Part vs. Whole' },
      { text: 'Sleight of Hand' },
      { text: 'Sampling' },
    ],
    correctIndex: 0,
    explanation:
      '"All seasoned trial lawyers can think on their feet" is sufficient → necessary. The conclusion reverses it. Plenty of people who think on their feet are not seasoned trial lawyers. Maya is a red herring; the structural error is in the conditional reversal.',
    difficulty: 'Medium',
    primaryConcept: 'necessary-vs-sufficient',
  },
  {
    id: 'M4-Q20',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-7',
    stimulus:
      'A recent survey of subscribers to Adventure Sports Magazine found that 78% had taken at least one extreme-sport vacation in the past year. Therefore, extreme sports are far more popular among the general public than previously believed.',
    stem: 'Name the flaw (Adventure Sports Magazine survey).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Causal' },
      { text: 'Sampling' },
      { text: 'Part vs. Whole' },
      { text: 'Inappropriate Appeal' },
    ],
    correctIndex: 1,
    explanation:
      'The sample (Adventure Sports Magazine subscribers) is unrepresentative of the general public. People who subscribe to Adventure Sports Magazine self-select for an interest in adventure sports. Generalizing from this sample to "the general public" is the textbook Sampling error.',
    difficulty: 'Medium',
    primaryConcept: 'sampling',
  },
  {
    id: 'M4-Q21',
    moduleId: 'famous-flaws-capstone',
    sourceId: 'd6-8',
    stimulus:
      'Either the company adopts the new safety protocol or it faces a regulatory fine. The company will not face a regulatory fine. Therefore, the company will adopt the new safety protocol AND productivity will increase.',
    stem: 'Name the flaw (safety protocol).',
    question: 'Which one of the following most accurately describes the flaw in the argument?',
    choices: [
      { text: 'Necessary vs. Sufficient' },
      { text: 'Sleight of Hand — productivity appears in the conclusion but never in the premises' },
      { text: 'Causal' },
      { text: 'Internal Contradiction' },
    ],
    correctIndex: 1,
    explanation:
      'The conditional logic part is fine: not-fine therefore protocol is a valid disjunctive syllogism. But "productivity will increase" appears in the conclusion with no premise support whatsoever. The author smuggles in productivity as if it follows from adopting the protocol. It does not. Sleight of Hand.',
    difficulty: 'Hard',
    primaryConcept: 'sleight-of-hand',
  },
];

// Pop-quiz items — trigger-phrase language classification.
// Source had prompt + type ('assumption'|'objection'|'match') + test.
// Migrated as 3-choice classification questions; correctIndex maps the source type.
const popQuizSource: { sourceId: string; prompt: string; type: 'assumption' | 'objection' | 'match'; test: string; partLabel: string }[] = [
  { sourceId: 'pq-1', prompt: 'Takes for granted that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-2', prompt: 'Fails to consider that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-3', prompt: 'Presumes that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-4', prompt: 'Overlooks the possibility that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-5', prompt: 'Ignores the possibility that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-6', prompt: 'Assumes that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-7', prompt: 'Fails to establish that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-8', prompt: 'Neglects to consider that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?', partLabel: 'Part 1 · Generic triggers' },
  { sourceId: 'pq-9', prompt: '"The author fails to consider that there are probably species in existence that have not yet been identified."', type: 'objection', test: 'If TRUE that species exist not yet identified, would that weaken the conclusion?', partLabel: 'Part 2 · Real LSAT choices' },
  { sourceId: 'pq-10', prompt: '"Ignores the possibility that the bottle contained an acidic liquid other than vinegar."', type: 'objection', test: 'If TRUE that the bottle contained an acidic liquid other than vinegar, would that weaken the conclusion?', partLabel: 'Part 2 · Real LSAT choices' },
  { sourceId: 'pq-11', prompt: '"Assumes that the fact of a labeling error is proof of an intention to deceive."', type: 'assumption', test: 'If a labeling error is NOT proof of an intention to deceive, does the argument crash?', partLabel: 'Part 2 · Real LSAT choices' },
  { sourceId: 'pq-12', prompt: '"Ignores the possibility that some food additives are harmful to most people."', type: 'objection', test: 'If TRUE that some food additives are harmful to most people, would that weaken the conclusion?', partLabel: 'Part 2 · Real LSAT choices' },
  { sourceId: 'pq-13', prompt: '"Presumes that most consumers heed the warning labels on beverage containers."', type: 'assumption', test: 'If most consumers do NOT heed the warning labels, does the argument crash?', partLabel: 'Part 2 · Real LSAT choices' },
  { sourceId: 'pq-14', prompt: '"Fails to consider that the economy might not improve."', type: 'objection', test: 'If TRUE that the economy might not improve, would that weaken the conclusion?', partLabel: 'Part 2 · Real LSAT choices' },
  { sourceId: 'pq-15', prompt: '"Ignores the possibility that the city council is not the only body that can make such decisions."', type: 'objection', test: 'If TRUE that the city council is not the only body, would that weaken the conclusion?', partLabel: 'Part 2 · Real LSAT choices' },
  { sourceId: 'pq-16', prompt: '"Assumes that the economy will improve in the near future."', type: 'assumption', test: 'If the economy will NOT improve in the near future, does the argument crash?', partLabel: 'Part 2 · Real LSAT choices' },
];

const TYPE_TO_INDEX: Record<'assumption' | 'objection' | 'match', number> = {
  assumption: 0,
  objection: 1,
  match: 2,
};

const popQuizItems: Question[] = popQuizSource.map((s, i) => ({
  id: `M4-Q${String(22 + i).padStart(2, '0')}`,
  moduleId: 'famous-flaws-capstone',
  sourceId: s.sourceId,
  stem: `${s.partLabel} — Classify the trigger phrase: ${s.prompt}`,
  choices: [
    { text: 'Assumption (Two-Step / Negation Test: make X FALSE, does the argument crash?)' },
    { text: 'Objection (Weakener Test: take Y TRUE, does the conclusion die?)' },
    { text: 'Match (Translation Test: do the abstract terms fit the actual structure?)' },
  ],
  correctIndex: TYPE_TO_INDEX[s.type],
  explanation: s.test,
  difficulty: 'Easy',
  primaryConcept: 'trigger-phrase-classification',
}));

// fallacies.ts — 40 placeholder items, all PT-cited, all invented: true.
const fallaciesPlaceholders: Question[] = Array.from({ length: 40 }, (_, i) => ({
  id: `M4-Q${String(38 + i).padStart(2, '0')}`,
  moduleId: 'famous-flaws-capstone' as QuestionModuleId,
  sourceId: `fal-${i + 1}`,
  placeholder: true,
  sourcePT: `Fallacy HW · Q${i + 1}`,
  stem: `[Placeholder · awaiting curriculum content for Fallacy HW · Q${i + 1}]`,
  choices: [],
  correctIndex: 0,
  explanation: '[Placeholder · curriculum content pending]',
  difficulty: 'Medium',
  primaryConcept: 'placeholder',
}));

// flaw-drill.ts — 30 placeholder items across 3 stages × 2 sets × 5 items.
const flawDrillSource: { sourceId: string; cite: string }[] = [
  // Stage 1 set 1
  { sourceId: 'fd-1-1-1', cite: 'PT116·S2·Q9' },
  { sourceId: 'fd-1-1-2', cite: 'PT119·S4·Q12' },
  { sourceId: 'fd-1-1-3', cite: 'PT120·S4·Q10' },
  { sourceId: 'fd-1-1-4', cite: 'PT120·S4·Q21' },
  { sourceId: 'fd-1-1-5', cite: 'PT122·S2·Q13' },
  // Stage 1 set 2 (timed)
  { sourceId: 'fd-1-2-1', cite: 'PT124·S2·Q11' },
  { sourceId: 'fd-1-2-2', cite: 'PT124·S2·Q13' },
  { sourceId: 'fd-1-2-3', cite: 'PT125·S2·Q1' },
  { sourceId: 'fd-1-2-4', cite: 'PT125·S4·Q19' },
  { sourceId: 'fd-1-2-5', cite: 'PT127·S3·Q4' },
  // Stage 2 set 1
  { sourceId: 'fd-2-1-1', cite: 'PT124·S2·Q23' },
  { sourceId: 'fd-2-1-2', cite: 'PT125·S2·Q22' },
  { sourceId: 'fd-2-1-3', cite: 'PT126·S1·Q20' },
  { sourceId: 'fd-2-1-4', cite: 'PT130·S4·Q5' },
  { sourceId: 'fd-2-1-5', cite: 'PT130·S4·Q14' },
  // Stage 2 set 2 (timed)
  { sourceId: 'fd-2-2-1', cite: 'PT133·S3·Q14' },
  { sourceId: 'fd-2-2-2', cite: 'PT136·S2·Q21' },
  { sourceId: 'fd-2-2-3', cite: 'PT136·S4·Q25' },
  { sourceId: 'fd-2-2-4', cite: 'PT137·S4·Q14' },
  { sourceId: 'fd-2-2-5', cite: 'PT138·S2·Q12' },
  // Stage 3 set 1
  { sourceId: 'fd-3-1-1', cite: 'PT125·S4·Q14' },
  { sourceId: 'fd-3-1-2', cite: 'PT128·S2·Q22' },
  { sourceId: 'fd-3-1-3', cite: 'PT130·S3·Q22' },
  { sourceId: 'fd-3-1-4', cite: 'PT134·S1·Q24' },
  { sourceId: 'fd-3-1-5', cite: 'PT134·S3·Q11' },
  // Stage 3 set 2 (timed)
  { sourceId: 'fd-3-2-1', cite: 'PT136·S2·Q13' },
  { sourceId: 'fd-3-2-2', cite: 'PT137·S3·Q19' },
  { sourceId: 'fd-3-2-3', cite: 'PT137·S4·Q21' },
  { sourceId: 'fd-3-2-4', cite: 'PT139·S4·Q11' },
  { sourceId: 'fd-3-2-5', cite: 'PT101·S2·Q8' },
];

const flawDrillPlaceholders: Question[] = flawDrillSource.map((s, i) => ({
  id: `M4-Q${String(78 + i).padStart(2, '0')}`,
  moduleId: 'famous-flaws-capstone' as QuestionModuleId,
  sourceId: s.sourceId,
  placeholder: true,
  sourcePT: s.cite,
  stem: `[Placeholder · awaiting curriculum content for ${s.cite}]`,
  choices: [],
  correctIndex: 0,
  explanation: '[Placeholder · curriculum content pending]',
  difficulty: 'Medium',
  primaryConcept: 'placeholder',
}));

// abstract-language.ts — 20 placeholder items, 2 sets × 10.
const abstractLangPlaceholders: Question[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `M4-Q${String(108 + i).padStart(2, '0')}`,
    moduleId: 'famous-flaws-capstone' as QuestionModuleId,
    sourceId: `abs-1-${i + 1}`,
    placeholder: true as const,
    sourcePT: `Abstract Set 1 · Q${i + 1}`,
    stem: `[Placeholder · awaiting curriculum content for Abstract Set 1 · Q${i + 1}]`,
    choices: [],
    correctIndex: 0,
    explanation: '[Placeholder · curriculum content pending]',
    difficulty: 'Medium' as const,
    primaryConcept: 'placeholder',
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `M4-Q${String(118 + i).padStart(2, '0')}`,
    moduleId: 'famous-flaws-capstone' as QuestionModuleId,
    sourceId: `abs-2-${i + 1}`,
    placeholder: true as const,
    sourcePT: `Abstract Set 2 · Q${i + 1}`,
    stem: `[Placeholder · awaiting curriculum content for Abstract Set 2 · Q${i + 1}]`,
    choices: [],
    correctIndex: 0,
    explanation: '[Placeholder · curriculum content pending]',
    difficulty: 'Medium' as const,
    primaryConcept: 'placeholder',
  })),
];

const module4Questions: Question[] = [
  ...day1Items,
  ...day2Items,
  ...day5MetaItems,
  ...day6Items,
  ...popQuizItems,
  ...fallaciesPlaceholders,
  ...flawDrillPlaceholders,
  ...abstractLangPlaceholders,
];

export const ALL_QUESTIONS: Record<QuestionModuleId, Question[]> = {
  'causal-flaws': module1Questions,
  'conditional-flaws': module2Questions,
  'sampling-comparison-scope': module3Questions,
  'famous-flaws-capstone': module4Questions,
};

const allQuestionsFlat = Object.values(ALL_QUESTIONS).flat();

export const getQuestionById = (id: string): Question | undefined => {
  return allQuestionsFlat.find(q => q.id === id);
};
