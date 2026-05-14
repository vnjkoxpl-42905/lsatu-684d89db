import { FinalSetQuestion } from "../types";

// Final Timed Set: 5 PT questions per spec.
//
// PT58 S1 Q26 | PT56 S2 Q9 | PT69 S1 Q23 | PT70 S4 Q26 | PT86 S1 Q24
//
// Per spec Section "Content port table": "Source these from existing LSATU
// question bank if accessible; otherwise stub with placeholder text and a
// TODO comment for content fill." Joshua confirmed templated v1; live
// LLM-backed coaching and full PT-stem ingestion are deferred to v2.1.
//
// These items render in TimedFinalSet.tsx. Filling them with real PT content
// is tracked as a follow-up; the question_bank tables hold the canonical
// versions.
export const FINAL_SET: FinalSetQuestion[] = [
  {
    id: "final_pt58_s1_q26",
    ptRef: "PT58 S1 Q26",
    stimulus:
      "TODO: paste verbatim PT58 S1 Q26 stimulus from LSATU question_bank table. This is a Method of Reasoning question covering the alternative-explanation pattern (method 1 in `_source/01`).",
    questionStem: "TODO: paste verbatim question stem from PT58 S1 Q26.",
    choices: [
      { letter: "A", text: "TODO: choice A text" },
      { letter: "B", text: "TODO: choice B text" },
      { letter: "C", text: "TODO: choice C text" },
      { letter: "D", text: "TODO: choice D text" },
      { letter: "E", text: "TODO: choice E text" },
    ],
    correctLetter: "A",
    explanation:
      "TODO: populate with the walkthrough from `_source/05` or the question_bank explanation row. Pending content backfill.",
  },
  {
    id: "final_pt56_s2_q9",
    ptRef: "PT56 S2 Q9",
    stimulus: "TODO: paste verbatim PT56 S2 Q9 stimulus.",
    questionStem: "TODO: paste verbatim question stem from PT56 S2 Q9.",
    choices: [
      { letter: "A", text: "TODO" },
      { letter: "B", text: "TODO" },
      { letter: "C", text: "TODO" },
      { letter: "D", text: "TODO" },
      { letter: "E", text: "TODO" },
    ],
    correctLetter: "A",
    explanation: "TODO: walkthrough pending.",
  },
  {
    id: "final_pt69_s1_q23",
    ptRef: "PT69 S1 Q23",
    stimulus: "TODO: paste verbatim PT69 S1 Q23 stimulus.",
    questionStem: "TODO: paste verbatim question stem from PT69 S1 Q23.",
    choices: [
      { letter: "A", text: "TODO" },
      { letter: "B", text: "TODO" },
      { letter: "C", text: "TODO" },
      { letter: "D", text: "TODO" },
      { letter: "E", text: "TODO" },
    ],
    correctLetter: "A",
    explanation: "TODO: walkthrough pending.",
  },
  {
    id: "final_pt70_s4_q26",
    ptRef: "PT70 S4 Q26",
    stimulus: "TODO: paste verbatim PT70 S4 Q26 stimulus.",
    questionStem: "TODO: paste verbatim question stem from PT70 S4 Q26.",
    choices: [
      { letter: "A", text: "TODO" },
      { letter: "B", text: "TODO" },
      { letter: "C", text: "TODO" },
      { letter: "D", text: "TODO" },
      { letter: "E", text: "TODO" },
    ],
    correctLetter: "A",
    explanation: "TODO: walkthrough pending.",
  },
  {
    id: "final_pt86_s1_q24",
    ptRef: "PT86 S1 Q24",
    stimulus: "TODO: paste verbatim PT86 S1 Q24 stimulus.",
    questionStem: "TODO: paste verbatim question stem from PT86 S1 Q24.",
    choices: [
      { letter: "A", text: "TODO" },
      { letter: "B", text: "TODO" },
      { letter: "C", text: "TODO" },
      { letter: "D", text: "TODO" },
      { letter: "E", text: "TODO" },
    ],
    correctLetter: "A",
    explanation: "TODO: walkthrough pending.",
  },
];
