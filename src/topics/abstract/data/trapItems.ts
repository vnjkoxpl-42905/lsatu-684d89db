// 10 "What kind of trap is this?" quiz items for Module 6.
//
// Each item shows a stimulus and one wrong answer choice, and the student
// names the trap. The label belongs to that specific wrong choice (an earlier
// version graded against the whole drill's tag, which did not always match the
// option shown).
//
// Items 1-6 reuse wrong choices from drills the student meets in Modules 1, 2,
// 4 and 5, so nothing here gives away an answer in a later drill. Items 7-10
// are original to this quiz.

import { DRILLS } from "./drills";

export type TrapTag =
  | "wrong_role"
  | "wrong_method"
  | "structural_mismatch"
  | "attractive_language";

export interface TrapItem {
  id: string;
  stimulus: string;
  wrongChoice: string;
  prompt: string;
  options: TrapTag[];
  correctOption: number;
  explanation: string;
}

const TRAP_LABELS: Record<TrapTag, string> = {
  wrong_role: "Wrong role",
  wrong_method: "Wrong method",
  structural_mismatch: "Structural mismatch",
  attractive_language: "Attractive language",
};

export const TRAP_OPTION_ORDER: TrapTag[] = [
  "wrong_role",
  "wrong_method",
  "structural_mismatch",
  "attractive_language",
];

export const TRAP_OPTION_TEXT: string[] = TRAP_OPTION_ORDER.map((tag) => TRAP_LABELS[tag]);

const PROMPT = "What kind of trap is this wrong answer?";

// Stimulus text comes straight from the drill so the two never drift apart.
function drillStimulus(drillId: string, about?: string): string {
  const stimulus = DRILLS.find((d) => d.id === drillId)?.stimulus ?? "";
  return about ? `${stimulus}

About: ${about}` : stimulus;
}

function item(
  id: string,
  stimulus: string,
  wrongChoice: string,
  tag: TrapTag,
  explanation: string,
): TrapItem {
  return {
    id,
    stimulus,
    wrongChoice,
    prompt: PROMPT,
    options: TRAP_OPTION_ORDER,
    correctOption: TRAP_OPTION_ORDER.indexOf(tag),
    explanation,
  };
}

export const TRAP_ITEMS: TrapItem[] = [
  item(
    "trap_1",
    drillStimulus("drill_1", "the claim that the crew has been working double shifts."),
    "It is the argument's main conclusion.",
    "wrong_role",
    "Wrong role. The double shifts are a reason. The main conclusion is that the project will finish ahead of schedule.",
  ),
  item(
    "trap_2",
    drillStimulus("drill_5", "the claim that cities that fund the arts generously have stronger economies."),
    "It is a counterconsideration the argument acknowledges before rejecting.",
    "wrong_role",
    "Wrong role. The author isn't conceding anything here. The claim is part of the author's own support.",
  ),
  item(
    "trap_3",
    drillStimulus("drill_2"),
    "Providing an alternative explanation for the recent outage.",
    "wrong_method",
    "Wrong method. The IT Lead never explains why the outage happened. They bring up information the Manager ignored.",
  ),
  item(
    "trap_4",
    drillStimulus("drill_11"),
    "Pointing out an inappropriate analogy in Hill's reasoning.",
    "wrong_method",
    "Wrong method. Hill never compares two things, so there's no analogy for Watkins to criticize.",
  ),
  item(
    "trap_5",
    drillStimulus("drill_13"),
    "Attacking Vega's premise that children's advertising is manipulative.",
    "wrong_method",
    "Wrong method. Lin never disputes that the ads manipulate children. Lin argues the ban would cause other problems.",
  ),
  item(
    "trap_6",
    drillStimulus("drill_3"),
    "Mistakes a temporal relationship between two events for a causal relationship.",
    "structural_mismatch",
    "Structural mismatch. The argument is about a requirement for driving, not about one event coming before another.",
  ),
  item(
    "trap_7",
    "Everyone who works the night shift gets a parking pass. Dana has a parking pass. So Dana works the night shift.",
    "Mistakes a temporal relationship between two events for a causal relationship.",
    "structural_mismatch",
    "Structural mismatch. Nothing here depends on time order. The real flaw reads the rule backwards: having a pass doesn't mean Dana works nights.",
  ),
  item(
    "trap_8",
    "Cities with more bike lanes have fewer traffic deaths. So adding bike lanes to our city would cut traffic deaths.",
    "Treats a necessary condition as if it were sufficient.",
    "structural_mismatch",
    "Structural mismatch. The argument has no requirement in it. Its real problem is reading a correlation as a cause.",
  ),
  item(
    "trap_9",
    "A survey of 200 runners found that those who stretched before races reported fewer injuries. So stretching before a race may help prevent injuries.",
    "The argument proves that stretching prevents every running injury.",
    "attractive_language",
    "Attractive language. \"Proves\" and \"every\" are far stronger than \"may help.\" Two words sink an otherwise close description.",
  ),
  item(
    "trap_10",
    "Library visits rose after a café opened inside the building. The café probably drew in some new visitors.",
    "The argument concludes that the café is the only reason library visits rose.",
    "attractive_language",
    "Attractive language. \"Only\" turns \"drew in some new visitors\" into the whole story.",
  ),
];
