// 14 vocab quiz items for Module 2. Every term tested here is taught in the
// Module 2 note (LessonReader "words_to_know").
//
// Items 1-7 are the 7 entries from data/terms.ts (forward direction: see the
// term, pick the LSAT meaning). Items 8-11 add the terms from Joshua's
// Advanced Parsing answer key (explanation, defend, supported premise) and
// hypothesis. Items 12-14 run in reverse: see the meaning, pick the term.

import { TERMS } from "./terms";

export interface TermQuizItem {
  id: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

const FORWARD: TermQuizItem[] = TERMS.map((t) => ({
  id: `tq_${t.id}`,
  prompt: `On the LSAT, what does "${t.term}" mean?`,
  options: t.options,
  correctOption: t.correctOption,
  explanation: t.explanation,
}));

const MORE_FORWARD: TermQuizItem[] = [
  {
    id: "tq_explanation",
    prompt: 'On the LSAT, what does "explanation" mean?',
    options: [
      "Extra detail that clarifies a claim",
      "A cause: what produced the effect",
      "A summary of the argument",
      "A definition of a key term",
    ],
    correctOption: 1,
    explanation: "To explain something on the LSAT is to give its cause. It does not mean adding detail.",
  },
  {
    id: "tq_hypothesis",
    prompt: 'On the LSAT, what does "hypothesis" mean?',
    options: [
      "Any claim the author makes",
      "A prediction about the future",
      "A possible explanation: a proposed cause",
      "A fact accepted by both sides",
    ],
    correctOption: 2,
    explanation: "A hypothesis is a proposed cause, a guess about why something happened. Don't flatten it into \"claim.\"",
  },
  {
    id: "tq_supported_premise",
    prompt: 'What is another name for a "supported premise"?',
    options: ["Main conclusion", "Intermediate conclusion", "Counterargument", "Background information"],
    correctOption: 1,
    explanation: "It gets support from one statement and gives support to another, so it is an intermediate conclusion.",
  },
  {
    id: "tq_defend",
    prompt: 'On the LSAT, what does it mean to "defend" a position?',
    options: [
      "To explain why someone holds it",
      "To argue that it is right",
      "To describe it neutrally",
      "To admit it has weaknesses",
    ],
    correctOption: 1,
    explanation: "Defending means arguing the position is right. Stating someone's motive for holding it is not a defense.",
  },
];

// Reverse-direction items: pick the term that matches the LSAT-specific
// meaning. Distractors are sibling terms from TERMS.
const REVERSE: TermQuizItem[] = [
  {
    id: "tq_reverse_1",
    prompt: "Which LSAT term means \"require or assume as a necessary condition\"?",
    options: ["Illustrate", "Presuppose", "Undermine", "Phenomenon"],
    correctOption: 1,
    explanation: "Presuppose on the LSAT simply means require. It refers to a necessary condition.",
  },
  {
    id: "tq_reverse_2",
    prompt: "Which LSAT term means \"to provide an example of something\"?",
    options: ["Hypothesis", "General Principle", "Illustrate", "Explanation"],
    correctOption: 2,
    explanation: "Whenever you see illustration or illustrates in an answer choice, treat it as example.",
  },
  {
    id: "tq_reverse_3",
    prompt: "Which LSAT term means \"to weaken or call into question\"?",
    options: ["Presuppose", "Illustrate", "Explanation", "Undermine"],
    correctOption: 3,
    explanation: "Undermine on the LSAT means to weaken the support an argument has for its conclusion.",
  },
];

export const TERM_QUIZ_ITEMS: TermQuizItem[] = [...FORWARD, ...MORE_FORWARD, ...REVERSE];
