// 10 vocab quiz items for Module 2.
//
// Items 1-7 are the 7 entries from data/terms.ts (forward direction: see the
// term, pick the LSAT meaning). Items 8-10 reverse direction: see the LSAT
// meaning, pick the term. All content reframed from existing TERMS; no new
// LSAT content authored.

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

export const TERM_QUIZ_ITEMS: TermQuizItem[] = [...FORWARD, ...REVERSE];
