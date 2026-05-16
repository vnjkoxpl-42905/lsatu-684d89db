import type { FlawEntry } from '../types/flaw';

export const catalog: FlawEntry[] = [
  // ───────────────────────── Group 1 ─────────────────────────
  {
    slug: 'necessary-vs-sufficient',
    name: 'Necessary vs. Sufficient',
    number: 1,
    group: 'g1',
    groupLabel: 'Group 1 · Real Flaw',
    frequency: 'Very High',
    definition:
      'Illegally thinking through a conditional rule backwards or in the opposite direction. Mistaking what is required for what is guaranteed.',
    stimulusTells:
      'An "if X then Y" rule appears in the premises. The conclusion either reverses it ("Y therefore X") or negates it ("not X therefore not Y") instead of contrapositing.',
    disguises: [
      'Confuses a necessary condition with a sufficient condition.',
      'Mistakes a condition required if a certain result is to obtain for a condition that by itself is sufficient to guarantee that result.',
      'From the assertion that something is necessary to a moral order, the argument concludes that the thing is sufficient for an element of the moral order to be realized.',
      'Confuses a condition that ensures the truth of another condition for one that is necessary for the truth of that condition.',
      'From the claim that X implies Y, the argument concludes that Y implies X.',
      'Treats a condition under which a phenomenon occurs as the only condition under which it occurs.',
    ],
    workedExample:
      'People who have seen The 13th have a great understanding of the US prison system. Since Megan hasn’t seen it, she must have a poor understanding of the US prison system.',
    workedAnalysis:
      'The author negates: seeing the film is sufficient for understanding, not necessary. Megan could understand the prison system from a textbook, a podcast, a relative who’s been through it, anything.',
    whatIfCounter: 'What if Megan understands the system through some other means besides seeing the film?',
    disambiguateFrom: [
      { other: 'Causal', question: 'Is the relationship a logical condition or cause-and-effect?' },
      { other: 'Sleight of Hand', question: 'Are the conditional terms defined consistently?' },
    ],
  },
  {
    slug: 'causal',
    name: 'Causal',
    number: 2,
    group: 'g1',
    groupLabel: 'Group 1 · Real Flaw',
    frequency: 'Very High',
    definition:
      'Concluding one specific cause for a correlation when other interpretations exist. Whenever the LSAT concludes or assumes A causes B, 99.9% of the time it’s wrong.',
    stimulusTells:
      'A correlation, coincidence, or co-occurrence is described, then the conclusion picks ONE causal direction. The author always ignores reverse causation, third-variable causation, and pure coincidence.',
    disguises: [
      'Fails to rule out the possibility that what appears to be the result of a given condition may in fact be the cause of that condition.',
      'Mistakes a correlation between two phenomena for evidence that one causes the other.',
      'Fails to consider that the correlation may be explained by a third factor.',
      'Treats one possible explanation for a phenomenon as if it were the only explanation.',
      'Fails to rule out alternative causes for the observed effect.',
      'Concludes that A causes B merely because A and B occur together.',
    ],
    workedExample:
      'People who are enlisted in the military are more likely than civilians to have excellent physiques. Clearly, military recruiters select applicants based on their fitness.',
    workedAnalysis:
      'Maybe military training causes the physique (B caused A). Maybe people who already exercise are the ones who enlist (selection effect). Maybe it’s coincidence. The argument picked one explanation out of three.',
    whatIfCounter: 'What if the military training itself produces the physique? What if a third factor like youth or self-discipline explains both?',
    disambiguateFrom: [
      { other: 'Sampling', question: 'Is the problem the data, or the leap from the data?' },
    ],
    crossLink: 'Causation module covers this in depth. The catalog entry is the Flaw-recognition surface only.',
  },
  {
    slug: 'part-vs-whole',
    name: 'Part vs. Whole',
    number: 3,
    group: 'g1',
    groupLabel: 'Group 1 · Real Flaw',
    frequency: 'High',
    definition: 'Assuming what is true of the parts is true of the whole, or vice versa.',
    stimulusTells:
      'A property is established about either every member of a group, then concluded about the group as a whole, or about the group as a whole, then concluded about every member.',
    disguises: [
      'Assumes that what is true of the individual members of a group is necessarily true of the group as a whole.',
      'Infers from a property of a collective a property of its individual members.',
      'Treats a characteristic of the parts as if it must be a characteristic of the whole.',
      'It is assumed that what is true of persons individually is true of a country as a whole.',
      'Mistakes a property of a constituent for a property of the system that contains it.',
    ],
    workedExample:
      'Just because each member of the team is efficient doesn’t mean that the team will be efficient. Reverse: rat poison is harmful if ingested, so each ingredient in rat poison must also be harmful if ingested.',
    workedAnalysis:
      'An efficient individual on a team that doesn’t coordinate produces an inefficient team. And some individual ingredients (water, sugar) are perfectly safe — harm emerges from the combination.',
    whatIfCounter: 'What if the parts have a property that doesn’t carry to the whole? What if the whole has a property that doesn’t reduce to the parts?',
    disambiguateFrom: [
      { other: 'Sampling', question: 'Is the move sample-to-population or part-to-whole?' },
    ],
  },
  {
    slug: 'unproven-vs-proven-false',
    name: 'Unproven vs. Proven False',
    number: 4,
    group: 'g1',
    groupLabel: 'Group 1 · Real Flaw',
    frequency: 'High',
    definition:
      'Concluding that because something hasn’t been proven true, it must be false. Or because someone provided a weak argument FOR a claim, the claim itself must be wrong.',
    stimulusTells:
      'The author points out a lack of evidence and concludes the opposite. Or attacks an argument’s quality and concludes the argument’s claim is false.',
    disguises: [
      'Treats the failure to establish that a certain claim is false as equivalent to a demonstration that that claim is true.',
      'Treats the failure to prove a claim as evidence of the falsity of that claim.',
      'Concludes that a claim is false merely because an inadequate argument has been offered in support of it.',
      'Takes an absence of evidence to be evidence of absence.',
      'Rejects a claim because no proof has been provided that it is true.',
    ],
    workedExample:
      'Many people think that COVID can be transmitted via sharing a stick of lip balm. But this is not true because no study has thus far demonstrated transmission occurring in this way.',
    workedAnalysis: 'No study yet means we don’t know, not that it can’t happen.',
    whatIfCounter: 'What if the absence of evidence is just absence of evidence, not evidence of absence?',
    disambiguateFrom: [
      { other: 'Ad Hominem', question: 'Is the author attacking the claim, the evidence, or the speaker?' },
    ],
  },
  {
    slug: 'ad-hominem',
    name: 'Ad Hominem',
    number: 5,
    group: 'g1',
    groupLabel: 'Group 1 · Real Flaw',
    frequency: 'Medium-High',
    definition:
      'Dismissing an argument or point of view based on an attack on the source rather than the claim itself. The LSAT version is often subtler than the textbook version. Not always a personal insult. Often pointing out the source’s bias or self-interest.',
    stimulusTells:
      'The author rejects a claim by pointing out something about the speaker (their bias, their motive, their past behavior, their identity) rather than addressing the claim’s content.',
    disguises: [
      'Casts doubt on the reliability of a study by questioning the motives of those reporting it.',
      'Attempts to undermine the legislators’ credibility instead of addressing their argument.',
      'Dismisses a claim by pointing to the personal characteristics of the person making the claim.',
      'Rejects a position because of a perceived conflict of interest of the source.',
      'Treats a person’s bias as if it were evidence against their argument.',
    ],
    workedExample:
      'My friend Sameer says social workers would respond to domestic abuse calls better than armed police. But we can ignore him, since he is a social worker and would benefit from the change.',
    workedAnalysis: 'Sameer’s job doesn’t make his argument wrong. Address what he said, not who he is.',
    whatIfCounter: 'What if the source is biased AND right? Bias affects credibility. It doesn’t reverse truth.',
    disambiguateFrom: [
      { other: 'Unproven vs. Proven False', question: 'Is the target the speaker or the evidence?' },
    ],
  },
  {
    slug: 'sampling',
    name: 'Sampling',
    number: 6,
    group: 'g1',
    groupLabel: 'Group 1 · Real Flaw',
    frequency: 'High',
    definition: 'Generalizing from a sample that is too small, biased, or unrepresentative.',
    stimulusTells:
      'A study, survey, or set of examples is reported, then a sweeping conclusion is drawn about a much larger population.',
    disguises: [
      'Generalizes from a sample that is unlikely to be representative of public sentiment.',
      'Too hastily reaches a general conclusion on the basis of a few examples.',
      'Relies on the opinions of a group of people who are likely to be inclined to agree with the author.',
      'Generalizes from atypical occurrences.',
      'Infers limits on ability from a few isolated lapses in performance.',
      'Presumes, without providing justification, that the people surveyed based their responses on a random sampling.',
    ],
    workedExample:
      'Today’s youth prefer comic books to literature. After all, in a survey conducted at Comic-Con, over 85% of young people preferred comics over novels.',
    workedAnalysis:
      'A sample of comic-convention attendees does not generalize to "today’s youth." The sample selected for exactly the trait being measured.',
    whatIfCounter: 'What if the sample isn’t representative of the population the conclusion describes?',
    disambiguateFrom: [
      { other: 'Hasty Generalization', question: 'Is the problem the size, the selection method, or both?' },
      { other: 'Causal', question: 'Is the conclusion a population claim or a causation claim?' },
    ],
  },
  // ───────────────────────── Group 2 ─────────────────────────
  {
    slug: 'circular-reasoning',
    name: 'Circular Reasoning',
    number: 7,
    group: 'g2',
    groupLabel: 'Group 2 · Distractor',
    frequency: 'Low',
    rightAnswerFreq: 'Low',
    definition:
      'The premise is a restatement or assumption of the conclusion. The argument provides no real support; it just says the conclusion twice.',
    stimulusTells:
      'The premise and conclusion say the same thing in different words. Pure circular reasoning is rare on the LSAT. When you see "circular" in an answer choice, it’s usually wrong.',
    disguises: [
      'Assumes what it is trying to prove.',
      'Presupposes what it seeks to establish.',
      'The argument’s conclusion is presupposed in the definition it gives of [its key term].',
      'The claim that X is mistaken is both a premise and a conclusion in the argument.',
    ],
    workedExample:
      'The LSAT is clearly the hardest graduate school test because all the other tests people take to go to grad school pale in comparison to the difficulty of the LSAT.',
    whatIfCounter: 'What if the argument actually has a separate, non-circular premise that supports the conclusion? Then this label doesn’t apply.',
    notes:
      'Real circular reasoning is short and self-referential, not elaborate. Be especially suspicious when the argument has a long string of premises.',
  },
  {
    slug: 'internal-contradiction',
    name: 'Internal Contradiction',
    number: 8,
    group: 'g2',
    groupLabel: 'Group 2 · Distractor',
    frequency: 'Low',
    rightAnswerFreq: 'Low',
    definition: 'Something the author says undermines or contradicts something else they say.',
    stimulusTells:
      'Two statements the author makes can’t both be true. Rare in real Flaw stimuli.',
    disguises: [
      'Contradicts itself.',
      'Includes premises that are inconsistent with one another.',
      'Asserts a claim that, if true, would undermine the argument’s own conclusion.',
    ],
    workedExample:
      'The LSAT is an incredibly challenging test for anyone who takes it. However, if you commit to Eddie Spaghetti’s Steady LSAT Readiness protocol, you will soon feel like the LSAT is no harder than a kindergarten spelling quiz.',
    whatIfCounter: 'What if the two statements only seem contradictory? Verify the contradiction is real.',
    notes: 'Almost never the right answer. Be very suspicious.',
  },
  {
    slug: 'equivocation',
    name: 'Equivocation',
    number: 9,
    group: 'g2',
    groupLabel: 'Group 2 · Distractor',
    frequency: 'Low-Medium',
    rightAnswerFreq: 'Low-Medium',
    definition:
      'Using the same word or phrase to mean two different things in the same argument. The shift in meaning is often subtle.',
    stimulusTells:
      'A single key term appears in both a premise and the conclusion, but the meaning has shifted between uses. Textbook example: "fine for parking" (penalty) vs. "fine" (acceptable).',
    disguises: [
      'Equivocates with respect to a central concept.',
      'The term “X” is used ambiguously in the argument.',
      'Treats two fundamentally different conceptions of [a concept] as essentially the same.',
      'Relies on multiple meanings of a single term.',
    ],
    workedExample:
      'Some question whether Egypt condones Romania’s recent military buildup. But clearly, Egypt sanctions this activity, since after the military’s actions, Egypt issued sanctions against Romania.',
    workedAnalysis: '"Sanctions" means approves AND penalizes. The author exploits the double meaning.',
    whatIfCounter: 'What if the same word actually carries the same meaning across both uses?',
    disambiguateFrom: [
      { other: 'Sleight of Hand', question: 'Same word being used twice, or two different words being treated as equivalent?' },
    ],
  },
  {
    slug: 'inappropriate-appeal',
    name: 'Inappropriate Appeal',
    number: 10,
    group: 'g2',
    groupLabel: 'Group 2 · Distractor',
    frequency: 'Low',
    rightAnswerFreq: 'Low',
    definition: 'Relying on sympathy, popular opinion, or an irrelevant authority figure rather than evidence.',
    stimulusTells:
      'The premise is "an authority said so" (where the authority isn’t actually qualified on the subject), or "everyone agrees," or "have pity on the speaker."',
    disguises: [
      'Too readily accepts a claim by appeal to inappropriate authority.',
      'Relies on the judgment of experts in a matter to which their expertise is irrelevant.',
      'A claim is inferred to be false merely because a majority of people believe it to be false.',
      'Appeals to the popularity of a position as if popularity established its truth.',
    ],
    workedExample:
      'Dr. Fauci, the government’s leading expert in infectious diseases, says that coronavirus can’t be transmitted by sharing hats. But my friend Brandy says it can. Dr. Fauci must be wrong!',
    workedAnalysis: 'Brandy is not an authority on infectious disease.',
    whatIfCounter: 'What if the cited authority actually IS qualified on this exact question?',
  },
  // ───────────────────────── Group 3 ─────────────────────────
  {
    slug: 'sleight-of-hand',
    name: 'Sleight of Hand (a.k.a. Dangling Variable)',
    number: 11,
    group: 'g3',
    groupLabel: 'Group 3 · House-Named',
    frequency: 'Extreme',
    definition:
      'New words appear in the conclusion that weren’t in the premises. The author pretends these new words are "basically" the same as different words from the premises. Nothing is basically the same on the LSAT.',
    stimulusTells:
      'A key term in the conclusion does not appear (or does not appear in this form) in any premise. The author silently equates two non-equivalent concepts.',
    disguises: [
      'Treats two fundamentally different concepts as essentially the same.',
      'Conflates [term in premises] with [term in conclusion].',
      'Assumes that [term in premises] is necessarily equivalent to [term in conclusion].',
      'Fails to establish that [premise term] is the same as [conclusion term].',
      'Takes for granted that [premise concept] is sufficient to establish [conclusion concept].',
    ],
    workedExample:
      'The Ethicist meat argument (June 2007.3.21). Premises talk about feeding more people with grain than meat. Conclusion brings in "morally unacceptable" out of nowhere.',
    workedAnalysis:
      'The premises never set up morality. The author pretends "doesn’t feed the most people" equals "morally unacceptable." Put a ≠ between them.',
    whatIfCounter: 'What if those two things aren’t necessarily the same?',
    realPhrasePairs: [
      '"accurate" vs. "consistent"',
      '"interest of shareholders" vs. "profits high"',
      '"better developed neural connections" vs. "greater influence on the brain"',
      '"detract from social development" vs. "reduction in time interacting with other people"',
      '"diets higher in cholesterol" vs. "Western diets"',
    ],
    disambiguateFrom: [
      { other: 'Equivocation', question: 'Same word with shifting meaning, or two different words being treated as equivalent?' },
      { other: 'Necessary vs. Sufficient', question: 'Are the conditional terms defined consistently?' },
    ],
    notes: 'Possibly the #1 LR flaw, period.',
  },
  {
    slug: 'sleazy-sales-pitch',
    name: 'Sleazy Sales Pitch',
    number: 12,
    group: 'g3',
    groupLabel: 'Group 3 · House-Named',
    frequency: 'Very High',
    definition:
      'The author compares two things and says one is superior without telling you the full story. They highlight the preferred choice’s benefits and hide the drawbacks.',
    stimulusTells:
      'One option is praised for its strengths; the other is criticized for its weaknesses. You hear nothing about the praised option’s weaknesses or the criticized option’s strengths. One-sided.',
    disguises: [
      'Fails to consider potential drawbacks of the preferred option.',
      'Bases its recommendation on a one-sided comparison.',
      'Ignores the possibility that the alternative has compensating strengths.',
      'Treats an incomplete comparison as if it were a complete one.',
    ],
    workedExample: 'Dolores vs. Victor (PT 16.2.19).',
    workedAnalysis:
      'We hear Dolores’ strengths and Victor’s weaknesses. We hear nothing about Dolores’ weaknesses or Victor’s strengths.',
    whatIfCounter: 'What if the preferred option has a major downside we’re not being told about?',
    disambiguateFrom: [
      { other: 'Sampling', question: 'Comparison or generalization?' },
    ],
  },
  {
    slug: 'universal-desires',
    name: 'Universal Desires Assumption',
    number: 13,
    group: 'g3',
    groupLabel: 'Group 3 · House-Named',
    frequency: 'High',
    definition:
      'The author assumes everyone would want certain goals. Usually the goals you constantly see commercials about: lose weight, make more money, be healthier, lower cholesterol, be more successful.',
    stimulusTells:
      'The argument concludes that someone "should" do something because it would achieve some commonly-desired outcome. The argument never establishes that this person actually desires that outcome.',
    disguises: [
      'Presumes, without providing justification, that everyone shares the same goals.',
      'Takes for granted that the people in question want [outcome].',
      'Assumes that what is in someone’s interest is necessarily what they desire.',
      'Fails to consider that some people might not pursue [outcome].',
    ],
    workedExample: 'Everyone should switch to the new low-fat diet because it will help them lose weight.',
    workedAnalysis:
      'Some people need to gain weight. Some people don’t care about their weight. The conclusion pretends weight loss is a universal goal, and it isn’t.',
    whatIfCounter: 'What if they don’t want to lose weight, make more money, or be healthier?',
  },
  {
    slug: 'value-assumptions',
    name: 'Value Assumptions',
    number: 14,
    group: 'g3',
    groupLabel: 'Group 3 · House-Named',
    frequency: 'Very High',
    definition:
      'The author makes a judgment in the conclusion using a loaded word (moral, appropriate, good, right, should) without clarifying what that word means in the premises. The judgment is treated as obvious. It isn’t.',
    stimulusTells:
      'The conclusion contains an evaluative word — moral/immoral, appropriate/inappropriate, should/shouldn’t, prudent/imprudent, good/bad, right/wrong — that the premises never defined.',
    disguises: [
      'Bases its conclusion on subjective judgments rather than on an objective criterion.',
      'Takes for granted that [the premises’] description of [X] establishes that [X] is [evaluative term].',
      'Presupposes a particular standard of [moral/appropriate/etc.] without justifying it.',
      'Treats a description as if it were a normative judgment.',
    ],
    workedExample: 'The robot engineer (PT 16.2.10). Premises describe least-skilled labor. Conclusion calls it "demeaning."',
    workedAnalysis: 'The label is the author’s judgment, not a fact.',
    whatIfCounter: 'What if the description doesn’t actually qualify as the evaluative judgment?',
    disambiguateFrom: [
      { other: 'Sleight of Hand', question: 'Is the new conclusion-term a moral / appropriate / should word?' },
    ],
    notes:
      'A specific case of Sleight of Hand where the dangling variable is an evaluative term. If you can identify the loaded word, label it Value Assumption. Otherwise default to Sleight of Hand.',
  },
  {
    slug: 'secret-downsides',
    name: 'Secret Downsides',
    number: 15,
    group: 'g3',
    groupLabel: 'Group 3 · House-Named',
    frequency: 'Medium-High',
    definition:
      'Potential drawbacks or negative consequences that the argument ignores or doesn’t address. A close cousin of Sleazy Sales Pitch but applies even when no comparison is involved.',
    stimulusTells:
      'The argument recommends an action based on its benefits without addressing its costs or unintended consequences.',
    disguises: [
      'Fails to consider the potential negative consequences of the recommended action.',
      'Overlooks costs that would offset the proposed benefits.',
      'Ignores the possibility that the action would produce unintended drawbacks.',
    ],
    workedExample: 'We should switch to solar energy to save money on electricity.',
    workedAnalysis: 'Possible secret downside: the high initial installation costs erase the long-term savings.',
    whatIfCounter: 'What if there’s a major downside the argument never mentions?',
    disambiguateFrom: [
      { other: 'Sleazy Sales Pitch', question: 'Comparison between two options or single-option pitch?' },
    ],
  },
];

export function getFlaw(slug: string): FlawEntry | undefined {
  return catalog.find((c) => c.slug === slug);
}
