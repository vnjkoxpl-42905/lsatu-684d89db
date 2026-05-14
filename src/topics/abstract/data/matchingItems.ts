import { MatchingItem } from "../types";

// 10 matching items for the keyword-to-stimulus matching practice.
//
// Items 1-2: ported verbatim from the new bootcamp's MATCHING_ITEMS in
// mockData.ts.
// Items 3-10: drawn from PT-stimulus + answer-choice pairings in
// `_source/05-answer-key-15-walkthroughs.md`. Each item walks one piece of
// the answer-choice phrase and checks whether it can be matched to a part of
// the stimulus.
export const MATCHING_ITEMS: MatchingItem[] = [
  {
    id: "match_1",
    stimulus:
      "John: Celebrities have the biggest smiles in front of the camera, so they must be the happiest people alive.\nDavid: That is not true. Many celebrities suffer from depression and substance abuse. Smiling in front of the camera doesn't mean a thing, they could simply be putting on a show for the audience.",
    answerChoice:
      "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false.",
    parts: [
      {
        text: "makes an observation",
        matches: true,
        explanation: "John observed that celebrities have the biggest smiles.",
        highlightText: "celebrities have the biggest smiles in front of the camera",
      },
      {
        text: "is insufficient to justify the claim",
        matches: true,
        explanation: "David argues that smiling does not mean a thing, so the observation does not justify the happiness claim.",
        highlightText: "doesn't mean a thing",
      },
      {
        text: "the claim that the argument concludes is false",
        matches: true,
        explanation: "David concludes that John's claim (\"they must be the happiest people alive\") is not true.",
        highlightText: "they must be the happiest people alive",
      },
    ],
  },
  {
    id: "match_2",
    stimulus: "Smoking is a leading cause of lung cancer, John has lung cancer, therefore he must surely have been a heavy smoker.",
    answerChoice: "It describes a phenomenon for which the argument's conclusion is offered as an explanation.",
    parts: [
      {
        text: "describes a phenomenon",
        matches: true,
        explanation: "John having lung cancer is the observed effect or phenomenon.",
        highlightText: "John has lung cancer",
      },
      {
        text: "conclusion is offered as an explanation",
        matches: true,
        explanation: "The conclusion \"he must surely have been a heavy smoker\" is the proposed cause (explanation) for his lung cancer.",
        highlightText: "he must surely have been a heavy smoker",
      },
    ],
  },
  {
    id: "match_3",
    stimulus:
      "Despite a high-paying job, John was extremely stressed out and depressed, so there are intangible things in life that we must pursue to find true happiness.",
    answerChoice: "It is used to illustrate the general principle that the argument presupposes.",
    parts: [
      {
        text: "to illustrate",
        matches: true,
        explanation: "John's situation is the example. Illustrate = example.",
        highlightText: "Despite a high-paying job, John was extremely stressed out and depressed",
      },
      {
        text: "the general principle",
        matches: true,
        explanation: "Behind the example is the broad rule that money alone is not enough to make people happy.",
      },
      {
        text: "the argument presupposes",
        matches: true,
        explanation: "The principle is required (presuppose = require) for the conclusion to stand.",
        highlightText: "there are intangible things in life that we must pursue to find true happiness",
      },
    ],
  },
  {
    id: "match_4",
    stimulus:
      "John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer. Smoking is a direct cause of lung cancer. We must avoid cigarettes at all costs if we want to stay healthy.",
    answerChoice: "It is an illustration of a premise that is used to support the argument's conclusion.",
    parts: [
      {
        text: "illustration of a premise",
        matches: true,
        explanation: "John's case is an example of the premise that smoking causes lung cancer.",
        highlightText: "John has been smoking two packs a day since he was sixteen, last week he was diagnosed with lung cancer",
      },
      {
        text: "supports the argument's conclusion",
        matches: true,
        explanation: "The premise supports the conclusion that we must avoid cigarettes.",
        highlightText: "We must avoid cigarettes at all costs",
      },
    ],
  },
  {
    id: "match_5",
    stimulus:
      "College graduates make more money than they would if they didn't go to college, even if they are paying off student loans plus interest. So going to college is a great way to make more money and enjoy a better life.",
    answerChoice: "It is used to counter a consideration that might be taken to undermine the argument's conclusion.",
    parts: [
      {
        text: "to counter a consideration",
        matches: true,
        explanation: "The phrase \"even if they are paying off student loans plus interest\" pre-empts a potential objection.",
        highlightText: "even if they are paying off student loans plus interest",
      },
      {
        text: "might be taken to undermine the argument's conclusion",
        matches: true,
        explanation: "Student loan debt is a real consideration that could weaken the conclusion that college pays off.",
      },
    ],
  },
  {
    id: "match_6",
    stimulus:
      "It has been said that the best way to approach any situation is to be yourself. But this cannot be true. What if you are a selfish, egotistical or horrible person? Surely we must strive to better ourselves and be the best we can be?",
    answerChoice: "It is a general principle whose validity the argument questions.",
    parts: [
      {
        text: "a general principle",
        matches: true,
        explanation: "\"Be yourself\" is a broad rule that applies to anyone in any situation.",
        highlightText: "the best way to approach any situation is to be yourself",
      },
      {
        text: "whose validity the argument questions",
        matches: true,
        explanation: "The author challenges whether the principle is true with a hypothetical (\"What if you are a selfish, egotistical or horrible person?\").",
        highlightText: "But this cannot be true",
      },
    ],
  },
  {
    id: "match_7",
    stimulus:
      "John: I've studied so hard for the finals, I'm definitely going to ace the exam!\nDavid: Studying hard doesn't guarantee you will do well. The exams are graded on a curve, and everyone else has studied just as hard.",
    answerChoice: "It denies a claim that the argument takes to be assumed in the reasoning it rejects.",
    parts: [
      {
        text: "denies a claim",
        matches: true,
        explanation: "David denies the unstated assumption that hard study alone is enough.",
        highlightText: "Studying hard doesn't guarantee you will do well",
      },
      {
        text: "the argument takes to be assumed",
        matches: true,
        explanation: "John's reasoning assumes (but never states) that hard work is sufficient to ace the exam.",
      },
      {
        text: "in the reasoning it rejects",
        matches: true,
        explanation: "David rejects John's reasoning by attacking its assumption rather than its premise.",
      },
    ],
  },
  {
    id: "match_8",
    stimulus:
      "I found an Olympic gold medal in the swim team locker room. It must have originally belonged to John. John is always losing things and he participated in the Olympics.",
    answerChoice: "It is a claim for which no justification is provided but that is required to establish the argument's main conclusion.",
    parts: [
      {
        text: "no justification is provided",
        matches: true,
        explanation: "The fact that John participated in the Olympics is stated bare; no further support is offered for it.",
        highlightText: "he participated in the Olympics",
      },
      {
        text: "required to establish the argument's main conclusion",
        matches: true,
        explanation: "John must have been a participant for the medal to plausibly be his.",
      },
    ],
  },
  {
    id: "match_9",
    stimulus:
      "All practicing lawyers must have passed the bar. John is a partner at a prestigious law firm and therefore he is a practicing lawyer, so he must have passed the bar.",
    answerChoice: "It is a claim for which justification is provided and that, if true, establishes the truth of the argument's main conclusion.",
    parts: [
      {
        text: "for which justification is provided",
        matches: true,
        explanation: "John being a practicing lawyer is supported by the fact that he is a partner at a prestigious law firm.",
        highlightText: "John is a partner at a prestigious law firm and therefore he is a practicing lawyer",
      },
      {
        text: "if true, establishes the truth of the argument's main conclusion",
        matches: true,
        explanation: "Given that all practicing lawyers passed the bar, John being a practicing lawyer guarantees that John passed the bar.",
      },
    ],
  },
  {
    id: "match_10",
    stimulus:
      "Darwin hypothesized that species change over time, adapting to their environments via physical modifications generation after generation. Critics argue we have not yet gathered enough fossil evidence across enough time periods to support the claim.",
    answerChoice: "It is a hypothesis that the argument attempts to undermine by calling into question the sufficiency of the evidence.",
    parts: [
      {
        text: "hypothesis",
        matches: true,
        explanation: "Hypothesis = a potential causal explanation. Darwin's theory is a posited causal mechanism for adaptation.",
        highlightText: "species change over time, adapting to their environments",
      },
      {
        text: "attempts to undermine",
        matches: true,
        explanation: "Critics are weakening the hypothesis.",
        highlightText: "Critics argue",
      },
      {
        text: "calling into question the sufficiency of the evidence",
        matches: true,
        explanation: "The attack is specifically about insufficient fossil evidence, not a direct contradiction.",
        highlightText: "we have not yet gathered enough fossil evidence",
      },
    ],
  },
];
