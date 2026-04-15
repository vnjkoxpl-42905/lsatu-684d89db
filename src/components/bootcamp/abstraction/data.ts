import { StemDrill, RoleQuestion } from './types';

export const stemDrills: StemDrill[] = [
  {
    id: 1,
    rawStem: "It is used to illustrate the general principle that the argument presupposes",
    keywords: [
      { word: "illustrate", definition: "Provide an example of" },
      { word: "general principle", definition: "A rule on what we should/shouldn't do that applies to multiple conditions and scenarios" },
      { word: "presuppose", definition: "Require (a necessary condition)" },
    ],
    coachTranslation: "The statement is an example. Behind this example is a principle (a broad rule). And this principle is required in order for the author to advance their argument. Three requirements: (1) it's an example, (2) there's a principle behind it, (3) the principle is necessary for the conclusion.",
    concreteExample: `Despite a high paying job, John was extremely stressed out and depressed, so there are intangible things in life that we must pursue to find true happiness.

John's situation is the illustration of a general principle; namely that having a lot of money isn't enough to make you happy. Is this principle required in order for the conclusion to stand? Yes, the conclusion says factors other than money must be considered in order to be happy. The underlined statement satisfies all three requirements.`,
  },
  {
    id: 2,
    rawStem: "It is an illustration of a premise that is used to support the argument's conclusion",
    keywords: [
      { word: "illustration", definition: "An example" },
      { word: "premise", definition: "A supporting statement/evidence" },
    ],
    coachTranslation: "The statement is an example in the stimulus. It is an example of what a premise is trying to say. Isolate the premise(s), then ask: is the quoted statement an example of what the premise describes?",
    concreteExample: `John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer. Smoking is a direct cause of lung cancer. We must avoid cigarettes at all costs if we want to stay healthy.

What is the premise here? Smoking causes lung cancer. What is the conclusion? Don't smoke. John's case is an illustration of the causal relationship between smoking and lung cancer. Requirement satisfied.`,
  },
  {
    id: 3,
    rawStem: "It is used to counter a consideration that might be taken to undermine the argument's conclusion",
    keywords: [
      { word: "counter", definition: "Argue against / shut down" },
      { word: "consideration", definition: "A point or objection" },
      { word: "undermine", definition: "Weaken or attack" },
    ],
    coachTranslation: "There is a real or potential counter-argument that runs contrary to the author's conclusion. The quoted statement is a pre-emptive strike — the author anticipates the objection and shuts it down in advance.",
    concreteExample: `College graduates make more money than they would if they didn't go to college, even if they are paying off student loans plus interest. So going to college is a great way to make more money and enjoy a better life.

Here, the underlined statement is both a premise as well as a pre-emptive strike against a potential objection, namely that graduates end up with so much debt that going to college doesn't make sense.`,
  },
  {
    id: 4,
    rawStem: "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false",
    keywords: [
      { word: "observation", definition: "A factual statement / piece of evidence" },
      { word: "insufficient", definition: "Not enough to prove" },
      { word: "concludes is false", definition: "The author is arguing AGAINST a claim" },
    ],
    coachTranslation: "Two viewpoints exist. The opponent made an observation supporting their claim, but the author says that observation isn't enough to prove anything, and then argues the opponent's claim is false. Requirements: (1) opposing view present, (2) author argues against it, (3) opponent provided an observation, (4) author says it's not enough.",
    concreteExample: `John: Celebrities have the biggest smiles in front of the camera, so they must be the happiest people alive.

David: That is not true. Many celebrities suffer from depression and substance abuse. Smiling in front of the camera doesn't mean a thing, they could simply be putting on a show for the audience.

Does the underlined statement fit? Yes. David is arguing that John's claim is false. David also suggests that the observation John makes in support of his claim is insufficient to justify his claim.`,
  },
  {
    id: 5,
    rawStem: "It describes a phenomenon for which the argument's conclusion is offered as an explanation",
    keywords: [
      { word: "phenomenon", definition: "An observed event or fact" },
      { word: "explanation", definition: "Cause (on the LSAT, 'explanation' strictly means cause)" },
    ],
    coachTranslation: "The statement describes an effect/result. The conclusion provides the cause. The order is reversed from typical arguments: instead of cause → effect (premise → conclusion), the author describes the effect first and then concludes what caused it.",
    concreteExample: `Smoking is a leading cause of lung cancer. John has lung cancer, therefore he must surely have been a heavy smoker.

John having lung cancer is the phenomenon. The author subsequently concludes that it must be smoking which caused his lung cancer. The cause/explanation is in fact the conclusion in this example.`,
  },
  {
    id: 6,
    rawStem: "It is a general principle whose validity the argument questions",
    keywords: [
      { word: "general principle", definition: "A broad rule applying to multiple scenarios" },
      { word: "validity", definition: "Truth / correctness" },
      { word: "questions", definition: "Challenges / attacks" },
    ],
    coachTranslation: "The quoted statement is a general principle (a broad rule), and the author is arguing against the truth of this principle. Two requirements: (1) the statement is a general principle, (2) the author attacks it.",
    concreteExample: `It has been said that the best way to approach any situation is to be yourself. But this cannot be true. What if you are a selfish, egotistical or horrible person? Surely we must strive to better ourselves and be the best we can be?`,
  },
  {
    id: 7,
    rawStem: "It denies a claim that the argument takes to be assumed in the reasoning it rejects",
    keywords: [
      { word: "denies", definition: "Rejects / contradicts" },
      { word: "assumed", definition: "Taken for granted without proof" },
      { word: "reasoning it rejects", definition: "The opponent's argument" },
    ],
    coachTranslation: "Two arguments exist: the author's and the opponent's. The author thinks the opponent's reasoning has made an assumption. Instead of attacking the opponent's argument directly, the author attacks the opponent's assumption.",
    concreteExample: `John: I've studied so hard for the finals, I'm definitely going to ace the exam!

David: Studying hard doesn't guarantee you will do well. The exams are graded on a curve, and everyone else has studied just as hard.`,
  },
  {
    id: 8,
    rawStem: "It is a claim for which no justification is provided but that is required to establish the argument's main conclusion",
    keywords: [
      { word: "no justification", definition: "No other statement supports it" },
      { word: "required", definition: "Necessary" },
      { word: "establish", definition: "Prove / make valid" },
    ],
    coachTranslation: "This is a premise. It has no support from other statements (so it's NOT an intermediate conclusion). It is necessary for the main conclusion to stand — if it were untrue, the conclusion would fail.",
    concreteExample: `I found an Olympic gold medal in the swim team locker room. It must have originally belonged to John. John is always losing things and he participated in the Olympics.

John's participation in the Olympics is a requirement for the conclusion to stand. In order for John to be the original owner of the medal, he MUST have been a participant at least. John's participation is also a premise (no justification provided for it).`,
  },
  {
    id: 9,
    rawStem: "It is a claim for which justification is provided and that, if true, establishes the truth of the argument's main conclusion",
    keywords: [
      { word: "justification is provided", definition: "Another statement supports it" },
      { word: "establishes the truth", definition: "Guarantees the conclusion" },
    ],
    coachTranslation: "This is an intermediate conclusion. It HAS support from other statements AND it guarantees/establishes the main conclusion. Two caveats vs. stem #8: (1) it has justification, (2) it guarantees the conclusion.",
    concreteExample: `All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.

John being a practicing lawyer is supported by the fact that he is a partner at a law firm (intermediate conclusion). Does it establish that he passed the bar? Yes — all practicing lawyers must have passed it.`,
  },
  {
    id: 10,
    rawStem: "It is what the author's argument purports to explain",
    keywords: [
      { word: "purports to explain", definition: "Claims to provide the cause for" },
    ],
    coachTranslation: "Identical to stem #5: the author describes an effect/phenomenon, and the conclusion provides the cause. 'Explain' on the LSAT = 'provide a cause for.'",
    concreteExample: `Same structure as stem #5. The statement is the effect/phenomenon, and the conclusion is the cause the author is arguing for.`,
  },
  {
    id: 11,
    rawStem: "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence",
    keywords: [
      { word: "hypothesis", definition: "A potential explanation / potential cause (usually in science-themed stimuli)" },
      { word: "undermine", definition: "Weaken / challenge" },
      { word: "sufficiency of the evidence", definition: "Whether the evidence is enough" },
    ],
    coachTranslation: "A hypothesis (posited causal explanation) exists in the stimulus. The author is challenging it by arguing that the available evidence is NOT enough to support it. Three checks: (1) there's a hypothesis, (2) the author challenges it, (3) the challenge is about insufficient evidence.",
    concreteExample: `In science, a hypothesis is offered to explain a phenomenon — e.g., Darwin hypothesized evolution to explain species adaptation. On the LSAT, check for a posited cause that the author says doesn't have enough evidence behind it.`,
  },
  {
    id: 12,
    rawStem: "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion in the argument",
    keywords: [
      { word: "conclusion of the argument as a whole", definition: "The MAIN conclusion" },
      { word: "not the only explicitly stated conclusion", definition: "There is also an intermediate conclusion" },
    ],
    coachTranslation: "The quoted statement IS the main conclusion. But the argument also contains a separate intermediate conclusion. Two checks: (1) the statement is the main conclusion, (2) an intermediate conclusion exists elsewhere.",
    concreteExample: `Any argument with a main conclusion AND an intermediate conclusion. The intermediate conclusion is supported by premises and in turn supports the main conclusion — making two explicitly stated conclusions in the argument.`,
  },
  {
    id: 13,
    rawStem: "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole",
    keywords: [
      { word: "intended to support", definition: "The argument provides evidence for it" },
      { word: "not the conclusion of the argument as a whole", definition: "Not the main conclusion" },
    ],
    coachTranslation: "This is an intermediate conclusion. The argument supports it (it has evidence behind it), but it is NOT the main conclusion — it in turn supports something else.",
    concreteExample: `Any intermediate conclusion: it is supported by premises, but it also supports the main conclusion. The key signal is "supported by the argument" + "not the main conclusion."`,
  },
  {
    id: 14,
    rawStem: "It is a statement for which some evidence is provided and that itself is offered as support for the conclusion of the argument as a whole",
    keywords: [
      { word: "some evidence is provided", definition: "Another statement supports it" },
      { word: "offered as support for the conclusion", definition: "It supports the main conclusion" },
    ],
    coachTranslation: "Same as #13 — this is an intermediate conclusion. It has evidence supporting it AND it supports the main conclusion.",
    concreteExample: `The statement is supported by a premise and in turn supports the main conclusion. Classic intermediate conclusion structure.`,
  },
  {
    id: 15,
    rawStem: "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered",
    keywords: [
      { word: "conclusion of the argument as a whole", definition: "The main conclusion" },
      { word: "another statement for which support is offered", definition: "An intermediate conclusion exists" },
    ],
    coachTranslation: "Same as #12: the quoted statement is the main conclusion, and it is supported by an intermediate conclusion (a statement that itself has support). Two checks: (1) main conclusion, (2) intermediate conclusion present.",
    concreteExample: `The main conclusion is supported by an intermediate conclusion, which is in turn supported by a premise. This is the full argument chain: Premise → Intermediate Conclusion → Main Conclusion.`,
  },
];

export const roleQuestions: RoleQuestion[] = [
  {
    id: "PT34-S3-Q14",
    stimulus: `People's political behavior frequently does not match their rhetoric. Although many complain about government intervention in their lives, they tend not to re-elect inactive politicians. But a politician's activity consists largely in the passage of laws whose enforcement affects voters' lives. Thus, voters often re-elect politicians whose behavior they resent.`,
    questionStem: "Which one of the following most accurately describes the role played in the argument by the claim that people tend not to re-elect inactive politicians?",
    options: [
      { letter: "A", text: "It describes a phenomenon for which the argument's conclusion is offered as an explanation" },
      { letter: "B", text: "It is a premise offered in support of the conclusion that voters often re-elect politicians whose behavior they resent" },
      { letter: "C", text: "It is offered as an example of how a politician's activity consists largely in the passage of laws whose enforcement interferes with voters' lives" },
      { letter: "D", text: "It is a generalization based on the claim that people complain about government intervention in their lives" },
      { letter: "E", text: "It is cited as evidence that people's behavior never matches their political beliefs" },
    ],
    correctAnswer: "B",
    structuralMap: [
      { label: "Conclusion", text: "People's political behavior frequently does not match their rhetoric." },
      { label: "Premise 1", text: "Although many complain about government intervention in their lives, they tend not to re-elect inactive politicians." },
      { label: "Premise 2", text: "But a politician's activity consists largely in the passage of laws whose enforcement affects voters' lives." },
      { label: "Intermediate Conclusion", text: "Thus, voters often re-elect politicians whose behavior they resent." },
    ],
    answerBreakdowns: [
      { letter: "A", text: "It describes a phenomenon for which the argument's conclusion is offered as an explanation", explanation: "A phenomenon-explanation structure would look like: 'Voters tend not to re-elect inactive politicians. This is because people forget about politicians who haven't done anything.' The statement is not a phenomenon that the conclusion provides the cause for.", isCorrect: false },
      { letter: "B", text: "It is a premise offered in support of the conclusion that voters often re-elect politicians whose behavior they resent", explanation: "It is indeed a premise, and it is supporting the (intermediate) conclusion that voters often re-elect politicians whose behavior they resent. On the LSAT, the word 'conclusion' can refer to both the main conclusion and the intermediate conclusion. 'Conclusion of the argument as a whole' means main conclusion.", isCorrect: true },
      { letter: "C", text: "It is offered as an example of how a politician's activity consists largely in the passage of laws whose enforcement interferes with voters' lives", explanation: "Active politicians interfering with voters' lives is the message of the NEXT statement. This statement is about voters not re-electing inactive politicians — a different claim entirely.", isCorrect: false },
      { letter: "D", text: "It is a generalization based on the claim that people complain about government intervention in their lives", explanation: "A generalization based on that claim would look like: 'All my neighbors complain about government interference, all my coworkers too: so people tend to complain when they perceive government intervention in their lives.' That's not what happens here.", isCorrect: false },
      { letter: "E", text: "It is cited as evidence that people's behavior never matches their political beliefs", explanation: "Two problems: (1) the conclusion is about behavior not matching rhetoric (what they say), not beliefs; (2) 'never' is too strong — the stimulus says 'frequently'. Degree-based errors are frequent in wrong answer choices.", isCorrect: false },
    ],
  },
  {
    id: "PT70-S4-Q24",
    stimulus: `Biologist: Scientists have discovered fossilized bacteria in rocks 3.5 billion years old. The fossils indicate that these bacteria were quite complex and so must have already had a long evolutionary history when fossilized 3.5 billion years ago. However, Earth is only 4.6 billion years old, so the first life on Earth must have appeared soon after the planet's formation, when conditions were extremely harsh. This suggests that life may be able to arise under many difficult conditions throughout the universe.`,
    questionStem: "Which one of the following most accurately describes the role played in the biologist's argument by the claim that fossilized bacteria discovered in rocks 3.5 billion years ago must have had a long evolutionary history?",
    options: [
      { letter: "A", text: "It is a claim for which no support is provided in the argument, and that is used to illustrate the conclusion of the argument as a whole" },
      { letter: "B", text: "It is a claim for which no support is provided in the argument, and that itself is used to support a claim that in turn lends support to the conclusion of the argument as a whole" },
      { letter: "C", text: "It is a claim for which some support is provided in the argument, and that itself is used to support another claim that in turn lends support to the conclusion of the argument as a whole" },
      { letter: "D", text: "It is a claim for which some support is provided in the argument, and that itself is not used to support any other claim in the argument" },
      { letter: "E", text: "It is a claim for which some support is provided in the argument, and that itself is used to support two distinct conclusions, neither of which is intended to provide support for the other" },
    ],
    correctAnswer: "C",
    structuralMap: [
      { label: "Background", text: "Scientists have discovered fossilized bacteria in rocks 3.5 billion years old." },
      { label: "Premise", text: "The fossils indicate that these bacteria were quite complex..." },
      { label: "Intermediate Conclusion 1", text: "...and so must have already had a long evolutionary history when fossilized 3.5 billion years ago." },
      { label: "Intermediate Conclusion 2", text: "However, Earth is only 4.6 billion years old, so the first life on Earth must have appeared soon after the planet's formation, when conditions were extremely harsh." },
      { label: "Main Conclusion", text: "This suggests that life may be able to arise under many difficult conditions throughout the universe." },
    ],
    answerBreakdowns: [
      { letter: "A", text: "It is a claim for which no support is provided in the argument, and that is used to illustrate the conclusion of the argument as a whole", explanation: "The claim DOES have support: the bacteria were complex, so they must have a long evolutionary history. The complexity is the support. Also, it's not an illustration (example) of the main conclusion.", isCorrect: false },
      { letter: "B", text: "It is a claim for which no support is provided in the argument, and that itself is used to support a claim that in turn lends support to the conclusion of the argument as a whole", explanation: "Same problem — there IS support for the claim (bacteria were complex). The rest of the answer is fine, but 'no support' makes it only partially correct.", isCorrect: false },
      { letter: "C", text: "It is a claim for which some support is provided in the argument, and that itself is used to support another claim that in turn lends support to the conclusion of the argument as a whole", explanation: "Support is indeed provided (complexity of bacteria). The statement supports Intermediate Conclusion #2 (life appeared soon after formation), which further supports the main conclusion (life can arise under difficult conditions).", isCorrect: true },
      { letter: "D", text: "It is a claim for which some support is provided in the argument, and that itself is not used to support any other claim in the argument", explanation: "The only statement not supporting anything else would be the main conclusion. This statement clearly supports another claim in the argument chain.", isCorrect: false },
      { letter: "E", text: "It is a claim for which some support is provided in the argument, and that itself is used to support two distinct conclusions, neither of which is intended to provide support for the other", explanation: "This describes an intermediate conclusion supporting two separate main conclusions. The stimulus has a single chain of support, not two independent conclusions.", isCorrect: false },
    ],
  },
  {
    id: "PT70-S1-Q17",
    stimulus: `Meteorologist: Heavy downpours are likely to become more frequent if Earth's atmosphere becomes significantly warmer. A warm atmosphere heats the oceans, leading to faster evaporation, and the resulting water vapor forms rain clouds more quickly. A warmer atmosphere also holds more moisture, resulting in larger clouds. In general, as water vapor in larger clouds condenses, heavier downpours are more likely to result.`,
    questionStem: "Which one of the following most accurately describes the role played in the meteorologist's argument by the claim that, in general, as water vapor in larger clouds condenses, heavier downpours are more likely to result?",
    options: [
      { letter: "A", text: "It is the only conclusion in the argument" },
      { letter: "B", text: "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion in the argument" },
      { letter: "C", text: "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole" },
      { letter: "D", text: "It is used to support the only conclusion in the argument" },
      { letter: "E", text: "It provides a causal explanation of the phenomenon described by the conclusion of the argument as a whole, but it is not intended to provide support for that conclusion" },
    ],
    correctAnswer: "D",
    structuralMap: [
      { label: "Conclusion", text: "Heavy downpours are likely to become more frequent if Earth's atmosphere becomes significantly warmer. (Warmer atmosphere → More frequent heavy downpours)" },
      { label: "Premise 1", text: "A warm atmosphere heats the oceans, leading to faster evaporation, and the resulting water vapor forms rain clouds more quickly. (Warm atmosphere → Faster rain cloud formation)" },
      { label: "Premise 2", text: "A warmer atmosphere also holds more moisture, resulting in larger clouds. (Warm atmosphere → Larger clouds)" },
      { label: "Premise 3", text: "In general, as water vapor in larger clouds condenses, heavier downpours are more likely to result. (Larger clouds → More frequent heavy downpours)" },
    ],
    answerBreakdowns: [
      { letter: "A", text: "It is the only conclusion in the argument", explanation: "The statement we are analyzing is the last statement and is a premise (Premise 3: Larger clouds → More frequent heavy downpours). It is NOT the conclusion.", isCorrect: false },
      { letter: "B", text: "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion in the argument", explanation: "Same problem — this is not the conclusion. The conclusion is the first statement.", isCorrect: false },
      { letter: "C", text: "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole", explanation: "This describes an intermediate conclusion. But statement 4 is not supported by any other statement in the argument — it is a standalone premise.", isCorrect: false },
      { letter: "D", text: "It is used to support the only conclusion in the argument", explanation: "Correct. The statement is Premise 3, which supports the only conclusion (statement 1). There is no intermediate conclusion — the three premises independently support the conclusion.", isCorrect: true },
      { letter: "E", text: "It provides a causal explanation of the phenomenon described by the conclusion of the argument as a whole, but it is not intended to provide support for that conclusion", explanation: "The statement IS intended to provide support for the conclusion. The causal chain (warm → larger clouds → heavier downpours) serves as evidence for the conclusion.", isCorrect: false },
    ],
    causalTrapWarning: `CAUSAL TRAP WARNING: Just because there is a causal chain (A → B → C) doesn't mean A is the premise, B the intermediate conclusion, and C the conclusion!

Consider Megan's Coffee: "Because Megan missed her morning coffee she was not paying attention to her surroundings. As a result she fell down the stairs. So not getting your daily dose of caffeine can cause dangerous accidents."

Causal chain: No Coffee (A) → Not Paying Attention (B) → Accident (C)
But structurally: Premise: A→B, Premise: B→C, Conclusion: A→C

Does A→B support B→C? No. They are two independent causal relationships that happen to form the same chain. Always treat the structure of an argument (premise/conclusion) and the logical aspects (cause/effect, sufficient/necessary) as two distinct and separate issues!`,
  },
  {
    id: "PT87-S3-Q8",
    stimulus: `Astronomer: Conditions in our solar system have probably favored the emergence of life more than conditions in most other solar systems of similar age. Any conceivable form of life depends on the presence of adequate amounts of chemical elements heavier than hydrogen and helium, and our sun has an unusually high abundance of these heavier elements for its age.`,
    questionStem: "Which one of the following most accurately describes the role played in the astronomer's argument by the claim that any conceivable form of life depends on chemical elements heavier than hydrogen and helium?",
    options: [
      { letter: "A", text: "It is a statement for which no evidence is provided and that is part of the evidence offered for the argument's only conclusion" },
      { letter: "B", text: "It is a statement for which no evidence is provided and that is offered as support for another statement that in turn is offered as support for the conclusion of the argument as a whole" },
      { letter: "C", text: "It is a statement for which some evidence is provided and that itself is offered as support for the conclusion of the argument as a whole" },
      { letter: "D", text: "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered" },
      { letter: "E", text: "It is one of two conclusions in the argument, neither of which is offered as support for the other" },
    ],
    correctAnswer: "A",
    structuralMap: [
      { label: "Conclusion", text: "Conditions in our solar system have probably favored the emergence of life more than conditions in most other solar systems of similar age." },
      { label: "Premise 1", text: "Any conceivable form of life depends on the presence of adequate amounts of chemical elements heavier than hydrogen and helium." },
      { label: "Premise 2", text: "Our sun has an unusually high abundance of these heavier elements for its age." },
    ],
    answerBreakdowns: [
      { letter: "A", text: "It is a statement for which no evidence is provided and that is part of the evidence offered for the argument's only conclusion", explanation: "The statement is a premise (no evidence supports it). The argument contains no intermediate conclusion (only conclusion). Statements 2 and 3 are INDEPENDENT premises supporting statement 1, the conclusion. Correct.", isCorrect: true },
      { letter: "B", text: "It is a statement for which no evidence is provided and that is offered as support for another statement that in turn is offered as support for the conclusion of the argument as a whole", explanation: "This describes an intermediate conclusion existing in the argument. Earth having heavy elements does not support the fact that life needs these elements, nor vice versa. No intermediate conclusion here.", isCorrect: false },
      { letter: "C", text: "It is a statement for which some evidence is provided and that itself is offered as support for the conclusion of the argument as a whole", explanation: "This describes an intermediate conclusion. There is no evidence supporting this statement in the argument — it is a standalone premise.", isCorrect: false },
      { letter: "D", text: "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered", explanation: "The statement is NOT the main conclusion (that's statement 1), and there is no intermediate conclusion in this argument.", isCorrect: false },
      { letter: "E", text: "It is one of two conclusions in the argument, neither of which is offered as support for the other", explanation: "There is only one conclusion. This describes a stimulus with two independent conclusions (e.g., 'John has a high GPA and a high LSAT score'). That's not what we have.", isCorrect: false },
    ],
  },
  {
    id: "PT79-S1-Q22",
    stimulus: `Consumer advocate: Economists reason that price gouging — increasing the price of goods when no alternative seller is available — is efficient because it allocates goods to people whose willingness to pay more shows that they really need these goods. But willingness to pay is not proportional to need. In the real world, some people simply cannot pay as much as others. As a result, a price increase will allocate goods to people with the most money, not to those with the most need.`,
    questionStem: "Which one of the following most accurately describes the role played in the consumer advocate's argument by the claim that willingness to pay is not proportional to need?",
    options: [
      { letter: "A", text: "It disputes one explanation in order to make way for an alternative explanation" },
      { letter: "B", text: "It is the overall conclusion of the argument" },
      { letter: "C", text: "It is a component of the reasoning disputed in the argument" },
      { letter: "D", text: "It is a general principle whose validity the argument questions" },
      { letter: "E", text: "It denies a claim that the argument takes to be assumed in the reasoning that it rejects" },
    ],
    correctAnswer: "E",
    structuralMap: [
      { label: "Opposing Argument (Economists)", text: "Price gouging is efficient because willingness to pay more shows real need. [Assumption: willingness to pay IS proportional to need]" },
      { label: "Consumer Advocate's Attack (Intermediate Conclusion)", text: "But willingness to pay is not proportional to need." },
      { label: "Premise (Support for IC)", text: "In the real world, some people simply cannot pay as much as others." },
      { label: "Main Conclusion", text: "As a result, a price increase will allocate goods to people with the most money, not to those with the most need." },
    ],
    answerBreakdowns: [
      { letter: "A", text: "It disputes one explanation in order to make way for an alternative explanation", explanation: "Remember: 'explanation' on the LSAT means 'causation.' This would require the structure: 'A is not caused by B, it's caused by C.' The consumer advocate doesn't offer an alternative cause — they just reject the economists' reasoning. This is the most commonly selected wrong answer.", isCorrect: false },
      { letter: "B", text: "It is the overall conclusion of the argument", explanation: "The overall conclusion is the last statement: price increases allocate goods to the rich, not the needy.", isCorrect: false },
      { letter: "C", text: "It is a component of the reasoning disputed in the argument", explanation: "The reasoning disputed is the economists' reasoning. This statement is the consumer advocate's own claim attacking that reasoning — it's not a component OF the economists' reasoning.", isCorrect: false },
      { letter: "D", text: "It is a general principle whose validity the argument questions", explanation: "This statement is part of the consumer advocate's argument. Its validity is NOT questioned — the consumer advocate is asserting it.", isCorrect: false },
      { letter: "E", text: "It denies a claim that the argument takes to be assumed in the reasoning that it rejects", explanation: "The economists assume that willingness to pay IS proportional to need. The consumer advocate's statement directly denies this assumption. 'Reasoning that it rejects' = the economists' reasoning. The statement attacks the assumption underlying the rejected reasoning.", isCorrect: true },
    ],
  },
  {
    id: "PT59-S2-Q7",
    stimulus: `Columnist: It has been noted that attending a live musical performance is a richer experience than listening to recorded music. Some say that this is merely because we do not see the performers when we listen to recorded music. However, there must be some other reason, for there is relatively little difference between listening to someone read a story over the radio and listening to someone in the same room read a story.`,
    questionStem: "Which one of the following most accurately expresses the role played in the argument by the observation that attending a live musical performance is a richer experience than is listening to recorded music?",
    options: [
      { letter: "A", text: "It is what the columnist's argument purports to show" },
      { letter: "B", text: "It is the reason given for the claim that the columnist's argument is attempting to undermine" },
      { letter: "C", text: "It is what the columnist's argument purports to explain" },
      { letter: "D", text: "It is what the columnist's argument purports to refute" },
      { letter: "E", text: "It is what the position that the columnist tries to undermine is purported to explain" },
    ],
    correctAnswer: "E",
    structuralMap: [
      { label: "Phenomenon / Observation", text: "Attending a live musical performance is a richer experience than listening to recorded music." },
      { label: "Opposing View (Cause)", text: "Some say this is merely because we do not see the performers when we listen to recorded music." },
      { label: "Author's Conclusion", text: "However, there must be some other reason..." },
      { label: "Premise (Support)", text: "...for there is relatively little difference between listening to someone read a story over the radio and listening to someone in the same room read a story." },
    ],
    answerBreakdowns: [
      { letter: "A", text: "It is what the columnist's argument purports to show", explanation: "This refers to the main conclusion. Statement 1 is a phenomenon/observation — not the main conclusion. The columnist's conclusion is that there must be some OTHER reason.", isCorrect: false },
      { letter: "B", text: "It is the reason given for the claim that the columnist's argument is attempting to undermine", explanation: "This reverses the cause-effect relationship. In the stimulus: not seeing performers (cause) → richer live experience (effect). Answer B says: richer live experience is the REASON for not seeing performers. That's backwards.", isCorrect: false },
      { letter: "C", text: "It is what the columnist's argument purports to explain", explanation: "Most commonly selected wrong answer. 'Explain' = 'provide a cause for.' Does the author provide a cause for why live music is richer? No — the author only rejects another person's cause without offering an alternative.", isCorrect: false },
      { letter: "D", text: "It is what the columnist's argument purports to refute", explanation: "The author doesn't reject the observation that live music is richer. The author refutes an explanation FOR why it's richer, but accepts the phenomenon itself.", isCorrect: false },
      { letter: "E", text: "It is what the position that the columnist tries to undermine is purported to explain", explanation: "'Position the columnist tries to undermine' = not seeing performers causes the richer experience. What is this position purporting to explain? The observation that live music is richer. Bingo.", isCorrect: true },
    ],
  },
];
