// 5 "Why is this hard?" items for Module 1.
//
// Items are derived from the coachNote and trapRequirements fields of
// existing abstractChoices items. The student sees a stimulus snippet and an
// abstract answer choice, and picks what makes that choice hard to evaluate.
// Distractors are drawn from real LSAT trap categories (extreme language,
// scope shift, role confusion, missing match) so wrong picks are educational.
//
// No fresh LSAT stimuli authored here: every stimulus + answer choice is
// reframed from material already in data/abstractChoices.ts.

export interface WhyHardItem {
  id: string;
  stimulus: string;
  answerChoice: string;
  question: string;
  options: { text: string; correct: boolean; explanation: string }[];
}

export const WHY_HARD_ITEMS: WhyHardItem[] = [
  {
    id: "wh_1",
    stimulus:
      "Tired commuters waste hours each year stuck in traffic. The city should fund the new express train, since cities that have invested in rail consistently see commute times fall.",
    answerChoice:
      "It is used to illustrate the general principle that the argument presupposes.",
    question: "What makes this answer choice hard to evaluate?",
    options: [
      {
        text: "Three LSAT-specific words (illustrate, general principle, presuppose) all carry meanings that differ from everyday usage.",
        correct: true,
        explanation:
          "On the LSAT, illustrate means example, general principle means a rule that applies across cases, and presuppose means require. All three meanings must hold for the answer to fit.",
      },
      {
        text: "The answer is hard because it uses too many short words.",
        correct: false,
        explanation: "Word count is not the obstacle. Specific LSAT vocabulary is.",
      },
      {
        text: "The answer is hard because the stimulus has no conclusion.",
        correct: false,
        explanation: "The stimulus has a clear conclusion: the city should fund the express train.",
      },
      {
        text: "The answer is hard because the stimulus contains numbers.",
        correct: false,
        explanation: "The difficulty is vocabulary, not quantitative content.",
      },
    ],
  },
  {
    id: "wh_2",
    stimulus:
      "Critics worry the festival will hurt local business. But each of the past five years that the festival ran, downtown shop revenue rose by double digits.",
    answerChoice:
      "It is used to counter a consideration that might be taken to undermine the argument's conclusion.",
    question: "What makes this answer choice hard to evaluate?",
    options: [
      {
        text: "The choice describes a structural move (preempting an objection) rather than a content claim, so the student must read the stimulus for an objection and a counter to that objection.",
        correct: true,
        explanation:
          "This is a structural role description. The stimulus must actually contain an objection (the critics' worry) and a counter to it (the revenue data).",
      },
      {
        text: "The choice is hard because it uses the word \"the\" too often.",
        correct: false,
        explanation: "Common words are not the difficulty. Structural vocabulary is.",
      },
      {
        text: "The choice is hard because it includes a number.",
        correct: false,
        explanation: "No numbers appear in the answer choice itself.",
      },
      {
        text: "The choice is hard because the stimulus contains a name.",
        correct: false,
        explanation: "Names in the stimulus do not affect the structural reading.",
      },
    ],
  },
  {
    id: "wh_3",
    stimulus:
      "Opponent: Solar panels do not pay back their cost in cloudy regions. Author: That ignores the federal tax credit, which alone covers 40 percent of installation cost.",
    answerChoice:
      "It makes an observation that, according to the argument, is insufficient to justify the claim that the argument concludes is false.",
    question: "What makes this answer choice hard to evaluate?",
    options: [
      {
        text: "The choice nests four moves (observation, insufficiency, opposing claim, the author's rejection). The student must verify all four in the stimulus.",
        correct: true,
        explanation:
          "This is layered structural language. Every layer must match the stimulus or the answer dies.",
      },
      {
        text: "The choice is hard because it lacks a verb.",
        correct: false,
        explanation: "The choice has multiple verbs: makes, justify, concludes.",
      },
      {
        text: "The choice is hard because the stimulus uses a percentage.",
        correct: false,
        explanation: "The percentage in the stimulus does not change the structural reading.",
      },
      {
        text: "The choice is hard because it uses no LSAT-specific terms.",
        correct: false,
        explanation: "Observation, insufficient, and conclude are all LSAT structural terms.",
      },
    ],
  },
  {
    id: "wh_4",
    stimulus:
      "Most professionals at the firm have law degrees. John is a senior partner. Therefore, John must have passed the bar.",
    answerChoice:
      "It is an intermediate conclusion that supports the main conclusion.",
    question: "What makes this answer choice hard to evaluate?",
    options: [
      {
        text: "Role labels (intermediate conclusion, main conclusion) require the student to map the argument's structure precisely, not just read it linearly.",
        correct: true,
        explanation:
          "An intermediate conclusion must itself be supported by other premises AND must support the final claim. Both relationships must hold.",
      },
      {
        text: "The choice is hard because John is mentioned twice.",
        correct: false,
        explanation: "Repetition is not the issue. Role mapping is.",
      },
      {
        text: "The choice is hard because the stimulus contains the word \"most.\"",
        correct: false,
        explanation: "The quantifier does not change the role of the quoted statement.",
      },
      {
        text: "The choice is hard because it ends with the word conclusion.",
        correct: false,
        explanation: "The structural meaning of conclusion is what matters, not the surface word.",
      },
    ],
  },
  {
    id: "wh_5",
    stimulus:
      "Smoking is a leading cause of lung cancer. John has lung cancer. Therefore, John must have been a heavy smoker.",
    answerChoice: "It is what the author's argument purports to explain.",
    question: "What makes this answer choice hard to evaluate?",
    options: [
      {
        text: "Purports to explain means the statement is the effect or phenomenon the argument is trying to account for, not the cause. Student must invert the everyday reading.",
        correct: true,
        explanation:
          "On the LSAT, purports to explain points to the thing being explained. Here John's lung cancer is the phenomenon; smoking is the proposed cause.",
      },
      {
        text: "The choice is hard because it uses the word \"author.\"",
        correct: false,
        explanation: "Author is standard LSAT vocabulary, not the source of difficulty.",
      },
      {
        text: "The choice is hard because the stimulus has three sentences.",
        correct: false,
        explanation: "Sentence count is unrelated to the difficulty.",
      },
      {
        text: "The choice is hard because purports is a rare English word.",
        correct: false,
        explanation: "Word rarity is not the issue. The structural reversal is.",
      },
    ],
  },
];
