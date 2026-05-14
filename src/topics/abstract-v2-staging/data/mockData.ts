import { DrillItem, DrillOption, Flashcard, KeywordExtractionItem, Lesson, MatchingItem, MethodPattern, QuestionStem, TermDefinitionItem } from '../types';

export const LESSONS: Lesson[] = [
  {
    id: 'why_hard',
    title: 'Why Abstract Answer Choices Feel Hard',
    type: 'concept',
    content: ''
  },
  {
    id: 'deabstractifying_method',
    title: 'The De-abstractifying Method',
    type: 'concept',
    content: ''
  },
  {
    id: 'words_to_know',
    title: 'The Words You Must Know',
    type: 'concept',
    content: ''
  },
  {
    id: 'abstract_15',
    title: 'Decode the 15 Abstract Answer Choices',
    type: 'concept',
    content: ''
  },
  {
    id: 'decode_practice',
    title: 'Decode Practice',
    type: 'concept',
    content: ''
  }
];

export interface AbstractChoice {
  id: number;
  original: string;
  correctKeywords: string[];
  distractorKeywords: string[];
  plainEnglish: string;
  stimulusRequirements: string[];
  trapRequirements: string[];
  coachNote: string;
  example?: string;
  structureType?: string;
}

export const ABSTRACT_CHOICES: AbstractChoice[] = [
  {
    id: 1,
    original: "It is used to illustrate the general principle that the argument presupposes.",
    correctKeywords: ["illustrate", "general principle", "presupposes"],
    distractorKeywords: ["used", "argument", "that"],
    plainEnglish: "The statement is an example of a broad rule that the argument needs in order to work.",
    stimulusRequirements: [
      "The statement must be an example.",
      "The example must point to a broader rule.",
      "That broader rule must be required by the argument."
    ],
    trapRequirements: [
      "The statement is a conclusion, not an illustration.",
      "The rule is mentioned but not presupposed (it's not necessary).",
      "The statement is a specific fact, not illustrating a principle."
    ],
    coachNote: "Do not treat “general principle” as just another claim. A principle is broader than one person or one case. It is a rule that applies across cases.",
    example: "John is tired every morning and should go to bed earlier is not a principle. People who are tired every morning should try to go to bed earlier is a principle.",
    structureType: "Role / Principle"
  },
  {
    id: 2,
    original: "It is an illustration of a premise that is used to support the argument’s conclusion.",
    correctKeywords: ["illustration", "premise", "support", "conclusion"],
    distractorKeywords: ["used", "argument's", "that"],
    plainEnglish: "The statement is an example of a premise, and that premise supports the conclusion.",
    stimulusRequirements: [
      "There must be a premise.",
      "The quoted statement must be an example of that premise.",
      "The premise must support the conclusion."
    ],
    trapRequirements: [
      "The statement is the conclusion itself.",
      "The statement is an example of a counterargument, not a premise.",
      "The premise does not actually support the conclusion."
    ],
    coachNote: "The quoted statement is not just support. It is an example of the support.",
    structureType: "Role"
  },
  {
    id: 3,
    original: "It is used to counter a consideration that might be taken to undermine the argument’s conclusion.",
    correctKeywords: ["counter", "consideration", "undermine", "conclusion"],
    distractorKeywords: ["used", "taken", "might"],
    plainEnglish: "The statement answers a possible objection to the author’s conclusion.",
    stimulusRequirements: [
      "There must be a possible objection.",
      "That objection would weaken the author’s conclusion.",
      "The quoted statement must push back against that objection."
    ],
    trapRequirements: [
      "There is no objection mentioned in the stimulus.",
      "The author actually agrees with the consideration.",
      "The statement supports the objection instead of countering it."
    ],
    coachNote: "This is a pre-emptive strike. The author is shutting down a possible problem before it hurts the argument.",
    structureType: "Method / Role"
  },
  {
    id: 4,
    original: "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false.",
    correctKeywords: ["observation", "insufficient", "justify", "claim", "concludes is false"],
    distractorKeywords: ["makes", "according", "that"],
    plainEnglish: "Someone uses an observation to support a claim, but the author says that observation is not enough and concludes the claim is false.",
    stimulusRequirements: [
      "There must be an opposing claim.",
      "The opponent must give an observation as support.",
      "The author must say that observation is not enough.",
      "The author must reject the opposing claim."
    ],
    trapRequirements: [
      "The author agrees with the opponent's conclusion.",
      "The observation is treated as sufficient by the author.",
      "The statement is the author's own conclusion."
    ],
    coachNote: "This answer choice describes an argument with two sides. The quoted statement belongs to the support for the view the author is attacking.",
    structureType: "Method"
  },
  {
    id: 5,
    original: "It describes a phenomenon for which the argument’s conclusion is offered as an explanation.",
    correctKeywords: ["phenomenon", "conclusion", "explanation"],
    distractorKeywords: ["describes", "offered", "which"],
    plainEnglish: "The statement describes something that happened, and the conclusion gives the cause.",
    stimulusRequirements: [
      "There must be a phenomenon or result.",
      "The conclusion must explain what caused it.",
      "The argument must use cause-effect reasoning."
    ],
    trapRequirements: [
      "The conclusion is the phenomenon, not the explanation.",
      "There is no causal reasoning; it's purely descriptive.",
      "The statement is the explanation, not the phenomenon."
    ],
    coachNote: "On the LSAT, explanation usually means cause.",
    structureType: "Method / Role"
  },
  {
    id: 6,
    original: "It is a general principle whose validity the argument questions.",
    correctKeywords: ["general principle", "validity", "questions"],
    distractorKeywords: ["whose", "argument", "it is"],
    plainEnglish: "The statement is a broad rule, and the author attacks whether that rule is true.",
    stimulusRequirements: [
      "The quoted statement must be a broad rule.",
      "The author must challenge that rule.",
      "The argument must question whether the rule is valid."
    ],
    trapRequirements: [
      "The statement is a specific fact, not a principle.",
      "The author uses the principle to support their point.",
      "The author assumes the principle is true."
    ],
    coachNote: "Do not call something a general principle unless it applies beyond one specific case.",
    structureType: "Role / Method"
  },
  {
    id: 7,
    original: "It denies a claim that the argument takes to be assumed in the reasoning it rejects.",
    correctKeywords: ["denies", "assumed", "reasoning it rejects"],
    distractorKeywords: ["claim", "takes", "that"],
    plainEnglish: "The author attacks an assumption inside someone else’s reasoning.",
    stimulusRequirements: [
      "There must be another person’s reasoning.",
      "That reasoning must rely on an assumption.",
      "The quoted statement must deny that assumption."
    ],
    trapRequirements: [
      "The author denies a premise, not an assumption.",
      "The author agrees with the other person’s reasoning.",
      "The statement is the assumption itself."
    ],
    coachNote: "This is more specific than rejecting another person’s conclusion. The author is going after what the other side took for granted.",
    structureType: "Method"
  },
  {
    id: 8,
    original: "It is a claim for which no justification is provided but that is required to establish the argument’s main conclusion.",
    correctKeywords: ["no justification", "required", "establish", "main conclusion"],
    distractorKeywords: ["claim", "provided", "but"],
    plainEnglish: "The statement is an unsupported premise that the main conclusion needs.",
    stimulusRequirements: [
      "The statement must support the main conclusion.",
      "No other statement supports it.",
      "The conclusion depends on it."
    ],
    trapRequirements: [
      "The statement is supported by another premise.",
      "The statement is not necessary for the conclusion.",
      "The statement is the main conclusion itself."
    ],
    coachNote: "No justification plus required for the conclusion means premise.",
    structureType: "Role"
  },
  {
    id: 9,
    original: "It is a claim for which justification is provided and that, if true, establishes the truth of the argument’s main conclusion.",
    correctKeywords: ["justification is provided", "establishes", "main conclusion"],
    distractorKeywords: ["claim", "truth", "if true"],
    plainEnglish: "The statement is supported by evidence, and if it is true, it proves the main conclusion.",
    stimulusRequirements: [
      "The statement must be supported by another statement.",
      "The statement must then support the main conclusion.",
      "If true, it must establish the conclusion."
    ],
    trapRequirements: [
      "The statement has no supporting evidence.",
      "The statement does not support the main conclusion.",
      "The statement is a premise that is not supported (no justification provided)."
    ],
    coachNote: "This is usually an intermediate conclusion. It is supported by something else and then used to support the final point.",
    structureType: "Role"
  },
  {
    id: 10,
    original: "It is what the author’s argument purports to explain.",
    correctKeywords: ["what", "argument", "purports to explain"],
    distractorKeywords: ["author's", "it is"],
    plainEnglish: "The statement is the thing the argument is trying to explain.",
    stimulusRequirements: [
      "The statement must be a phenomenon, result, or fact.",
      "The argument must offer an explanation for it.",
      "The argument must be explanatory, usually causal."
    ],
    trapRequirements: [
      "The statement IS the explanation.",
      "The argument does not explain the statement; it just describes it.",
      "The statement is the conclusion."
    ],
    coachNote: "This is closely related to item 5. Look for the thing being explained, not the explanation itself.",
    structureType: "Role"
  },
  {
    id: 11,
    original: "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence.",
    correctKeywords: ["hypothesis", "undermine", "sufficiency of the evidence"],
    distractorKeywords: ["argument", "attempts", "calling into question"],
    plainEnglish: "The argument is trying to weaken a potential explanation by saying the available evidence is not enough to support it.",
    stimulusRequirements: [
      "There must be a hypothesis, meaning a potential explanation or causal theory.",
      "The argument must try to weaken that hypothesis.",
      "The attack must be based on the evidence not being strong enough."
    ],
    trapRequirements: [
      "The statement is a fact, not a hypothesis.",
      "The argument supports the hypothesis.",
      "The attack is based on a direct contradiction, not insufficient evidence."
    ],
    coachNote: "Do not flatten hypothesis into claim. A hypothesis is a proposed explanation for why something happened or why something is the way it is.",
    structureType: "Role / Method"
  },
  {
    id: 12,
    original: "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion in the argument.",
    correctKeywords: ["conclusion as a whole", "not the only explicitly stated conclusion"],
    distractorKeywords: ["argument", "stated", "explicitly"],
    plainEnglish: "The statement is the main conclusion, and the argument also contains an intermediate conclusion.",
    stimulusRequirements: [
      "The quoted statement must be the main conclusion.",
      "There must be another stated conclusion in the argument.",
      "That other conclusion must be intermediate."
    ],
    trapRequirements: [
      "The statement is an intermediate conclusion, not the main one.",
      "There are no other conclusions in the argument.",
      "The statement is a premise."
    ],
    coachNote: "This is testing whether the student can separate the final conclusion from a supported sub-conclusion.",
    structureType: "Role"
  },
  {
    id: 13,
    original: "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole.",
    correctKeywords: ["intended to support", "not the conclusion as a whole"],
    distractorKeywords: ["statement", "argument", "that"],
    plainEnglish: "The argument supports this statement, but this statement is not the final conclusion.",
    stimulusRequirements: [
      "The statement must be supported by the argument.",
      "The statement must not be the main conclusion.",
      "It likely functions as an intermediate conclusion."
    ],
    trapRequirements: [
      "The statement is the main conclusion.",
      "The argument does not support the statement.",
      "The statement is a premise."
    ],
    coachNote: "Supported but not final usually means intermediate conclusion.",
    structureType: "Role"
  },
  {
    id: 14,
    original: "It is a statement for which some evidence is provided and that itself is offered as support for the conclusion of the argument as a whole.",
    correctKeywords: ["evidence is provided", "itself is offered as support", "conclusion as a whole"],
    distractorKeywords: ["statement", "offered", "which"],
    plainEnglish: "The statement is supported by evidence and then used to support the main conclusion.",
    stimulusRequirements: [
      "Some evidence must support the statement.",
      "The statement must then support the main conclusion.",
      "It must play both roles."
    ],
    trapRequirements: [
      "No evidence is provided for the statement.",
      "The statement does not support the main conclusion.",
      "The statement is the main conclusion."
    ],
    coachNote: "This is the classic intermediate conclusion pattern: supported by something, supporting something else.",
    structureType: "Role"
  },
  {
    id: 15,
    original: "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered.",
    correctKeywords: ["conclusion as a whole", "supported by another statement", "support is offered"],
    distractorKeywords: ["argument", "which", "another"],
    plainEnglish: "The statement is the main conclusion, and one of its supports is itself supported by another statement.",
    stimulusRequirements: [
      "The quoted statement must be the main conclusion.",
      "It must be supported by another statement.",
      "That supporting statement must itself have support."
    ],
    trapRequirements: [
      "The statement is an intermediate conclusion.",
      "The supporting statement has no support of its own.",
      "The statement is a premise."
    ],
    coachNote: "This describes a main conclusion supported by an intermediate conclusion.",
    structureType: "Role"
  }
];

export const TERMS: TermDefinitionItem[] = [
  {
    id: 'term_1',
    term: 'Presuppose',
    options: [
      'To guess about the future',
      'To require or assume as a necessary condition',
      'To state explicitly as a premise',
      'To disagree with a previous claim'
    ],
    correctOption: 1,
    definition: 'In daily usage, a presupposition can mean either an assumption or something that is necessary.',
    explanation: 'On the LSAT, presuppose simply means "require." It refers to a necessary condition.'
  },
  {
    id: 'term_2',
    term: 'Illustrate',
    options: [
      'To draw a diagram',
      'To provide a detailed causal mechanism',
      'To provide an example of something',
      'To logically prove something is true'
    ],
    correctOption: 2,
    definition: 'To make clear by using an example.',
    explanation: 'An illustration, as it appears in LR questions, simply refers to providing an example.'
  },
  {
    id: 'term_3',
    term: 'General Principle',
    options: [
      'A specific law passed by a government',
      'A broad rule that guides or justifies actions, applying beyond one specific case',
      'A summary of numerical data',
      'An unstated assumption made by the author'
    ],
    correctOption: 1,
    definition: 'A broad rule that guides or justifies actions, applying beyond one specific case.',
    explanation: 'A generalizable rule that guides or justifies actions or decisions, applying to multiple conditions and scenarios.'
  },
  {
    id: 'term_4',
    term: 'Explanation',
    options: [
      'A clarification of a confusing term',
      'The cause of an observed phenomenon',
      'An argument against an opponent',
      'A summary of the main conclusion'
    ],
    correctOption: 1,
    definition: 'A statement that clarifies the cause or reason for something.',
    explanation: 'On the LSAT, "explanation" usually means the cause of a phenomenon.'
  },
  {
    id: 'term_5',
    term: 'Hypothesis',
    options: [
      'A proven scientific fact',
      'An undeniable logical deduction',
      'A proposed explanation or potential cause',
      'A random guess with no evidence'
    ],
    correctOption: 2,
    definition: 'A posited causal explanation of a phenomenon, explaining WHY something is the way it is.',
    explanation: 'On the LSAT, the word "hypothesis" can be understood as a "potential explanation/potential causation"; it usually appears in science/medicine themed LR stimuli.'
  }
];

export const MATCHING_ITEMS: MatchingItem[] = [
  {
    id: 'match_1',
    stimulus: 'John: Celebrities have the biggest smiles in front of the camera, so they must be the happiest people alive.\nDavid: That is not true. Many celebrities suffer from depression and substance abuse. Smiling in front of the camera doesn’t mean a thing, they could simply be putting on a show for the audience.',
    answerChoice: 'It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false.',
    parts: [
      {
        text: 'makes an observation',
        matches: true,
        explanation: 'John observed that celebrities have the biggest smiles.',
        highlightText: 'celebrities have the biggest smiles in front of the camera'
      },
      {
        text: 'is insufficient to justify the claim',
        matches: true,
        explanation: 'David argues that smiling does not mean a thing, so the observation doesn’t justify the happiness claim.',
        highlightText: 'doesn’t mean a thing'
      },
      {
        text: 'the claim that the argument concludes is false',
        matches: true,
        explanation: 'David concludes that John’s claim ("they must be the happiest people alive") is not true.',
        highlightText: 'they must be the happiest people alive'
      }
    ]
  },
  {
    id: 'match_2',
    stimulus: 'Smoking is a leading cause of lung cancer, John has lung cancer, therefore he must surely have been a heavy smoker.',
    answerChoice: 'It describes a phenomenon for which the argument’s conclusion is offered as an explanation.',
    parts: [
      {
        text: 'describes a phenomenon',
        matches: true,
        explanation: 'John having lung cancer is the observed effect or phenomenon.',
        highlightText: 'John has lung cancer'
      },
      {
        text: 'conclusion is offered as an explanation',
        matches: true,
        explanation: 'The conclusion "he must surely have been a heavy smoker" is the proposed cause (explanation) for his lung cancer.',
        highlightText: 'he must surely have been a heavy smoker'
      }
    ]
  }
];

export const DRILLS: DrillItem[] = [
  {
    id: 'drill_1',
    type: 'role',
    stimulus: 'The new highway project will be completed ahead of schedule. After all, the construction crew has been working double shifts for the past three months, and similar projects with this level of effort have reliably finished early.',
    question: 'The claim that the construction crew has been working double shifts plays which one of the following roles in the argument?',
    options: [
      { text: 'It is the argument’s main conclusion.', explanation: 'The main conclusion is "The new highway project will be completed ahead of schedule." It is what the author is trying to prove.' },
      { text: 'It is a premise offered in support of the argument’s conclusion.', explanation: 'Correct. The claim about double shifts directly supports the conclusion that the project finished early.' },
      { text: 'It is an intermediate conclusion that supports the main conclusion.', explanation: 'An intermediate conclusion requires its own supporting evidence. The shift claim is simply assertive evidence here.' },
      { text: 'It is a concession to a potential counterargument.', explanation: 'A concession would acknowledge a opposing point of view (e.g., "Although the work was hard..."). This claim provides direct justification.' }
    ],
    correctOptionIndex: 1,
    explanation: 'The main conclusion is "The new highway project will be completed ahead of schedule." The claim about double shifts is given as evidence (indicated by "After all") to support that conclusion. It is not supported by any other statements, making it a pure premise.',
    trapTag: 'wrong_role'
  },
  {
    id: 'drill_2',
    type: 'method',
    stimulus: 'Manager: We should switch our server hosting provider. Our current provider had an outage last week.\nIT Lead: But our current provider has 99.9% uptime over the last five years, whereas the provider you are suggesting has had four major outages this year alone. It makes no sense to switch.',
    question: 'The IT Lead responds to the Manager’s argument by doing which one of the following?',
    options: [
      { text: 'Providing an alternative explanation for the recent outage.', explanation: 'The IT Lead does not explain *why* the outage happened, they instead provide counter-evidence to the suggestion to switch.' },
      { text: 'Pointing out that the opponent failed to take relevant information into account.', explanation: 'Correct. The IT Lead introduces server performance data (5-year uptime, the other provider\'s failures) that the Manager completely ignored.' },
      { text: 'Deriving a general principle from specific examples.', explanation: 'The IT Lead is not trying to find a rule here, they are comparing performance records.' },
      { text: 'Showing that the opponent’s conclusion leads to an impossible result.', explanation: 'The IT Lead does not show that switching is logically "impossible," they just argue it’s a bad idea given the data.' }
    ],
    correctOptionIndex: 1,
    explanation: 'The IT Lead challenges the Manager by introducing new, relevant information (the 5-year uptime and the other provider\'s poor record) that the Manager overlooked.',
    trapTag: 'wrong_method'
  },
  {
    id: 'drill_3',
    type: 'flaw',
    stimulus: 'To be legally allowed to drive, a person must pass a driving test. Sarah passed her driving test yesterday. Therefore, she must now be legally allowed to drive.',
    question: 'The reasoning in the argument is flawed because it:',
    options: [
      { text: 'Mistakes a temporal relationship between two events for a causal relationship.', explanation: 'The argument is not about the order of events, but rather about the logical requirements for an action.' },
      { text: 'Presumes, without providing justification, that a condition necessary for an outcome is also sufficient to produce that outcome.', explanation: 'Correct. The argument mistakes necessary (must pass test) for sufficient (if she passed test, she *must* be allowed).' },
      { text: 'Relies on an inappropriate analogy between passing a test and legal permission.', explanation: 'There is no analogy here; it’s a direct, flawed deductive inference.' },
      { text: 'Attacks the person making a claim rather than the claim itself.', explanation: 'There is no personal attack here, only a structural flaw in the reasoning.' }
    ],
    correctOptionIndex: 1,
    explanation: 'Passing the test is necessary to drive, but it might not be sufficient (she might also need a valid license, insurance, be of a certain age, etc.). The argument treats a requirement as a guarantee.',
    trapTag: 'structural_mismatch'
  },
  {
    id: 'drill_4',
    type: 'one_word_trap',
    stimulus: 'Some people argue that reading fiction is a waste of time. But reading fiction builds empathy by exposing readers to different perspectives. Empathy is a crucial skill for navigating social interactions in the workplace.',
    question: 'Which of the following describes the role of the claim that reading fiction builds empathy?',
    options: [
      { text: 'It is a premise that completely proves the main conclusion that reading fiction is not a waste of time.', explanation: 'Wrong. Premises "support" a conclusion; they rarely "completely prove" it in a formal sense. This is an overstatement.' },
      { text: 'It is a premise offered to counter the claim that reading fiction is a waste of time.', explanation: 'Correct. The claim builds empathy, which the author uses to argue against the idea that fiction is a waste of time.' }
    ],
    correctOptionIndex: 1,
    explanation: 'The first option uses the extreme word "completely proves". The premise supports the conclusion but doesn\'t "completely prove" it in a formal logic sense. The second option accurately describes its role as countering the first sentence.',
    trapTag: 'attractive_language'
  }
];

export const FLASHCARDS: Flashcard[] = [
  {
    id: 'fc_1',
    category: 'Terminology',
    question: 'How are the terms "Explanation for a Phenomenon" and "Hypothesis" related on the LSAT?',
    answer: 'They are essentially synonyms. Both refer to identifying the cause of a curious fact or event.'
  },
  {
    id: 'fc_2',
    category: 'Question Stems',
    question: 'What are typical keywords for a Parallel Flaw question stem?',
    answer: '"Flawed pattern of reasoning", "most closely parallel", "most similar to", "most like that in..."'
  },
  {
    id: 'fc_3',
    category: 'Distinctions',
    question: 'What is the difference between a Counterexample and an Alternate Explanation?',
    answer: 'Counterexample: A specific case that disproves a general rule. Alternate Explanation: A different way to explain a specific curious fact.'
  },
  {
    id: 'fc_4',
    category: 'Terminology',
    question: 'What is an Inference in the context of the LSAT?',
    answer: 'A claim that can be derived from a statement or set of statements. It must be strictly provable based on the given information.'
  },
  {
    id: 'fc_5',
    category: 'Concepts',
    question: 'What is a "claim"?',
    answer: 'A grammatically complete idea. Everything in a stimulus—premises, conclusions, background, counterpoints—is a claim. A single sentence can contain multiple claims.'
  },
  {
    id: 'fc_6',
    category: 'Terminology',
    question: 'What is another name for a "Supported Premise"?',
    answer: 'An Intermediate Conclusion (or Subsidiary Conclusion). It supports the main conclusion but is itself supported by a premise.'
  },
  {
    id: 'fc_7',
    category: 'Answer Phrasing',
    question: 'In the phrase "using X to support Y", which is the conclusion and which is the evidence?',
    answer: 'Y is the conclusion (the thing being supported), and X is the evidence (the thing used to do the supporting).'
  },
  {
    id: 'fc_8',
    category: 'Answer Phrasing',
    question: 'In the phrase "doing X by doing Y", which is the conclusion and which is the evidence?',
    answer: 'X is the conclusion, and Y is the evidence. The word "by" indicates the method or evidence.'
  },
  {
    id: 'fc_9',
    category: 'Answer Phrasing',
    question: 'In the phrase "concludes, from the claim that X, that Y", which is the conclusion and which is the evidence?',
    answer: 'Y is the conclusion, and X is the evidence.'
  },
  {
    id: 'fc_10',
    category: 'Answer Phrasing',
    question: 'In the phrase "appeals to X in order to Y", which is the conclusion and which is the evidence?',
    answer: 'Y is the conclusion, and X is the evidence. One "appeals to" evidence to reach a conclusion.'
  },
  {
    id: 'fc_11',
    category: 'Answer Phrasing',
    question: 'In the phrase "infers that X on the grounds that Y", which is the conclusion and which is the evidence?',
    answer: 'X is the conclusion (infers = concludes), and Y is the evidence (grounds = premises).'
  },
  {
    id: 'fc_12',
    category: 'Concepts',
    question: 'What are typical phrasings LSAT uses to present a correlation?',
    answer: 'Temporal: "X happened at the same time as Y". Statistical: "People who are X tend to be Y", "X is associated with Y", "Being X makes Y more likely".'
  },
  {
    id: 'fc_13',
    category: 'Distinctions',
    question: 'What is the difference between an Analogy and an Example?',
    answer: 'Analogy: A specific case similar in some general way to another specific case. Example: A specific case that illustrates a broader general idea.'
  }
];

export const METHOD_PATTERNS: MethodPattern[] = [
  {
    id: 'mp_1',
    name: 'Providing an Alternative Explanation',
    plainEnglish: 'The author offers a different cause for the observed effect than the one originally suggested.',
    answerChoiceLanguage: 'offers a rival explanation for the phenomenon in question',
    mustHappen: 'There must be a primary explanation offered first, and the author must propose a different one.',
    example: {
      stimulus: 'The plant died because it wasn\'t watered. BUT, it might have died because it was placed in direct sunlight for too long.',
      explanation: 'The author counters the "no water" theory with a "too much sun" theory.'
    }
  },
  {
    id: 'mp_2',
    name: 'Excluding Alternative Explanations',
    plainEnglish: 'The author proves their theory by showing that other possible causes are unlikely.',
    answerChoiceLanguage: 'rules out several potential causes for the observed effect',
    mustHappen: 'The author must mention other possible causes and then dismiss them.',
    example: {
      stimulus: 'The light didn\'t break because of a power surge or a faulty bulb; therefore, the wiring must be the problem.',
      explanation: 'The author rules out surges and bulbs to isolate wiring as the cause.'
    }
  },
  {
    id: 'mp_3',
    name: 'Appeal to a Definition',
    plainEnglish: 'The author uses the meaning of a word to prove their point.',
    answerChoiceLanguage: 'relies on a definition of a key term to support its conclusion',
    mustHappen: 'A word\'s definition must be explicitly or implicitly used as the reason for the conclusion.',
    example: {
      stimulus: 'A museum is by definition a place that preserves artifacts. Since this building does not preserve anything, it is not a museum.',
      explanation: 'The argument rests entirely on what the word "museum" means.'
    }
  },
  {
    id: 'mp_4',
    name: 'Pointing out Failed to Consider Information',
    plainEnglish: 'The author attacks an argument by showing it ignored something important.',
    answerChoiceLanguage: 'points out relevant information that the opponent failed to take into account',
    mustHappen: 'The author must introduce a fact that the previous argument did not mention.',
    example: {
      stimulus: 'You say the movie was bad because it was short. But you ignored the fact that it was a highly acclaimed experimental short film.',
      explanation: 'The author introduces a relevant category (experimental short film) ignored by the manager.'
    }
  },
  {
    id: 'mp_5',
    name: 'Using a Counterexample',
    plainEnglish: 'The author shows a general rule is wrong by providing one case where it fails.',
    answerChoiceLanguage: 'undermines a generalization by providing a specific counterexample',
    mustHappen: 'A general claim must be made, and the author must point to one specific case that contradicts it.',
    example: {
      stimulus: 'They say all birds fly. But penguins are birds and they do not fly.',
      explanation: 'The penguin is the counterexample to the "all birds fly" generalization.'
    }
  },
  {
    id: 'mp_6',
    name: 'Inferring Causation from Correlation',
    plainEnglish: 'The author notices two things happening together and assumes one causes the other.',
    answerChoiceLanguage: 'infers a causal relationship from a mere temporal correlation',
    mustHappen: 'The stimulus identifies a correlation (two things happening together) and the conclusion asserts a cause.',
    example: {
      stimulus: 'Every time I wear these socks, my team wins. Therefore, these socks cause my team to win.',
      explanation: 'The author assumes wearing socks causes the win just because they happen together.'
    }
  },
  {
    id: 'mp_7',
    name: 'Appealing to Authority',
    plainEnglish: 'The author supports their point by citing the opinion of an expert.',
    answerChoiceLanguage: 'cites the testimony of an expert to support its conclusion',
    mustHappen: 'An expert or authority figure must be mentioned as the reason to believe the claim.',
    example: {
      stimulus: 'Dr. Smith, a leading biologist, says this species is extinct. So, it must be gone.',
      explanation: 'The argument relies on Dr. Smith\'s authority.'
    }
  },
  {
    id: 'mp_8',
    name: 'Pointing out Undesirable Consequences',
    plainEnglish: 'The author argues against a policy because it would lead to bad results.',
    answerChoiceLanguage: 'rejects a proposal on the grounds that it would have undesirable consequences',
    mustHappen: 'A proposal or policy must be discussed, and the author must highlight a negative outcome.',
    example: {
      stimulus: 'If we lower the speed limit to 5 mph, nobody will ever get anywhere on time. Thus, we should not do it.',
      explanation: 'The undesirable consequence (nobody on time) is used to reject the proposal.'
    }
  },
  {
    id: 'mp_9',
    name: 'Attacking an Opponent’s Premise',
    plainEnglish: 'The author shows that one of the facts the other side relies on is actually false.',
    answerChoiceLanguage: 'calls into question a premise on which the opposing argument depends',
    mustHappen: 'An opponent must make an argument, and the author must challenge a specific piece of their evidence.',
    example: {
      stimulus: 'My opponent says we have no money. But here is the bank statement showing a million dollars.',
      explanation: 'The author directly attacks the "no money" premise.'
    }
  },
  {
    id: 'mp_10',
    name: 'Showing Conclusion leads to Impossible Result',
    plainEnglish: 'The author shows that if someone’s claim were true, something ridiculous would also have to be true.',
    answerChoiceLanguage: 'shows that a certain line of reasoning leads to an implausible conclusion',
    mustHappen: 'The author must extend a piece of logic to a point where it becomes obviously wrong or unlikely.',
    example: {
      stimulus: 'If everyone who liked music became a professional musician, there would be no one left to do any other jobs. So that idea is absurd.',
      explanation: 'The author shows the "everyone musician" idea leads to an impossible job shortage.'
    }
  }
];

export const QUESTION_STEMS: QuestionStem[] = [
  {
    id: 'qs_1',
    category: 'Role',
    stem: 'Which of the following most accurately describes the role played by the claim that...?',
    explanation: 'The classic Role question. It asks for the structural function of a specific sentence or clause.'
  },
  {
    id: 'qs_2',
    category: 'Role',
    stem: 'The statement that... figures in the argument in which one of the following ways?',
    explanation: 'A variation of Role. "Figures in" means "plays a part in" or "functions as".'
  },
  {
    id: 'qs_3',
    category: 'Role',
    stem: 'Which of the following is the most accurate characterization of the claim that...?',
    explanation: 'Asks you to characterize the claim\'s function—is it a premise, conclusion, background, etc.?'
  },
  {
    id: 'qs_4',
    category: 'Method',
    stem: 'Which of the following most accurately describes the method of reasoning used in the argument?',
    explanation: 'Standard Method question. It asks you to describe the author\'s overall strategy.'
  },
  {
    id: 'qs_5',
    category: 'Method',
    stem: 'The argument proceeds by...',
    explanation: 'The most concise Method stem. It is asking for the reasoning move the author makes.'
  },
  {
    id: 'qs_6',
    category: 'Method',
    stem: 'The argument employs which one of the following techniques of reasoning?',
    explanation: 'Another way to ask for the Method. "Technique of reasoning" = "Method".'
  },
  {
    id: 'qs_7',
    category: 'Flaw',
    stem: 'The reasoning in the argument is flawed because it...',
    explanation: 'Standard Flaw stem. It asks you to describe the reasoning error.'
  },
  {
    id: 'qs_8',
    category: 'Flaw',
    stem: 'The argument is most vulnerable to criticism on the grounds that it...',
    explanation: 'High-frequency Flaw stem. "Vulnerable to criticism" is LSAT-speak for "flawed".'
  },
  {
    id: 'qs_9',
    category: 'Flaw',
    stem: 'Which of the following most accurately describes a flaw in the argument\'s reasoning?',
    explanation: 'Explicitly asks for the flaw. You must identify why the support does not guarantee the conclusion.'
  },
  {
    id: 'qs_10',
    category: 'Other',
    stem: 'The argument\'s conclusion follows logically if which one of the following is assumed?',
    explanation: 'Sufficient Assumption stem. You are looking for a bridge that makes the argument valid.'
  },
  {
    id: 'qs_11',
    category: 'Other',
    stem: 'The argument requires assuming which one of the following?',
    explanation: 'Necessary Assumption stem. You are looking for a "must have" bridge for the argument to survive.'
  }
];
