// 5 Module 1 quiz items: "Which sentence is this answer choice describing?"
//
// Module 1 shows that an abstract answer choice is a description of the
// argument with the content stripped out. These items make the student do the
// first half of that by hand: read a short numbered argument, read the
// abstract description, and point to the sentence it describes. No method
// required yet, only careful reading.
//
// Arguments are original to this quiz.

export interface WhyHardItem {
  id: string;
  stimulus: string;
  answerChoice: string;
  question: string;
  options: { text: string; correct: boolean; explanation: string }[];
}

const QUESTION = "Which sentence is this answer choice describing?";

export const WHY_HARD_ITEMS: WhyHardItem[] = [
  {
    id: "wh_1",
    stimulus:
      "(1) Our library should stay open until midnight during finals. (2) Last spring, every study room was still full at 11 p.m. (3) Students clearly need the late hours.",
    answerChoice:
      "It is offered as evidence for a claim that, in turn, supports the argument's main conclusion.",
    question: QUESTION,
    options: [
      {
        text: "Sentence 1",
        correct: false,
        explanation: "Not that one. Sentence 1 is the main conclusion. Nothing in the argument uses it as evidence.",
      },
      {
        text: "Sentence 2",
        correct: true,
        explanation:
          "Correct. The full study rooms support the claim that students need late hours (sentence 3), and that claim supports staying open (sentence 1).",
      },
      {
        text: "Sentence 3",
        correct: false,
        explanation: "Not that one. Sentence 3 is the claim in the middle. It gets support from sentence 2; it isn't evidence for it.",
      },
    ],
  },
  {
    id: "wh_2",
    stimulus:
      "(1) Some parents worry that video games make kids aggressive. (2) But a ten-year study found no link between gaming and aggression. (3) So that worry isn't backed by the evidence.",
    answerChoice: "It presents evidence against a position that the argument rejects.",
    question: QUESTION,
    options: [
      {
        text: "Sentence 1",
        correct: false,
        explanation: "Not that one. Sentence 1 is the position being rejected, not the evidence against it.",
      },
      {
        text: "Sentence 2",
        correct: true,
        explanation: "Correct. The study is the evidence, and the parents' worry is the position the argument rejects.",
      },
      {
        text: "Sentence 3",
        correct: false,
        explanation: "Not that one. Sentence 3 is where the argument rejects the position. It doesn't present the evidence.",
      },
    ],
  },
  {
    id: "wh_3",
    stimulus:
      "(1) Anyone who adopts a dog from the shelter must attend a training class. (2) Priya is adopting a dog from the shelter. (3) So Priya must attend the training class.",
    answerChoice: "It states a requirement that the conclusion depends on.",
    question: QUESTION,
    options: [
      {
        text: "Sentence 1",
        correct: true,
        explanation: "Correct. \"Must attend a training class\" is the requirement, and the conclusion about Priya can't work without it.",
      },
      {
        text: "Sentence 2",
        correct: false,
        explanation: "Not that one. Sentence 2 is a fact about Priya, not a requirement.",
      },
      {
        text: "Sentence 3",
        correct: false,
        explanation: "Not that one. Sentence 3 is the conclusion itself.",
      },
    ],
  },
  {
    id: "wh_4",
    stimulus:
      "(1) The museum's attendance tripled last summer. (2) Some people credit the new dinosaur exhibit. (3) But that was also the summer the museum stopped charging admission.",
    answerChoice: "It offers an alternative explanation for a phenomenon.",
    question: QUESTION,
    options: [
      {
        text: "Sentence 1",
        correct: false,
        explanation: "Not that one. Sentence 1 is the phenomenon, the thing being explained.",
      },
      {
        text: "Sentence 2",
        correct: false,
        explanation: "Not that one. Sentence 2 is the first explanation. The alternative comes after it.",
      },
      {
        text: "Sentence 3",
        correct: true,
        explanation: "Correct. Free admission is a different possible cause of the jump in attendance.",
      },
    ],
  },
  {
    id: "wh_5",
    stimulus:
      "(1) Hiking boots are a better buy than sneakers for trail runners. (2) Boots last about three times as long on rocky trails. (3) And they cost only about twice as much.",
    answerChoice: "It is the main conclusion, and two premises support it.",
    question: QUESTION,
    options: [
      {
        text: "Sentence 1",
        correct: true,
        explanation: "Correct. Sentences 2 and 3 are the two reasons boots are the better buy.",
      },
      {
        text: "Sentence 2",
        correct: false,
        explanation: "Not that one. Sentence 2 is one of the two premises.",
      },
      {
        text: "Sentence 3",
        correct: false,
        explanation: "Not that one. Sentence 3 is the other premise.",
      },
    ],
  },
];
