export interface AnswerChoiceFlashcard {
  id: string;
  difficulty: "Easy" | "Medium" | "Hard";
  front: string;
  flawName: string;
  plainEnglish: string;
  whatToCheck: string;
  trapWarning: string;
}

export const ANSWER_CHOICE_FLASHCARDS: AnswerChoiceFlashcard[] = [
  // EASY
  {
    id: 'ac-easy-1',
    difficulty: 'Easy',
    front: 'Treats something required for an outcome as though it guarantees that outcome.',
    flawName: 'Necessary vs. Sufficient',
    plainEnglish: 'The author confuses a requirement with a guarantee.',
    whatToCheck: 'Look for conditional or requirement language like if, only if, must, requires, or depends on.',
    trapWarning: 'Do not confuse with Causal Flaw. This is about rules/conditions, not what caused what.'
  },
  {
    id: 'ac-easy-2',
    difficulty: 'Easy',
    front: 'Concludes that one event caused another merely because the two happened together.',
    flawName: 'Causal Flaw',
    plainEnglish: 'The author sees a connection and assumes one thing caused the other.',
    whatToCheck: 'Look for correlation, sequence, increase/decrease, or before/after evidence followed by a causal conclusion.',
    trapWarning: 'Do not confuse with Sampling. Sampling is about who was studied; causal flaw is about what caused what.'
  },
  {
    id: 'ac-easy-3',
    difficulty: 'Easy',
    front: 'Bases a broad conclusion on a small or unrepresentative group.',
    flawName: 'Sampling Fallacy',
    plainEnglish: 'The author uses a weak sample to speak for a much larger population.',
    whatToCheck: 'Compare the sample group to the group in the conclusion.',
    trapWarning: 'Do not confuse with Part vs. Whole. Sampling moves from some members to a broader population.'
  },
  {
    id: 'ac-easy-4',
    difficulty: 'Easy',
    front: 'Assumes that what is true of each member must be true of the group as a whole.',
    flawName: 'Part vs. Whole',
    plainEnglish: 'The author moves from individual parts to the whole group.',
    whatToCheck: 'Look for a move from players to team, ingredients to dish, parts to object, or members to organization.',
    trapWarning: 'Do not confuse with Sampling. Part vs. Whole is about parts and collectives, not survey samples.'
  },
  {
    id: 'ac-easy-5',
    difficulty: 'Easy',
    front: 'Treats the failure to prove a claim as evidence that the claim is false.',
    flawName: 'Unproven vs. Proven False',
    plainEnglish: 'The author thinks not proven means false.',
    whatToCheck: 'Look for no proof, no evidence, not established, or not shown, followed by a definite rejection.',
    trapWarning: 'Do not confuse with Circular Reasoning. This is about lack of proof, not repeating the conclusion.'
  },
  {
    id: 'ac-easy-6',
    difficulty: 'Easy',
    front: 'Rejects a claim by attacking the person who made it rather than the claim itself.',
    flawName: 'Ad Hominem',
    plainEnglish: 'The author attacks the source instead of the reasoning.',
    whatToCheck: 'Look for attacks on character, motives, hypocrisy, bias, or past behavior.',
    trapWarning: 'Do not confuse with Inappropriate Appeal. Ad Hominem attacks a person; Inappropriate Appeal relies on a person.'
  },
  {
    id: 'ac-easy-7',
    difficulty: 'Easy',
    front: 'Presupposes what it sets out to prove.',
    flawName: 'Circular Reasoning',
    plainEnglish: 'The author uses the conclusion as its own support.',
    whatToCheck: 'Check whether the premise is basically the conclusion in different words.',
    trapWarning: 'Do not confuse with Internal Contradiction. Circular repeats; contradiction clashes.'
  },
  {
    id: 'ac-easy-8',
    difficulty: 'Easy',
    front: 'Uses the same word in two different senses in the argument.',
    flawName: 'Equivocation',
    plainEnglish: 'The author plays a word trick by shifting meanings.',
    whatToCheck: 'Track the repeated key term and ask whether it keeps the same meaning.',
    trapWarning: 'Do not confuse with Sleight of Hand. Equivocation uses one word two ways; Sleight of Hand swaps two ideas.'
  },
  {
    id: 'ac-easy-9',
    difficulty: 'Easy',
    front: 'Relies on an authority whose expertise is not relevant to the conclusion.',
    flawName: 'Inappropriate Appeal',
    plainEnglish: 'The author treats the wrong kind of authority as proof.',
    whatToCheck: 'Check whether the cited authority is qualified in the exact subject being discussed.',
    trapWarning: 'Do not confuse with Ad Hominem. This flaw relies on the source; Ad Hominem attacks the source.'
  },
  {
    id: 'ac-easy-10',
    difficulty: 'Easy',
    front: 'Relies on claims that cannot all be true at the same time.',
    flawName: 'Internal Contradiction',
    plainEnglish: 'The author’s own statements conflict.',
    whatToCheck: 'Ask whether the premises or conclusion can logically coexist.',
    trapWarning: 'Do not confuse with Circular Reasoning. Contradiction conflicts; circularity repeats.'
  },
  // MEDIUM
  {
    id: 'ac-medium-1',
    difficulty: 'Medium',
    front: 'Treats a condition that is required for a certain result as though it were sufficient to guarantee that result.',
    flawName: 'Necessary vs. Sufficient',
    plainEnglish: 'The author treats a requirement as enough to guarantee the outcome.',
    whatToCheck: 'Look for a required condition being used as if it proves the result.',
    trapWarning: 'Do not confuse with Causal Flaw; no cause/effect claim is needed.'
  },
  {
    id: 'ac-medium-2',
    difficulty: 'Medium',
    front: 'Takes evidence of a correlation between two phenomena to establish a causal relationship between them.',
    flawName: 'Causal Flaw',
    plainEnglish: 'The author treats a relationship as proof of cause.',
    whatToCheck: 'Look for a statistical link, pattern, or co-occurrence followed by a causal claim.',
    trapWarning: 'Do not confuse with Sampling; the issue is causal mechanism, not representativeness.'
  },
  {
    id: 'ac-medium-3',
    difficulty: 'Medium',
    front: 'Bases a general conclusion on a sample that is likely to be unrepresentative of the population as a whole.',
    flawName: 'Sampling Fallacy',
    plainEnglish: 'The author generalizes from a biased or lopsided group.',
    whatToCheck: 'Identify the sample and compare it with the target population.',
    trapWarning: 'Do not confuse with Part vs. Whole; this is about sample-to-population.'
  },
  {
    id: 'ac-medium-4',
    difficulty: 'Medium',
    front: 'Infers that a property of a collective is also a property of every individual member of that collective.',
    flawName: 'Part vs. Whole',
    plainEnglish: 'The author moves from whole to part.',
    whatToCheck: 'Look for a group/team/object having a trait, then applying it to one member/part.',
    trapWarning: 'Do not confuse with Sampling, which generalizes from some people to more people.'
  },
  {
    id: 'ac-medium-5',
    difficulty: 'Medium',
    front: 'Concludes that a claim is true merely because no evidence has been produced to show that it is false.',
    flawName: 'Unproven vs. Proven False',
    plainEnglish: 'The author thinks not disproven means true.',
    whatToCheck: 'Look for no one has disproven X, followed by therefore X is true.',
    trapWarning: 'Do not confuse with Circular Reasoning; the issue is lack of disproof.'
  },
  {
    id: 'ac-medium-6',
    difficulty: 'Medium',
    front: 'Dismisses a point of view because the source has a biased interest in the outcome.',
    flawName: 'Ad Hominem',
    plainEnglish: 'The author treats bias as enough to reject the argument.',
    whatToCheck: 'Check whether the author addresses the argument or only attacks the source’s motives.',
    trapWarning: 'Do not confuse with Sampling bias; this is about a biased speaker, not a biased data set.'
  },
  {
    id: 'ac-medium-7',
    difficulty: 'Medium',
    front: 'The argument’s conclusion is logically equivalent to one of its premises.',
    flawName: 'Circular Reasoning',
    plainEnglish: 'The support and conclusion say the same thing.',
    whatToCheck: 'Paraphrase the premise and conclusion; see whether anything new is actually offered.',
    trapWarning: 'Do not confuse with Equivocation, where a word shifts meaning.'
  },
  {
    id: 'ac-medium-8',
    difficulty: 'Medium',
    front: 'Allows the meaning of a key term to shift during the course of the argument.',
    flawName: 'Equivocation',
    plainEnglish: 'The author uses one term in two senses.',
    whatToCheck: 'Find the repeated term and test whether its meaning changes from premise to conclusion.',
    trapWarning: 'Do not confuse with Sleight of Hand, where two different concepts are treated as the same.'
  },
  {
    id: 'ac-medium-9',
    difficulty: 'Medium',
    front: 'Relies on the testimony of an authority whose expertise is not in the field relevant to the conclusion.',
    flawName: 'Inappropriate Appeal',
    plainEnglish: 'The author uses an irrelevant expert as proof.',
    whatToCheck: 'Check whether the authority’s field matches the claim being made.',
    trapWarning: 'Do not confuse with Ad Hominem, which attacks an authority or speaker.'
  },
  {
    id: 'ac-medium-10',
    difficulty: 'Medium',
    front: 'Contains premises that are mutually exclusive.',
    flawName: 'Internal Contradiction',
    plainEnglish: 'The author relies on claims that cannot both be true.',
    whatToCheck: 'Ask whether accepting one premise forces you to reject another.',
    trapWarning: 'Do not confuse with Circular Reasoning; contradiction is clash, circularity is repetition.'
  },
  // HARD
  {
    id: 'ac-hard-1',
    difficulty: 'Hard',
    front: 'Mistakes a condition that is sufficient for an outcome for one that is necessary for that outcome.',
    flawName: 'Necessary vs. Sufficient',
    plainEnglish: 'The author treats one way to get a result as the only way to get that result.',
    whatToCheck: 'Look for if A then B being used to infer not A then not B.',
    trapWarning: 'Do not confuse with the other direction, necessary treated as sufficient.'
  },
  {
    id: 'ac-hard-2',
    difficulty: 'Hard',
    front: 'Fails to consider the possibility that two correlated events are both effects of a single underlying cause.',
    flawName: 'Causal Flaw',
    plainEnglish: 'The author ignores a third factor that could explain both things.',
    whatToCheck: 'Look for two linked phenomena and ask whether a hidden cause could produce both.',
    trapWarning: 'Do not confuse with reverse causation; this is third-factor causation.'
  },
  {
    id: 'ac-hard-3',
    difficulty: 'Hard',
    front: 'Illicitly infers that what is true of each part of a whole must also be true of the whole itself.',
    flawName: 'Part vs. Whole',
    plainEnglish: 'The author assumes the whole has the same trait as each part.',
    whatToCheck: 'Look for members, ingredients, players, components, or parts being used to conclude about the whole.',
    trapWarning: 'Do not confuse with Sampling; this is about a collective entity, not a population estimate.'
  },
  {
    id: 'ac-hard-4',
    difficulty: 'Hard',
    front: 'Generalizes from a sample that is too small to yield a reliable conclusion.',
    flawName: 'Sampling Fallacy',
    plainEnglish: 'The author uses too little data to support a broad claim.',
    whatToCheck: 'Look for one case, a few examples, or a tiny group supporting a large conclusion.',
    trapWarning: 'Do not confuse with anecdotal causal evidence unless the conclusion is causal.'
  },
  {
    id: 'ac-hard-5',
    difficulty: 'Hard',
    front: 'Dismisses a point of view because of the source’s alleged motives rather than addressing the argument’s merits.',
    flawName: 'Ad Hominem',
    plainEnglish: 'The author attacks the source’s motive instead of the argument.',
    whatToCheck: 'Check whether the argument itself is evaluated or ignored.',
    trapWarning: 'Do not confuse with Inappropriate Appeal; this rejects a source rather than relying on one.'
  },
  {
    id: 'ac-hard-6',
    difficulty: 'Hard',
    front: 'Attempts to justify a claim by showing only that an opposing claim is based on a mistaken assumption.',
    flawName: 'Unproven vs. Proven False',
    plainEnglish: 'The author thinks weakening the other side proves their own side.',
    whatToCheck: 'Look for the move: opponent’s reason is bad, therefore opponent’s conclusion is false.',
    trapWarning: 'Do not confuse with a normal weaken argument; flaw questions need the overreach.'
  },
  {
    id: 'ac-hard-7',
    difficulty: 'Hard',
    front: 'The argument relies on premises that are inconsistent with one another.',
    flawName: 'Internal Contradiction',
    plainEnglish: 'The author’s own support contains a conflict.',
    whatToCheck: 'Check whether two stated claims can be true together.',
    trapWarning: 'Do not confuse with Equivocation, where a word shift can hide the conflict.'
  },
  {
    id: 'ac-hard-8',
    difficulty: 'Hard',
    front: 'Exploits an ambiguity in a crucial term, using it to mean one thing in a premise and another in the conclusion.',
    flawName: 'Equivocation',
    plainEnglish: 'The argument depends on one word changing meanings.',
    whatToCheck: 'Track the crucial term from premise to conclusion.',
    trapWarning: 'Do not confuse with Sleight of Hand, which swaps concepts rather than meanings of one word.'
  },
  {
    id: 'ac-hard-9',
    difficulty: 'Hard',
    front: 'Accepts a claim merely on the authority of a source whose relevant expertise has not been established.',
    flawName: 'Inappropriate Appeal',
    plainEnglish: 'The author treats an unqualified or irrelevant authority as proof.',
    whatToCheck: 'Ask whether the cited source is actually qualified on the specific issue.',
    trapWarning: 'Do not confuse with Ad Hominem, where the author attacks the source.'
  },
  {
    id: 'ac-hard-10',
    difficulty: 'Hard',
    front: 'Recommends a course of action on the basis of a one-sided assessment of its consequences.',
    flawName: 'Sleazy Sales Pitch',
    plainEnglish: 'The author lists benefits while ignoring costs, drawbacks, or alternatives.',
    whatToCheck: 'Look for a recommendation supported only by advantages on one side.',
    trapWarning: 'Do not confuse with False Choice; this is not necessarily saying there are only two options.'
  }
];
