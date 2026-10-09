import { QuestionStem } from "../types";

// 14 question stems verbatim from
// `~/Documents/Obsidian Vault/raw/curriculum/Abstract/_source/04-homework-14-question-stems.md`.
// Explanations are the walkthroughs from `_source/05-answer-key-15-walkthroughs.md`.
// The source answer key contains 15 walkthroughs; stem 14 maps to walkthrough 14.
// Walkthroughs 13 and 15 in source 05 are reference patterns; preserved at the
// end as `qs_13_ref` and `qs_15_ref` for the MethodsLibrary supplemental view.
//
// Category assignment is based on the structural function the stem asks about:
// "principle" / "presupposes" / "concludes" / "main conclusion" -> Role; stems
// about explanation, attempting to undermine, etc. -> Method; otherwise Other.
export const QUESTION_STEMS: QuestionStem[] = [
  {
    id: "qs_1",
    category: "Role",
    stem: "It is used to illustrate the general principle that the argument presupposes:",
    explanation: "Whenever we are faced with an answer choice that looks super abstract, the first thing to do is to always extract what keywords we can to try to make sense of the whole thing. Three words stand out: \"illustrate\", \"general principle\", and \"presuppose\". Presuppose simply means \"require\" on the LSAT. Illustrate means \"example\". General Principle is a rule on what we should or shouldn't do that applies to multiple conditions. So three requirements: the statement must be an example; behind it is a principle on what we should or shouldn't do; and that principle is required for the author to advance their argument. Example: \"Despite a high-paying job, John was extremely stressed out and depressed, so there are intangible things in life that we must pursue to find true happiness.\" John's situation illustrates the principle that having a lot of money isn't enough to make you happy. That principle is required for the conclusion to stand.",
  },
  {
    id: "qs_2",
    category: "Role",
    stem: "It is an illustration of a premise that is used to support the argument's conclusion:",
    explanation: "\"Illustration\" means example. So the answer choice is referring to an example in the stimulus, and that example illustrates a premise. We must isolate the premise/premises in the argument and ask: is the quoted statement an example of what the premise is trying to say? Example: \"John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer. Smoking is a direct cause of lung cancer. We must avoid cigarettes at all costs if we want to stay healthy.\" Premise: smoking causes lung cancer. Conclusion: don't smoke. John's case is an illustration of the causal relationship between smoking and lung cancer.",
  },
  {
    id: "qs_3",
    category: "Method",
    stem: "It is used to counter a consideration that might be taken to undermine the argument's conclusion:",
    explanation: "\"A consideration that might be taken to undermine the argument's conclusion\" is a real or potential counter-argument. If I say \"going to college is a great way to enjoy a higher standard of living down the road,\" and you respond with \"but many college graduates have to take years to pay back debt,\" you are making a counter argument. If I had anticipated that and said \"college graduates enjoy higher income than their non-college counterparts even with the cost of debt factored in,\" I am countering a consideration that might undermine my conclusion. Example: \"College graduates make more money than they would if they didn't go to college, even if they are paying off student loans plus interest. So going to college is a great way to make more money.\" The underlined statement is both a premise and a pre-emptive strike.",
  },
  {
    id: "qs_4",
    category: "Method",
    stem: "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false:",
    explanation: "Key info: there is a claim that the argument concludes is false. The author is arguing AGAINST a claim. Two viewpoints in this stimulus. The opponent made an observation in support of their view, but the author says that observation is not enough and concludes the opponent's claim is false. Example: \"John: Celebrities have the biggest smiles in front of the camera, so they must be the happiest people alive. David: That is not true. Many celebrities suffer from depression and substance abuse. Smiling in front of the camera doesn't mean a thing.\" David argues John's claim is false and suggests the observation is insufficient.",
  },
  {
    id: "qs_5",
    category: "Method",
    stem: "It describes a phenomenon for which the argument's conclusion is offered as an explanation:",
    explanation: "Key term: explanation. On the LSAT, the word \"explanation\" has a very strict and precise meaning: it simply means \"cause.\" Whenever you see \"explanation\" in an answer choice, check the stimulus for cause-effect reasoning. The author describes a phenomenon and concludes what caused it. Example: \"Smoking is a leading cause of lung cancer, John has lung cancer, therefore he must surely have been a heavy smoker.\" John having lung cancer is the phenomenon, the author concludes smoking caused it.",
  },
  {
    id: "qs_6",
    category: "Role",
    stem: "It is a general principle whose validity the argument questions:",
    explanation: "The answer choice refers to a general principle that the argument is attacking. Two requirements: the quoted statement is indeed a general principle; and the author is arguing against the truth of this principle. Example: \"It has been said that the best way to approach any situation is to be yourself. But this cannot be true. What if you are a selfish, egotistical or horrible person? Surely we must strive to better ourselves and be the best we can be?\"",
  },
  {
    id: "qs_7",
    category: "Method",
    stem: "It denies a claim that the argument takes to be assumed in the reasoning it rejects:",
    explanation: "The argument is rejecting another person's reasoning. The author thinks the reasoning has made an assumption, and instead of going after the opponent's argument outright, our author is going after the opponent's assumption. Example: \"John: I've studied so hard for the finals, I'm definitely going to ace the exam! David: Studying hard doesn't guarantee you will do well. The exams are graded on a curve, and everyone else has studied just as hard.\"",
  },
  {
    id: "qs_8",
    category: "Role",
    stem: "It is a claim for which no justification is provided but that is required to establish the argument's main conclusion:",
    explanation: "Two important pieces. First, it is \"required\" to establish the main conclusion: necessary for the main conclusion to be valid. So it's either a premise or an intermediate conclusion. Second, no justification is provided. Premises support the conclusion but are not themselves supported; intermediate conclusions are both supported and supporting. So this is a premise. Example: \"I found an Olympic gold medal in the swim team locker room. It must have originally belonged to John. John is always losing things and he participated in the Olympics.\" John's participation in the Olympics is required for the conclusion and is itself an unsupported premise.",
  },
  {
    id: "qs_9",
    category: "Role",
    stem: "It is a claim for which justification is provided and that, if true, establishes the truth of the argument's main conclusion:",
    explanation: "Similar to qs_8 but with two important caveats. This answer choice HAS justification provided while supporting the main conclusion, so it's an intermediate conclusion. It also guarantees/establishes the truth of the conclusion. Example: \"All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.\" John being a practicing lawyer is supported by the fact that he is a partner. That intermediate conclusion establishes the main conclusion.",
  },
  {
    id: "qs_10",
    category: "Role",
    stem: "It is what the author's argument purports to explain:",
    explanation: "Identical structure to qs_5: the author describes an effect/result/phenomenon, and argues for a specific cause. The quoted statement is the phenomenon being explained, not the explanation.",
  },
  {
    id: "qs_11",
    category: "Method",
    stem: "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence:",
    explanation: "What is a hypothesis? On the LSAT, the word \"hypothesis\" can be understood as a \"potential explanation/potential causation\"; it usually appears in science/medicine themed LR stimuli. The argument is trying to undermine this hypothesis by saying the available evidence is not enough to support it. Three requirements: there is a hypothesis present in the stimulus (the quoted statement); the author is challenging this hypothesis; and the author does so by suggesting the available evidence is insufficient.",
  },
  {
    id: "qs_12",
    category: "Role",
    stem: "It is the conclusion of the argument as a whole but is not the only explicitly stated conclusion of the argument:",
    explanation: "Two key pieces. First, we are talking about the main conclusion. Second, it \"is not the only explicitly stated conclusion in the argument\" means we also have an intermediate conclusion. Make sure: the statement is the main conclusion; and the argument contains a separate intermediate conclusion. Example: \"All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.\"",
  },
  {
    id: "qs_13",
    category: "Role",
    stem: "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole:",
    explanation: "Supported by the argument but not the main conclusion: this is an intermediate conclusion. The argument provides reasons that lead to this statement, and the statement in turn helps support the main conclusion.",
  },
  {
    id: "qs_14",
    category: "Role",
    stem: "It is a statement for which some evidence is provided and that is the conclusion of the argument as a whole:",
    explanation: "Same as qs_12: the statement in question is supported by support, and is the main conclusion. The argument contains an intermediate conclusion that supports it. When faced with this answer choice, make sure it is indeed the main conclusion and that the argument contains an intermediate conclusion.",
  },
];

// Two additional reference walkthroughs from source 05 (entries 13 and 15)
// that don't directly map to a homework stem but explain reference patterns
// the source author preserves. Surfaced in MethodsLibrary as supplemental
// notes.
export const QUESTION_STEM_REFS: QuestionStem[] = [
  {
    id: "qs_ref_13",
    category: "Role",
    stem: "It is a statement that the argument is intended to support but is not the conclusion of the argument as a whole (Source 05 ref entry):",
    explanation: "Source 05 entry 13 repeats the explanation from entry 5 verbatim and is preserved as-is in source. The functional reading: the statement is supported by the argument (intermediate conclusion territory) but is not the main conclusion. Practical application: scan for a sub-claim the argument argues toward, then check that there is yet another claim being argued toward beyond it.",
  },
  {
    id: "qs_ref_15",
    category: "Role",
    stem: "It is the conclusion of the argument as a whole and is supported by another statement for which support is offered:",
    explanation: "The statement is the main conclusion, and is supported by another statement (an intermediate conclusion) which itself has support. Verify: this is the main conclusion; the support chain is at least two layers deep.",
  },
];
