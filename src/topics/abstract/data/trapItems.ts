// 10 "Spot the Trap" quiz items for Module 6.
//
// Each item presents a wrong-answer choice (lifted from a real drill in
// data/drills.ts: a wrong option whose explanation describes the trap), then
// asks the student to label the trap type. The four trap-type labels come
// directly from the trapTag taxonomy already documented at the top of
// data/drills.ts. The student picks from: wrong_role, wrong_method,
// structural_mismatch, attractive_language.
//
// No new LSAT content authored: every stimulus, every wrong-answer choice,
// and every explanation is a verbatim field from data/drills.ts.

import { DRILLS } from "./drills";
import { DrillItem } from "../types";

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
  wrong_role: "Wrong Role",
  wrong_method: "Wrong Method",
  structural_mismatch: "Structural Mismatch",
  attractive_language: "Attractive Language",
};

export const TRAP_OPTION_ORDER: TrapTag[] = [
  "wrong_role",
  "wrong_method",
  "structural_mismatch",
  "attractive_language",
];

export const TRAP_OPTION_TEXT: string[] = TRAP_OPTION_ORDER.map((tag) => TRAP_LABELS[tag]);

// Pick the first 10 drills that have a defined trapTag and at least one
// wrong option with a substantive explanation. Use option[0] when it is the
// wrong answer; otherwise use the first incorrect option.
function pickWrongOption(drill: DrillItem): { text: string; explanation: string } | null {
  for (let i = 0; i < drill.options.length; i++) {
    if (i === drill.correctOptionIndex) continue;
    const opt = drill.options[i];
    if (opt.explanation && opt.explanation.length > 20) return opt;
  }
  return null;
}

const SOURCE_DRILLS = DRILLS.filter((d) => Boolean(d.trapTag)).slice(0, 10);

export const TRAP_ITEMS: TrapItem[] = SOURCE_DRILLS.map((drill, index) => {
  const wrong = pickWrongOption(drill);
  const trapTag = (drill.trapTag as TrapTag) ?? "attractive_language";
  return {
    id: `trap_${drill.id}`,
    stimulus: drill.stimulus ?? "",
    wrongChoice: wrong?.text ?? drill.options[0].text,
    prompt: "What kind of trap is this wrong answer?",
    options: TRAP_OPTION_ORDER,
    correctOption: TRAP_OPTION_ORDER.indexOf(trapTag),
    explanation: wrong?.explanation ?? drill.explanation,
  };
});
