import * as React from "react";
import QuestionFinder, { type QuestionFinderHandle } from "./QuestionFinder";
import type { QuestionFinderBank } from "./questionFinderSearch";

export interface QuestionJumpProps {
  returnTo: string;
  tone?: "light" | "dark";
  bank?: QuestionFinderBank;
  withSearch?: boolean;
}

/** Compatibility entry for the Drill landing page. Both lookup entry points
 * render the same finder and therefore share its address selection behavior. */
const QuestionJump = React.forwardRef<QuestionFinderHandle, QuestionJumpProps>(function QuestionJump({ returnTo, tone = "light", bank }, ref) {
  return <QuestionFinder ref={ref} returnTo={returnTo} tone={tone} bank={bank} triggerLabel="Open a question" />;
});

export default QuestionJump;
