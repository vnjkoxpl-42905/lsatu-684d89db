/* =========================================================================
   Structure Bootcamp · Data
   - SIM_QUESTIONS: 6 hand-curated PT-format Main Conclusion questions
   - TRAITS: the 7 wrong-answer trap traits with body/fingerprint/defense
   - MODULES: the 8 sequenced modules of the guided bootcamp
   ========================================================================= */

export type ModuleId =
  | 'foundations' | 'two-part' | 'fabs' | 'xray'
  | 'shapes' | 'trojan' | 'traps' | 'simulator';

export interface ModuleMeta { id: ModuleId; n: string; title: string; }

export const MODULES: ModuleMeta[] = [
  { id: 'foundations', n: '01', title: 'Foundations' },
  { id: 'two-part',    n: '02', title: 'The 2-Part Check' },
  { id: 'fabs',        n: '03', title: 'FABS · The Premise Quartet' },
  { id: 'xray',        n: '04', title: 'X-Ray the Structure' },
  { id: 'shapes',      n: '05', title: 'Argument Shapes' },
  { id: 'trojan',      n: '06', title: 'Trojan Horse Concession' },
  { id: 'traps',       n: '07', title: 'The 7 Traps' },
  { id: 'simulator',   n: '08', title: 'Prove It · Simulator' },
];

/* ─── Trait definitions ─────────────────────────────────────────────────── */
export interface Trait { n: number; name: string; full_title: string; body: string; fingerprint: string; defense: string; }

export const TRAITS: Trait[] = [
  { n: 1, name: 'Premise Impersonator', full_title: 'Trait 1 — Premise Impersonator',
    body: 'The answer restates a premise from the stimulus. It is a true statement — it just doesn\'t have anything supporting it. The test makers bank on you confusing "said in the stimulus" with "what the argument proves."',
    fingerprint: 'Words from the stimulus, usually early sentences. Often sounds important or factual. Passes the 2-Part Check\'s first gate but fails the second.',
    defense: 'For every candidate, ask: is there support for this in the stimulus, or is it just stated? If just stated, it is a premise — eliminate.' },
  { n: 2, name: 'Unsupported Framing', full_title: 'Trait 2 — Unsupported Framing',
    body: 'A broader claim the author seems to believe but never actually argues for. It often sounds like the "point" of the whole discussion — but the argument doesn\'t earn it.',
    fingerprint: 'Bigger-picture language. Sounds like what the argument is "really about." Would require additional evidence the stimulus doesn\'t provide.',
    defense: 'Stay inside the stimulus. If the answer adds a dimension the stimulus never addressed, it is unsupported framing.' },
  { n: 3, name: 'Intermediate Conclusion', full_title: 'Trait 3 — Intermediate Conclusion',
    body: 'The argument has multiple conclusions. One supports the other. The trap answer picks a real conclusion — just not the main one. It is supported by premises AND supports the main conclusion.',
    fingerprint: 'A claim that is both "because" and "therefore" at the same time. Appears in multi-step arguments where one deduction leads to another.',
    defense: 'Map every claim. For each, ask: does it support anything else? If yes, it is intermediate. The main conclusion supports nothing further.' },
  { n: 4, name: 'Scope Drift', full_title: 'Trait 4 — Scope Drift',
    body: 'The answer looks like the conclusion but swaps a key term, shifts groups, adds a modal ("must," "always"), or removes a qualifier. Close — but wrong.',
    fingerprint: 'Starts strong, then changes something specific. Often adds absolute language the stimulus doesn\'t use. Compare word-for-word against the stimulus.',
    defense: 'Pre-phrase the conclusion before reading the choices. Then match exactly. Any deviation is a red flag.' },
  { n: 5, name: 'Policy Creep', full_title: 'Trait 5 — Policy Creep',
    body: 'The argument concludes something descriptive (this is the case), but the trap answer turns it into a prescription (we should do X). Or the argument is local but the answer universalizes it.',
    fingerprint: 'Language like "should," "ought to," "everyone should." The stimulus never made a recommendation — only a claim about how things are.',
    defense: 'Notice whether the argument is descriptive or prescriptive. Match type.' },
  { n: 6, name: 'Reversal', full_title: 'Trait 6 — Reversal',
    body: 'The answer reverses the logical direction. Instead of A → B, it says B → A. The terms are right — the relationship is backwards.',
    fingerprint: 'If/then structures that swap antecedent and consequent. "In order to X, you must Y" reversed from "Y will lead to X."',
    defense: 'Draw a quick arrow diagram. Which thing supports which? The answer must match the direction.' },
  { n: 7, name: 'Correct-But-Not-Conclusion', full_title: 'Trait 7 — Correct But Not the Conclusion',
    body: 'The answer is true and even follows from the stimulus — it just isn\'t the main conclusion. Might be a corollary or accurate implication. True ≠ conclusion.',
    fingerprint: 'Feels right. Passes casual inspection. Is a valid inference from the stimulus — but the argument concluded something more specific.',
    defense: 'Truth is not the test. The test is: is this the point the argument was trying to prove? Ask what the support structure points at.' },
];

export const TRAIT_NAMES: Record<number, string> = TRAITS.reduce((acc, t) => ({ ...acc, [t.n]: t.name }), {});

/* ─── Simulator questions (curated 6) ───────────────────────────────────── */
export interface Choice { letter: string; text: string; }
export interface AuditEntry { letter: string; verdict?: string; text: string; correct?: boolean; }
export interface Question {
  id: string; ref: string; structure_family: string;
  stimulus: string; stem: string;
  choices: Choice[]; correct_letter: string;
  trait_tags: Record<string, number | null>;
  coach: { structure_map: string; core_move: string; audit: AuditEntry[]; };
}

export const SIM_QUESTIONS: Question[] = [
  {
    id: 'sim-pt58-s1-q13', ref: 'PT58 S1 Q13', structure_family: 'first-sentence',
    stimulus: "It is a given that to be an intriguing person, one must be able to inspire the perpetual curiosity of others. Constantly broadening one's abilities and extending one's intellectual reach will enable one to inspire that curiosity. For such a perpetual expansion of one's mind makes it impossible to be fully comprehended, making one a constant mystery to others.",
    stem: 'Which one of the following most accurately expresses the conclusion drawn in the argument?',
    choices: [
      { letter: 'A', text: "To be an intriguing person, one must be able to inspire the perpetual curiosity of others." },
      { letter: 'B', text: "If one constantly broadens one's abilities and extends one's intellectual reach, one will be able to inspire the perpetual curiosity of others." },
      { letter: 'C', text: "If one's mind becomes impossible to fully comprehend, one will always be a mystery to others." },
      { letter: 'D', text: "To inspire the perpetual curiosity of others, one must constantly broaden one's abilities." },
      { letter: 'E', text: "If one constantly broadens one's abilities, one will always have curiosity." },
    ],
    correct_letter: 'B',
    trait_tags: { A: 1, C: null, D: 7, E: 4 },
    coach: {
      structure_map: 'Sentence 1 sets a standard for being intriguing (background framing). Sentence 2 makes the key claim: what will enable that curiosity. Sentence 3 gives the reason — why expansion makes you a mystery. Sentence 2 is the conclusion because Sentence 3 supports it.',
      core_move: 'The trap is that Sentence 1 sounds like a conclusion — broad and confident. But it is not supported. The conclusion is the statement the argument earns with support.',
      audit: [
        { letter: 'A', verdict: 'UNSUPPORTED', text: 'Restates the opening framing. It sounds important, but the argument never proves it. Unsupported statements are not conclusions.' },
        { letter: 'B', text: 'Matches the supported claim in Sentence 2. Sentence 3 is offered as its reason — B is the conclusion.', correct: true },
        { letter: 'C', text: 'A supporting point. Used to explain the mechanism, not to deliver a verdict.' },
        { letter: 'D', text: 'Reverses the dependency. The stimulus said expansion enables curiosity, not that curiosity requires expansion as the only path.' },
        { letter: 'E', verdict: 'SCOPE DRIFT', text: 'Drops "perpetual curiosity" and substitutes "always have curiosity." Scope drift.' },
      ],
    },
  },
  {
    id: 'sim-pt24-s2-q12', ref: 'PT24 S2 Q12', structure_family: 'rebuttal',
    stimulus: "For years scientists have been scanning the skies in the hope of finding life on other planets. But in spite of the ever-increasing sophistication of the equipment they employ, some of it costing hundreds of millions of dollars, not the first shred of evidence of such life has been forthcoming. And there is no reason to think that these scientists will be any more successful in the future, no matter how much money is invested in the search. The dream of finding extraterrestrial life is destined to remain a dream, as science's experience up to this point should indicate.",
    stem: 'Which one of the following most accurately expresses the main conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'There is no reason to believe that life exists on other planets.' },
      { letter: 'B', text: 'The equipment that scientists employ is not as sophisticated as it should be.' },
      { letter: 'C', text: 'Scientists searching for extraterrestrial life will not find it.' },
      { letter: 'D', text: 'Only if scientists had already found evidence of life on other planets would continued search be justified.' },
      { letter: 'E', text: 'We should not spend money on sophisticated equipment to aid in the search for extraterrestrial life.' },
    ],
    correct_letter: 'C',
    trait_tags: { A: 2, B: 1, D: 4, E: 5 },
    coach: {
      structure_map: 'Sentence 1 is background framing. Sentence 2 reports a fact (no evidence found). Sentence 3 extends the claim into the future. Sentence 4 delivers the verdict — the dream is destined to remain a dream.',
      core_move: 'Trait 5 traps you with answers that sound like sensible advice. Stay narrow. The conclusion is a prediction about the outcome of the search — not a policy about funding.',
      audit: [
        { letter: 'A', verdict: 'SCOPE DRIFT', text: 'Too broad. The author argued about whether the search will find evidence — not about whether life exists.' },
        { letter: 'B', verdict: 'UNSUPPORTED', text: 'The stimulus mentions equipment but never argues it is insufficient.' },
        { letter: 'C', text: 'Matches the verdict in Sentence 4 — the dream of finding extraterrestrial life is destined to remain a dream.', correct: true },
        { letter: 'D', verdict: 'SCOPE DRIFT', text: 'Reverses the implication and adds a conditional the stimulus never supported.' },
        { letter: 'E', verdict: 'POLICY CREEP', text: 'A recommendation the author would likely endorse — but not what they argued for. Stay narrow.' },
      ],
    },
  },
  {
    id: 'sim-tomato', ref: 'tomato/fruit', structure_family: 'rebuttal',
    stimulus: "Tomatoes grow on a vine to about the size of a baseball. Most people believe that tomatoes are vegetables, since tomatoes are often found in salads and savory dishes. But they are wrong. After all, although tomatoes are never found in fruit salads, tomatoes have seeds and so they are fruit.",
    stem: 'Which one of the following most accurately expresses the conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'Tomatoes are often found in salads and savory dishes.' },
      { letter: 'B', text: 'Tomatoes have seeds.' },
      { letter: 'C', text: 'Tomatoes are not vegetables.' },
      { letter: 'D', text: 'Tomatoes grow on a vine to about the size of a baseball.' },
      { letter: 'E', text: 'Most people are wrong about what counts as a fruit.' },
    ],
    correct_letter: 'C',
    trait_tags: { A: 1, B: 1, D: null, E: 5 },
    coach: {
      structure_map: 'Sentence 1 is background. Sentence 2 is the opposing view. Sentence 3 ("But they are wrong") is the rebuttal — the implicit conclusion. Sentence 4 supplies support: tomatoes have seeds, so they are fruit.',
      core_move: 'The conclusion is "Tomatoes are not vegetables" — but this exact sentence is never written. The author says "they are wrong," pointing back at the opposing view. Pre-phrase: unpack what "they are wrong" means, then match.',
      audit: [
        { letter: 'A', verdict: 'PREMISE TRAP', text: 'Words from the opposing view\'s premise — not what the author argued for.' },
        { letter: 'B', verdict: 'PREMISE TRAP', text: 'A premise the author uses to support the intermediate conclusion. Not the main conclusion.' },
        { letter: 'C', text: 'The unpacked rebuttal. "They are wrong" + the opposing view = "Tomatoes are not vegetables."', correct: true },
        { letter: 'D', text: 'Background framing. Not part of the argument\'s logical core.' },
        { letter: 'E', verdict: 'TOO STRONG', text: 'A bigger-picture claim the author might agree with — but not what was argued.' },
      ],
    },
  },
  {
    id: 'sim-recycling', ref: 'recycling', structure_family: 'first-sentence',
    stimulus: "Implementing a new recycling program in our community is essential. Many towns across the country have successfully reduced their environmental impact, and recycling programs have been shown to decrease the amount of waste in landfills.",
    stem: 'Which one of the following most accurately expresses the conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'Implementing a new recycling program in our community is essential.' },
      { letter: 'B', text: 'Many towns have successfully reduced their environmental impact.' },
      { letter: 'C', text: 'Recycling programs decrease the amount of waste in landfills.' },
      { letter: 'D', text: 'Every community should adopt a recycling program.' },
      { letter: 'E', text: 'Without recycling, communities cannot reduce waste.' },
    ],
    correct_letter: 'A',
    trait_tags: { B: 1, C: 1, D: 5, E: 4 },
    coach: {
      structure_map: 'Sentence 1 is the conclusion ("essential" is an opinion indicator). Sentence 2 supplies two parallel premises as support.',
      core_move: 'First-sentence stash. The author opens with the recommendation, then defends it with two facts. 2-Part Check: opinion? Yes ("essential"). Supported? Yes. Confirmed.',
      audit: [
        { letter: 'A', text: 'Matches the opinion-marked first sentence with full support behind it.', correct: true },
        { letter: 'B', verdict: 'PREMISE TRAP', text: 'Premise. Used to support the conclusion, not the conclusion itself.' },
        { letter: 'C', verdict: 'PREMISE TRAP', text: 'Premise. Describes evidence, not the verdict.' },
        { letter: 'D', verdict: 'TOO STRONG', text: 'A bigger claim the author might endorse, but they argued only about their own community.' },
        { letter: 'E', verdict: 'SCOPE DRIFT', text: 'Modal shift to "cannot." The author said recycling is essential — not that nothing else could work.' },
      ],
    },
  },
  {
    id: 'sim-govt-ed', ref: 'government / education', structure_family: 'rebuttal',
    stimulus: "The government argues that reducing educational spending will help address budget deficits. But it is clear that the government's decision to cut funding for public education is misguided. Cutting funding for education can lead to a decline in the quality of public schools and hinder future economic development.",
    stem: 'Which one of the following most accurately expresses the main conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'Reducing educational spending will help address budget deficits.' },
      { letter: 'B', text: "The government's decision to cut funding for public education is misguided." },
      { letter: 'C', text: 'Cutting funding for education leads to a decline in the quality of public schools.' },
      { letter: 'D', text: 'Public schools will hinder future economic development.' },
      { letter: 'E', text: 'The government should never reduce spending on any program.' },
    ],
    correct_letter: 'B',
    trait_tags: { A: 1, C: 7, D: 4, E: 5 },
    coach: {
      structure_map: 'Sentence 1 attributes a position to the government (opposing view). Sentence 2 pivots with "But" and delivers the verdict ("misguided"). Sentence 3 supplies support.',
      core_move: 'Two-stash: opposing view first, "But" pivot, then the author\'s claim. The pivot sentence is the conclusion. "Misguided" is the opinion fingerprint.',
      audit: [
        { letter: 'A', verdict: 'OPPOSING', text: "The government's view, not the author's. The opposing position can never be the main conclusion." },
        { letter: 'B', text: '"It is clear that... is misguided" is the author\'s verdict after the pivot.', correct: true },
        { letter: 'C', verdict: 'INTERMEDIATE', text: 'Supports the main conclusion but is itself supported by other claims. Intermediate, not main.' },
        { letter: 'D', verdict: 'SCOPE DRIFT', text: 'Misreads the support — the stimulus said cutting funding hinders development, not that schools do.' },
        { letter: 'E', verdict: 'TOO STRONG', text: 'Author would agree with the local case but never argued the universal claim. Stay narrow.' },
      ],
    },
  },
  {
    id: 'sim-tannisch', ref: 'Tannisch / fingerprints', structure_family: 'first-sentence',
    stimulus: "The only fingerprints found at the scene are those of the owner, Mr. Tannisch. Therefore, whoever now has the guest's missing diamonds must have worn gloves.",
    stem: 'Which one of the following most accurately expresses the conclusion of the argument?',
    choices: [
      { letter: 'A', text: 'The only fingerprints found are those of Mr. Tannisch.' },
      { letter: 'B', text: "Whoever now has the guest's missing diamonds must have worn gloves." },
      { letter: 'C', text: 'Mr. Tannisch did not steal the diamonds.' },
      { letter: 'D', text: 'The thief did not leave any evidence.' },
      { letter: 'E', text: 'Anyone who steals diamonds wears gloves.' },
    ],
    correct_letter: 'B',
    trait_tags: { A: 1, C: 5, D: 4, E: 4 },
    coach: {
      structure_map: 'Sentence 1 is the premise (a fact about fingerprints). "Therefore" introduces sentence 2, the conclusion (the deduction about gloves).',
      core_move: 'Conclusion indicator "Therefore" pointing forward. The 2-Part Check passes: opinion-style claim ("must have"), supported by the fingerprint fact.',
      audit: [
        { letter: 'A', verdict: 'PREMISE TRAP', text: 'Premise. Used to support the conclusion.' },
        { letter: 'B', text: 'Matches the post-"therefore" claim. Modal "must have" is the opinion marker.', correct: true },
        { letter: 'C', verdict: 'UNSUPPORTED', text: 'The author would likely agree, but never argued this.' },
        { letter: 'D', verdict: 'SCOPE DRIFT', text: 'Too broad — fingerprints were the only kind of evidence discussed.' },
        { letter: 'E', verdict: 'TOO STRONG', text: 'Universal claim. The argument was about this case, not all diamond thieves.' },
      ],
    },
  },
];
