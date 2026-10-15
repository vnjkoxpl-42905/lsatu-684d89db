import { MethodPattern } from "../types";

// 17 Methods of Reasoning. Verbatim from
// `~/Documents/Obsidian Vault/raw/curriculum/Abstract/_source/01-methods-of-reasoning-17-types.md`
// which mirrors `Methods_of_Reasoning_Question_Stem_answer_key.pdf`.
//
// `name` and `plainEnglish` are copied verbatim from the source. `example.stimulus`
// and `example.explanation` are copied verbatim where the source provides one;
// where the source provides only narrative (no example), the narrative is
// preserved in `example.explanation` and `example.stimulus` carries the
// definition sentence.
//
// `answerChoiceLanguage` and `mustHappen` are the structural distillations
// the spec calls for; sourced from the method's title and definition.
export const METHOD_PATTERNS: MethodPattern[] = [
  {
    id: "mp_1",
    name: "Providing an alternative explanation (cause)",
    plainEnglish: "The author provides a different cause/reason for an observed effect, challenging the original cause given.",
    answerChoiceLanguage: "offers an alternative explanation for the observed effect",
    mustHappen: "An original cause must be given; the author must offer a different cause for the same effect.",
    example: {
      stimulus: "A: I finally broke the 170 barrier on the LSAT. This was all because I had an awesome tutor.\nB: Tutors can only point out the right way to study. Your success on the LSAT is rather due to your incessant hard work.",
      explanation: "In this example, A provides a cause/reason for getting over 170 on the LSAT. B, on the other hand, disputes that cause and provides an alternative cause/explanation.",
    },
  },
  {
    id: "mp_2",
    name: "Establishing the validity of one explanation (cause) by excluding alternative explanations (causes)",
    plainEnglish: "The author narrows down to one specific cause by eliminating other possible explanations (causes).",
    answerChoiceLanguage: "establishes a cause by ruling out alternative causes",
    mustHappen: "Multiple possible causes must be listed; all but one must be eliminated.",
    example: {
      stimulus: "Gas prices have been increasing recently. Price increases can be caused by increased demand, limited supplies, or unforeseen geopolitical events. Demand and supply have remained constant, so the cause must be due to the war currently going on.",
      explanation: "In this example, the author eliminates other possible explanations (causes) (increased demand, limited supplies, unforeseen geopolitical events) to establish the war as the cause of the price increase.",
    },
  },
  {
    id: "mp_3",
    name: "Reinterpreting an opponent's evidence so that they are also compatible with an alternative explanation (cause)",
    plainEnglish: "The author argues that the evidence given by the opponent can also support a different explanation (cause).",
    answerChoiceLanguage: "shows that the opponent's evidence is consistent with a different explanation",
    mustHappen: "The opponent must offer evidence for one cause; the author must show the same evidence fits a different cause.",
    example: {
      stimulus: "John: I saw Peter the other day, that guy lost over 40 lbs! He must have exercised like crazy this past summer.\nDavid: It's also possible that he just watched his diet really carefully.",
      explanation: "In this example, David isn't arguing that Peter didn't exercise. David is simply saying that it is also possible that Peter lost all this weight due to his diet (cause).",
    },
  },
  {
    id: "mp_4",
    name: "Infer a causal relationship (cause) from a correlation",
    plainEnglish: "The author argues that a correlation between two variables implies a causal relationship (cause).",
    answerChoiceLanguage: "infers a causal relationship from a correlation between two variables",
    mustHappen: "A correlation is stated; the conclusion asserts that one variable causes the other.",
    example: {
      stimulus: "A positive correlation is a statistical relationship where as one value increases, the other increases as well. As one value decreases, the other value also decreases. For example, as the temperature increases, the amount of sunscreen sold also increases. So we say that there is a correlation between the temperature and sunscreen sales.",
      explanation: "Having a correlation between A and B doesn't automatically mean that there is causation (cause) involved between A and B. For instance, there is a positive correlation between how green vegetation is and the number of people going swimming. Are people going swimming because trees are turning green or vice versa? No. There is a common cause for both phenomena, namely that the temperature is rising.",
    },
  },
  {
    id: "mp_5",
    name: "Appeal to definition",
    plainEnglish: "The author uses a dictionary or textbook definition of a term to support their argument.",
    answerChoiceLanguage: "appeals to the definition of a key term",
    mustHappen: "A definition is invoked; the conclusion turns on whether the case fits or fails to fit the definition.",
    example: {
      stimulus: "The author will give a dictionary/textbook definition of a certain term, and go on to argue that the action or event we are discussing fits or doesn't fit this definition.",
      explanation: "The author will give a dictionary/textbook definition of a certain term, and go on to argue that the action or event we are discussing fits or doesn't fit this definition.",
    },
  },
  {
    id: "mp_6",
    name: "Appeal to authority",
    plainEnglish: "The author supports their argument by citing an expert in the field.",
    answerChoiceLanguage: "appeals to the testimony of an expert or authority",
    mustHappen: "An expert or authority figure is cited as support for the conclusion.",
    example: {
      stimulus: "The author will invoke/appeal to an expert in the field to justify the point they are making.",
      explanation: "The author will invoke/appeal to an expert in the field to justify the point they are making.",
    },
  },
  {
    id: "mp_7",
    name: "Opponent's policy could have undesirable consequences (causes)",
    plainEnglish: "The author argues that following the opponent's recommendation would lead to negative outcomes (causes).",
    answerChoiceLanguage: "rejects a proposal by pointing to undesirable consequences it would cause",
    mustHappen: "The opponent recommends a policy or action; the author identifies a bad outcome that following it would produce.",
    example: {
      stimulus: "John: Gasoline cars cause a lot of environmental damage, we should ban them outright.\nDavid: But if you ban gasoline cars, how will millions of people survive? Most people need a car to go to work, and if you take away their cars, what will they do?",
      explanation: "In this type of reasoning, our author isn't attacking the opponent's reasoning per se, but rather they are suggesting that if we go through with what the opponent is recommending, it can lead to disastrous consequences (causes).",
    },
  },
  {
    id: "mp_8",
    name: "Pointing out that the opponent failed to take relevant information into account",
    plainEnglish: "The author shows that the opponent's argument overlooks important information.",
    answerChoiceLanguage: "points out information the opponent failed to take into account",
    mustHappen: "The author introduces information that the opponent's argument did not consider, and that information weakens the opponent.",
    example: {
      stimulus: "John: We should expose the government's corruption. Let's send the evidence to all the major media outlets in the country.\nDavid: You forget that the government owns all the media outlets in our country. Doing so would only endanger yourself.",
      explanation: "This pattern of reasoning is very similar to the previous one. The author is offering up additional information/new evidence which will attack/weaken the opponent's argument. It could be that what the opponent is arguing for has undesirable consequences (causes), is impossible to enforce, or difficult to enforce.",
    },
  },
  {
    id: "mp_9",
    name: "Deriving a general principle from specific examples (causes)",
    plainEnglish: "The author formulates a general principle based on specific cases (causes).",
    answerChoiceLanguage: "derives a general principle from specific examples",
    mustHappen: "Specific examples are given; the conclusion is a general principle or generalization drawn from those examples.",
    example: {
      stimulus: "Elon Musk failed many times before he succeeded, so did Steve Jobs, Thomas Edison, and all the great inventors and entrepreneurs that I know about. So in order to be successful, we must learn from our mistakes and never give up (causes).",
      explanation: "A principle is essentially concerned with what you should do, or what should be done. Principles also have applicability to cases not specifically discussed in the stimulus. \"People who break the law should be punished\" is a principle. \"Taylor broke the law, so he should be punished\" is NOT a principle. The statement is only talking about one person. A generalization is very similar but doesn't have to be about what you should do; if all the swans I saw were white and I say \"All swans are white\", I am making a generalization.",
    },
  },
  {
    id: "mp_10",
    name: "Supporting a conclusion about a specific case by invoking a relevant generalization (cause)",
    plainEnglish: "The author uses a generalization (cause) to justify a conclusion about a specific case.",
    answerChoiceLanguage: "applies a general principle to draw a conclusion about a specific case",
    mustHappen: "A generalization is stated; it is used to support a conclusion about a particular instance covered by it.",
    example: {
      stimulus: "Every successful person has overcome many failures in order to be where they are today. So behind Elon Musk's great success story, there must have been countless painful failures (causes).",
      explanation: "The argument applies the generalization about successful people to the specific case of Elon Musk.",
    },
  },
  {
    id: "mp_11",
    name: "Using a counterexample to attack a general claim",
    plainEnglish: "The author provides an example that contradicts the opponent's generalization.",
    answerChoiceLanguage: "uses a counterexample to undermine a generalization",
    mustHappen: "The opponent states a generalization; the author provides one specific case that fails to fit it.",
    example: {
      stimulus: "The opponent's argument will contain a generalization (this can either be a premise or conclusion). Our author, in response, provides an example which doesn't fit into the opponent's generalization.",
      explanation: "The opponent's argument will contain a generalization (this can either be a premise or conclusion). Our author, in response, provides an example which doesn't fit into the opponent's generalization.",
    },
  },
  {
    id: "mp_12",
    name: "Attacking an opponent's premise (cause)",
    plainEnglish: "The author challenges the foundation (cause) of the opponent's argument.",
    answerChoiceLanguage: "calls into question a premise on which the opposing argument relies",
    mustHappen: "The opponent's argument has a premise; the author directly disputes that premise.",
    example: {
      stimulus: "This demonstrates again why when faced with a rebuttal type stimulus, we need to read the opponent's argument carefully, focusing on its structure. Is our author attacking the opponent's premise? If so, then this is the correct answer/method of reasoning.",
      explanation: "This demonstrates again why when faced with a rebuttal type stimulus, we need to read the opponent's argument carefully, focusing on its structure. Is our author attacking the opponent's premise? If so, then this is the correct answer/method of reasoning.",
    },
  },
  {
    id: "mp_13",
    name: "Conclude that members of two groups are likely to share a certain characteristic because of other characteristics they share",
    plainEnglish: "The author argues that similarities in some aspects imply similarities in others.",
    answerChoiceLanguage: "concludes from shared characteristics that another characteristic is also shared",
    mustHappen: "Two entities are said to share one trait; the conclusion is that they share another trait.",
    example: {
      stimulus: "David and John are both from Chicago. David loves deep dish pizza, so John must do so as well.",
      explanation: "The author is basically saying that A and B have one similarity, so they are similar in another aspect.",
    },
  },
  {
    id: "mp_14",
    name: "Pointing out that the opponent makes an inappropriate comparison/analogy",
    plainEnglish: "The author criticizes the opponent's comparison for being flawed.",
    answerChoiceLanguage: "attacks the opponent's comparison as inappropriate",
    mustHappen: "The opponent makes a comparison or analogy; the author argues the entities are not similar in the relevant respect.",
    example: {
      stimulus: "We can argue that just because two people are from the same city, it doesn't mean they will like the same food.",
      explanation: "Comparable reasoning is again at play here, except this time our author is attacking the comparison made by the opponent. The author is arguing that just because two entities are similar in one aspect, it doesn't mean they are similar in another aspect.",
    },
  },
  {
    id: "mp_15",
    name: "Using an analogy to advance one's argument",
    plainEnglish: "The author uses an analogy to clarify or support their point.",
    answerChoiceLanguage: "uses an analogy to support or clarify a point",
    mustHappen: "An analogy or comparison is drawn between two situations to illuminate or support the conclusion.",
    example: {
      stimulus: "Physicists have used the analogy of a gun shooting bullets to better describe the process of radiation, where energy is \"shot\" out in the form of particles. The two processes are similar enough so that we can visualize one to better understand the other.",
      explanation: "An analogy is, according to the dictionary definition, \"a comparison between two things, typically for the purpose of clarification.\" In other words, it is an advanced form of a comparison.",
    },
  },
  {
    id: "mp_16",
    name: "Pointing out an erroneous assumption in the opponent's argument (cause)",
    plainEnglish: "The author identifies a flawed assumption in the opponent's reasoning (cause).",
    answerChoiceLanguage: "exposes a flawed assumption in the opposing argument",
    mustHappen: "The opponent's argument has an unstated premise (assumption); the author challenges that assumption directly.",
    example: {
      stimulus: "Peter: All JDs must have taken the LSAT, so John must have taken the LSAT.\nDavid: But John isn't a JD, he's an LLM.",
      explanation: "An assumption is essentially an implicit/unstated premise (cause). It is something that would fill in the reasoning gap between the premise and conclusion, but which, for some reason, has been left out by the author. Here, David is directly contradicting Peter's assumption that John has a JD. When looking at harder Method questions, make sure to ask yourself if any of the arguments contain assumptions (causes).",
    },
  },
  {
    id: "mp_17",
    name: "Showing that the opponent's conclusion, if true, leads to an impossible/unlikely result (cause)",
    plainEnglish: "The author demonstrates that the opponent's conclusion leads to an absurd outcome (cause).",
    answerChoiceLanguage: "shows that the opponent's conclusion leads to an implausible result",
    mustHappen: "Treat the opponent's conclusion as true; derive a consequence that is obviously false or absurd.",
    example: {
      stimulus: "John: The taller you are, the better you are as a basketball player.\nDavid: If that were true, the world's tallest person would be the best basketball player in the world.",
      explanation: "This type of reasoning looks very similar to the conditional reasoning contrapositive. In a conditional relationship, A → B, its contrapositive is B → A. The opponent will come to the conclusion A. Our author will state that if conclusion A is true, it will lead to/likely lead to B. However, since B is not true, A cannot be true either. Here, David's assumption (cause) is that the tallest person in the world is NOT also the best basketball player. Hence, John is mistaken in his belief about the correlation between height and basketball skills.",
    },
  },
];
