import * as React from "react";
import QuestionFinder, { type QuestionFinderHandle, type QuestionFinderProps } from "./QuestionFinder";
import type { QuestionFinderBank } from "./questionFinderSearch";

export interface QuestionJumpProps extends Pick<QuestionFinderProps, 'hideTrigger' | 'enabled' | 'actorId' | 'onDismiss' | 'onPreviewClose'> {
  returnTo: string;
  tone?: "light" | "dark";
  bank?: QuestionFinderBank;
  withSearch?: boolean;
  triggerLabel?: string;
}

/** Compatibility entry for the Drill landing page. Both lookup entry points
 * render the same finder and therefore share its address selection behavior. */
const QuestionJump = React.forwardRef<QuestionFinderHandle, QuestionJumpProps>(function QuestionJump({ returnTo, tone = "light", bank, triggerLabel = "Find a question", ...lifecycle }, ref) {
  return <QuestionFinder ref={ref} returnTo={returnTo} tone={tone} bank={bank} triggerLabel={triggerLabel} {...lifecycle} />;
});

export default QuestionJump;
