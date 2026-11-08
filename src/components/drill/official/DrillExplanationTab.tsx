import * as React from "react";
import { NoteProse } from "./NoteProse";
import { cn } from "@/lib/utils";
import { resolveBreakdownSteps, type LrExplanationData, type LrStyleKey } from "@/hooks/useLrExplanation";

/**
 * The drawer's Explanation tab: everything about the question as a whole.
 * Per-choice content lives inline under the choices themselves
 * (`InlineChoiceExplanation`), not here.
 *
 * Two rules survive from the retired `ExplanationPanel`:
 *  - The style selector renders only when the source published more than one
 *    style for this question (~5% of the bank).
 *  - Where a non-standard style carries no steps, Standard's breakdown is
 *    borrowed and labelled (`resolveBreakdownSteps`, shared with the
 *    Argument Breakdown under the stimulus).
 *
 * In the review-controls modes this tab is read-only on the Explanation
 * state: it shows the content while the Explanation pill is on and an honest
 * placeholder otherwise. Selecting the tab never turns Explanation on.
 */

export interface DrillExplanationContext {
  data?: LrExplanationData | null;
  isLoading?: boolean;
  isError?: boolean;
  /** Nothing is shown until the answer is revealed (legacy) or Explanation is on (review controls). */
  revealed: boolean;
  /**
   * Review-controls modes: the placeholder tells the student to press the
   * Explanation pill rather than promising an unlock on answering.
   */
  explanationPill?: boolean;
  /**
   * A sealed sitting never reveals mid-section. Say so, rather than promising
   * an unlock that cannot happen until the section is scored.
   */
  sealed?: boolean;
  /** Shared with the inline layer, so switching style swaps both surfaces. */
  activeStyle: LrStyleKey | null;
  onStyleChange: (style: LrStyleKey) => void;
  /** Hand-off to the AI tutor when the source published no prose. */
  onAskTutor?: () => void;
}

export default function DrillExplanationTab({
  data,
  isLoading,
  isError,
  revealed,
  sealed,
  explanationPill,
  activeStyle,
  onStyleChange,
  onAskTutor,
}: DrillExplanationContext) {
  const styles = data?.styles ?? [];
  const { current, steps, borrowsStandard } = resolveBreakdownSteps(data, activeStyle);

  if (!revealed) {
    return (
      <Body>
        <p className="text-[13px] text-slate-400">
          {sealed
            ? 'Explanations open after the section is scored.'
            : explanationPill
            ? 'Press Explanation to open the written explanation.'
            : 'The explanation unlocks once you have answered or revealed this question.'}
        </p>
      </Body>
    );
  }

  if (isLoading) {
    return (
      <Body>
        <p className="text-[13px] text-slate-400">Loading explanation…</p>
      </Body>
    );
  }

  if (isError) {
    return (
      <Body>
        <p className="text-[13px] text-slate-400">
          Could not load the explanation. Try again in a moment.
        </p>
      </Body>
    );
  }

  if (!data?.hasAuthored) {
    return (
      <Body>
        <p className="text-[13px] leading-relaxed text-slate-500">
          No written explanation was published for this question.
        </p>
        {onAskTutor && (
          <button
            type="button"
            onClick={onAskTutor}
            className="self-start rounded-full border border-slate-400 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Ask Joshua about this question
          </button>
        )}
      </Body>
    );
  }

  return (
    <Body>
      {data.correctChoice && (
        <p className="text-[13px] text-slate-600">
          Correct answer:{" "}
          <span className="font-semibold text-slate-900">{data.correctChoice}</span>
        </p>
      )}

      {styles.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {styles.map((s) => {
            const active = current != null && s.style === current.style;
            return (
              <button
                key={s.style}
                type="button"
                onClick={() => onStyleChange(s.style)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {steps.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4">
          <h3 className="text-[11px] uppercase tracking-wide text-slate-400">
            Argument breakdown
            {borrowsStandard && (
              <span className="ml-2 normal-case tracking-normal text-slate-400">
                same as Standard
              </span>
            )}
          </h3>
          {steps.map((step) => (
            <div key={step.position} className="text-[13px] leading-relaxed">
              <span className="font-semibold text-slate-900">{step.label}: </span>
              <NoteProse className="whitespace-pre-line text-slate-600" note={step.body} />
            </div>
          ))}
        </div>
      )}

      <p className="border-t border-slate-100 pt-4 text-[12px] italic leading-relaxed text-slate-400">
        Why each choice is right or wrong sits under that choice, beside the question.
      </p>
    </Body>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto border-t border-slate-100 px-5 py-4">
      {children}
    </div>
  );
}
