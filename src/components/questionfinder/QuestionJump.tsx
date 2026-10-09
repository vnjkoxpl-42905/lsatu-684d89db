import QuestionFinder from "./QuestionFinder";
import type { QuestionFinderBank } from "./questionFinderSearch";

export interface QuestionJumpProps {
  returnTo: string;
  tone?: "light" | "dark";
  bank?: QuestionFinderBank;
  withSearch?: boolean;
}

/** Compatibility entry for the Drill landing page. Both lookup entry points
 * render the same finder and therefore share its address selection behavior. */
export default function QuestionJump({ returnTo, tone = "light", bank }: QuestionJumpProps) {
  return <QuestionFinder returnTo={returnTo} tone={tone} bank={bank} triggerLabel="Open a question" />;
}
