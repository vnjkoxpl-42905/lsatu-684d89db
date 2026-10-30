export interface FlawCard {
  id: string;
  name: string;
  definition: string;
  doingWrong: string;
  counterQuestion: string;
  tinyExample: string;
  everydayWording: string;
  abstractWording: string;
  lsatWording: string;
  dontConfuseWith: string;
  answerChoicePhrasing: string[];
  infographicUrl?: string;
  videoId?: string;
}

export const FLAW_CATALOG: FlawCard[] = [
  // GROUP 1
  {
    id: 'necessary-vs-sufficient',
    name: 'Necessary vs. Sufficient',
    definition: 'The argument mistakes something that is required for an outcome for something that guarantees the outcome, or vice versa.',
    doingWrong: 'Reading conditional premises backwards (without negating) or negating and reading them forwards.',
    counterQuestion: 'What if [the necessary condition] happens, but [the sufficient condition] does not?',
    tinyExample: 'You must buy a ticket to win the lottery. I bought a ticket, so I will win.',
    everydayWording: 'Assuming that because you did the bare minimum required, you are guaranteed success.',
    abstractWording: 'Confuses a condition necessary for the truth of a claim with a condition sufficient for the truth of that claim.',
    lsatWording: 'Treats a sufficient condition as a necessary condition.',
    dontConfuseWith: 'Causal Flaw. Conditional statements are about guarantees, not one thing literally causing another.',
    infographicUrl: '/infographics/conditional-trap.png',
    videoId: 'necessary-vs-sufficient-video',
    answerChoicePhrasing: [
      'takes a necessary condition for a sufficient condition',
      'mistakes a condition that is required for an outcome for one that guarantees it',
      'infers from the claim that a condition is necessary for a result that it is sufficient for it'
    ]
  },
  {
    id: 'causal-flaw',
    name: 'Causal Flaw',
    definition: 'Concluding that one thing caused another just because they happened together or one preceded the other.',
    doingWrong: 'Assuming correlation implies causation, or ignoring alternate causes.',
    counterQuestion: 'What if something else caused it? What if the cause and effect are reversed?',
    tinyExample: 'Every time I wear my lucky socks, my team wins. My socks cause the victory.',
    everydayWording: 'Thinking two things going together means one made the other happen.',
    abstractWording: 'Infers a causal connection from a mere correlation.',
    lsatWording: 'Takes for granted that because two phenomena are correlated, the first must have caused the second.',
    dontConfuseWith: 'Necessary vs. Sufficient condition. "Causes" implies making something happen; "requires" is just a logical guarantee.',
    infographicUrl: '/infographics/causal-flaw.png',
    answerChoicePhrasing: [
      'fails to consider that a third factor may be responsible for both phenomena',
      'confuses a correlation with a causal connection',
      'takes for granted that because event A preceded event B, A caused B'
    ]
  },
  {
    id: 'sampling-fallacy',
    name: 'Sampling Fallacy',
    definition: 'Making a broad generalization based on a small, unrepresentative, or biased sample.',
    doingWrong: 'Assuming a small group perfectly represents the entire population.',
    counterQuestion: 'What if the group surveyed is totally different from the general population?',
    tinyExample: 'I asked three people in the pizza shop what their favorite food is. Everyone loves pizza!',
    everydayWording: 'Taking one specific example and saying everyone or everything is like that.',
    abstractWording: 'Draws a general conclusion from an unrepresentative sample.',
    lsatWording: 'Relies on a sample that is too small or unrepresentative to support the broad conclusion.',
    dontConfuseWith: 'Part vs. Whole. Sampling goes from a subset of individuals to the whole population of individuals. Part vs. Whole goes from the physical parts of an object to the whole object.',
    infographicUrl: '/infographics/sampling-fallacy.png',
    answerChoicePhrasing: [
      'bases a generalization on an unrepresentative sample',
      'relies on a sample that is too small to yield reliable results',
      'generalizes from a potentially biased sample to an entire population'
    ]
  },
  {
    id: 'part-vs-whole',
    name: 'Part vs. Whole',
    definition: 'Assuming that what is true of the parts must be true of the whole, or vice versa.',
    doingWrong: 'Assigning characteristics to a group based on individuals, or to individuals based on the group.',
    counterQuestion: 'What if the pieces act differently when they are put together?',
    tinyExample: 'Every player on the team is world-class, so the team must be world-class. (Maybe they have no teamwork!)',
    everydayWording: 'Saying a cake is sweet just because it has sugar in it, or each slice is a whole cake. (Wait, bad example) Thinking a puzzle is blue because one piece is blue.',
    abstractWording: 'Infers that a whole has a certain property merely from the fact that all of its parts have that property.',
    lsatWording: 'Assumes that what is true of a whole must be true of its parts individually.',
    dontConfuseWith: 'Sampling. Part vs. Whole is about physical or structural parts of a single entity. Sampling is about taking a few members of a group and concluding about the other members.',
    infographicUrl: '/infographics/part-vs-whole.png',
    answerChoicePhrasing: [
      'unjustifiably infers that a whole possesses a property simply because each of its parts possesses that property',
      'assumes without warrant that what is true of a group as a whole must be true of each member'
    ]
  },
  {
    id: 'unproven-vs-proven-false',
    name: 'Unproven vs. Proven False',
    definition: 'Concluding that a claim is false just because the argument for it was flawed, or concluding it is true because it hasn\'t been proven false.',
    doingWrong: 'Confusing a lack of evidence with evidence of absence.',
    counterQuestion: 'What if the claim is still true, even if their argument for it is terrible?',
    tinyExample: 'You couldn\'t prove ghosts exist, therefore there are no ghosts.',
    everydayWording: 'Saying someone is wrong just because their logic was bad. (They can have bad logic but still guess the right answer).',
    abstractWording: 'Treats the failure to establish that a claim is true as conclusive evidence that the claim is false.',
    lsatWording: 'Concludes that a proposition is false simply because an argument given in its favor is flawed.',
    dontConfuseWith: 'Ad Hominem. Unproven/Proven False attacks the lack of proof; Ad Hominem attacks the person giving the proof.',
    videoId: 'unproven-vs-proven-false-video',
    answerChoicePhrasing: [
      'takes a lack of evidence for a claim as evidence that the claim is false',
      'confuses inadequate evidence for a conclusion with evidence that the conclusion is false',
      'assumes something is true merely because it has not been proven false'
    ]
  },
  {
    id: 'ad-hominem',
    name: 'Ad Hominem',
    definition: 'Attacking the person making the argument rather than the argument itself.',
    doingWrong: 'Criticizing the opponent\'s character or motives instead of their reasoning.',
    counterQuestion: 'What if the person is a hypocrite or has bad motives, but their actual argument is still logically valid?',
    tinyExample: 'My doctor said I should eat healthier, but he eats donuts every morning, so I don\'t need to eat healthier.',
    everydayWording: 'Saying "you\'re a jerk" instead of proving their point wrong.',
    abstractWording: 'Rejects an argument based on the character of the proponent.',
    lsatWording: 'Attacks the character or motives of the person making an argument instead of addressing the argument itself.',
    dontConfuseWith: 'Unproven vs. Proven false. If an author attacks the person, it\'s ad hominem. If they attack the person\'s *evidence*, it might be Unproven vs. false.',
    answerChoicePhrasing: [
      'directs its attack against the proponent of a position rather than against the position itself',
      'rejects a claim merely because of the motivations of the person making the claim'
    ]
  },

  // GROUP 2
  {
    id: 'circular-reasoning',
    name: 'Circular Reasoning',
    definition: 'The argument\'s conclusion is just a restatement of its premises.',
    doingWrong: 'Using the conclusion itself as evidence to support the conclusion.',
    counterQuestion: 'Is the author actually providing evidence, or just repeating their claim using different words?',
    tinyExample: 'This restaurant is the best because no other restaurant is as good as this one.',
    everydayWording: 'Saying "X is true because X is true."',
    abstractWording: 'Presupposes what it sets out to prove.',
    lsatWording: 'The conclusion is essentially the same as the premise, offering no real support.',
    dontConfuseWith: 'Equivocation. Circular reasoning uses the same meaning to prove the same meaning. Equivocation switches the meaning of a word.',
    videoId: 'rarely-correct-video',
    answerChoicePhrasing: [
      'presupposes what it sets out to establish',
      'assumes what it is attempting to prove',
      'provides a conclusion that is merely a restatement of one of its premises'
    ]
  },
  {
    id: 'internal-contradiction',
    name: 'Internal Contradiction',
    definition: 'The argument makes claims that cannot both be true at the same time.',
    doingWrong: 'Providing premises that logically conflict with each other.',
    counterQuestion: 'Wait, didn\'t the author just say the exact opposite of that a second ago?',
    tinyExample: 'Everyone should be completely free to do whatever they want, and we should ban people from doing things we don\'t like.',
    everydayWording: 'Contradicting yourself in the very same breath.',
    abstractWording: 'Bases its conclusion on claims that are logically incompatible with each other.',
    lsatWording: 'Relies on assertions that cannot simultaneously be true.',
    dontConfuseWith: 'Equivocation. In internal contradiction, the claims genuinely conflict. In equivocation, a word shifts meaning to hide a conflict.',
    videoId: 'rarely-correct-video',
    answerChoicePhrasing: [
      'bases its conclusion on premises that cannot all be true',
      'draws a conclusion that is logically incompatible with the premises offered in its support',
      'contains premises that contradict one another'
    ]
  },
  {
    id: 'equivocation',
    name: 'Equivocation',
    definition: 'Using a word with multiple meanings inconsistently throughout the argument.',
    doingWrong: 'Exploiting the ambiguity of a word by shifting its meaning halfway through to make the logic seem sound.',
    counterQuestion: 'Is the author using this word to mean the exact same thing in the premise as in the conclusion?',
    tinyExample: 'Feathers are light. What is light cannot be dark. Therefore, feathers cannot be dark.',
    everydayWording: 'Playing a word trick by swapping definitions mid-sentence.',
    abstractWording: 'Fails to distinguish between two distinct senses of a key term.',
    lsatWording: 'Exploits an ambiguity in a crucial term, using it to mean one thing in a premise and another in the conclusion.',
    dontConfuseWith: 'Internal Contradiction. Equivocation tries to hide the contradiction by using the same word for two different concepts.',
    videoId: 'rarely-correct-video',
    answerChoicePhrasing: [
      'relies on two different uses of the same term',
      'allows the meaning of a crucial term to shift over the course of the argument',
      'fails to define a key term adequately (this is a trap; it implies shifting meaning)'
    ]
  },
  {
    id: 'inappropriate-appeal',
    name: 'Inappropriate Appeal',
    definition: 'Appealing to authority, emotion, or popularity rather than logic.',
    doingWrong: 'Relying on external factors like an unqualified expert or public consensus to prove a factual claim.',
    counterQuestion: 'What if the expert is wrong, or the majority of people believe something false?',
    tinyExample: 'Most people think the Earth is the center of the universe, so it must be true.',
    everydayWording: 'Saying something is true because everybody says so, or because a celebrity said so.',
    abstractWording: 'Accepts a claim merely on the authority of an individual who lacks expertise in the relevant area.',
    lsatWording: 'Appeals to popular opinion, authority, or emotion to support its argument instead of logical reasoning.',
    dontConfuseWith: 'Ad Hominem (which attacks a person). Inappropriate appeal relies on a person or public opinion to *support* a claim.',
    videoId: 'rarely-correct-video',
    answerChoicePhrasing: [
      'relies on the authority of an expert in a field irrelevant to the issue at hand',
      'bases a conclusion about a factual matter on the popularity of the belief',
      'appeals inappropriately to emotion rather than to reason'
    ]
  },

  // PRACTICAL LSAT TRICKS
  {
    id: 'sleight-of-hand',
    name: 'Sleight of Hand',
    definition: 'Sneaking a brand new concept into the conclusion that was never mentioned in the premises.',
    doingWrong: 'Pretending two different things are identical to force the logic to work.',
    counterQuestion: 'Wait, what if [New Concept in Conclusion] is NOT the same thing as [Concept in the Premises]?',
    tinyExample: 'This diet helps you lose weight. Therefore, this diet will make you healthier. (Wait, losing weight ≠ getting healthier).',
    everydayWording: 'Sneaking in a word you never defined and acting like it naturally follows.',
    abstractWording: 'Unjustifiably treats two distinct phenomena as though they were equivalent.',
    lsatWording: 'The conclusion introduces a new term or concept that is not logically linked to the premises.',
    dontConfuseWith: 'Equivocation. Equivocation uses the SAME word two different ways. Sleight of Hand uses TWO DIFFERENT concepts and pretends they are the same.',
    answerChoicePhrasing: [
      'takes for granted that [Concept A] is identical to [Concept B]',
      'fails to consider that one can achieve [Premise goal] without achieving [Conclusion goal]',
      'presumes without warrant that [X] implies [Y]'
    ]
  },
  {
    id: 'value-assumption',
    name: 'Value Assumption',
    definition: 'Making a judgment in the conclusion (e.g., "good," "bad," "should," "demeaning") that has no factual support in the premises.',
    doingWrong: 'Jumping from descriptive facts (what IS) to normative judgments (what OUGHT to be).',
    counterQuestion: 'What if [the factual premise] doesn\'t actually mean it is [judgment word]?',
    tinyExample: 'This car gets 50 miles per gallon, so it is the best car on the market. (Wait, "best" is a massive value judgment!)',
    everydayWording: 'Stating a plain fact and then randomly deciding it means it\'s "immoral" or "amazing."',
    abstractWording: 'Derives a normative claim solely from descriptive premises.',
    lsatWording: 'Looks for judgments in the conclusion that are not clearly defined or supported by the premises.',
    dontConfuseWith: 'Sleight of Hand. Value Assumption is a specific type of Sleight of Hand where the "trick" involves a value-based word (should, moral, better).',
    answerChoicePhrasing: [
      'bases a value judgment on purely factual evidence',
      'takes for granted that a certain attribute makes something inherently valuable',
      'assumes without justification that [factual outcome] constitutes [moral/evaluative judgment]'
    ]
  },
  {
    id: 'sleazy-sales-pitch',
    name: 'Sleazy Sales Pitch',
    definition: 'Presenting only one side of a comparison, ignoring potential drawbacks or the other side\'s benefits.',
    doingWrong: 'Trying to convince you to choose Option A by only listing Option A\'s good qualities and ignoring Option B.',
    counterQuestion: 'What if Option A has some major downside we aren\'t accounting for, or Option B is even better?',
    tinyExample: 'We should elect John because he is great at public speaking! (What if his opponent is also great at it, AND has more experience?)',
    everydayWording: 'Cherry-picking the good stuff about your favorite choice and staying suspiciously quiet about everything else.',
    abstractWording: 'Fails to consider potential disadvantages of a proposed course of action.',
    lsatWording: 'Be wary of arguments that present only one side of the comparison, ignoring potential drawbacks.',
    dontConfuseWith: 'False Dichotomy. False Dichotomy says there are only two options. Sleazy Sales Pitch only gives you half the information about the options.',
    answerChoicePhrasing: [
      'fails to consider potential drawbacks of the recommended option',
      'recommends a course of action based on a one-sided assessment of its consequences',
      'ignores the possibility that an alternative might possess the same advantages to a greater degree'
    ]
  },
  {
    id: 'universal-desires-assumption',
    name: 'Universal Desires Assumption',
    definition: 'Assuming that common desires or values apply universally to everyone without questioning the underlying assumptions.',
    doingWrong: 'Taking for granted that everyone wants the same thing (e.g., to save money, to be healthy).',
    counterQuestion: 'What if some people in this group actively DO NOT want this "obviously good" thing?',
    tinyExample: 'This new phone plan will save our customers money, so all our customers will switch to it. (What if they care more about data limits than money?)',
    everydayWording: 'Assuming everybody thinks exactly like you do about what is "good."',
    abstractWording: 'Presumes without justification that a particular motivation is shared by all members of a group.',
    lsatWording: 'Assume that common desires or values apply universally without questioning the underlying assumptions.',
    dontConfuseWith: 'Value Assumption. Value Assumption says "this is a good thing." Universal Desires says "EVERYONE WANTS this good thing."',
    answerChoicePhrasing: [
      'takes for granted that a particular goal is desired by all individuals involved',
      'assumes without warrant that financial benefit is the sole motivating factor',
      'fails to consider that individuals may prioritize competing interests'
    ]
  }
];
