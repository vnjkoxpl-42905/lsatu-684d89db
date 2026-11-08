import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NoteProse } from "./NoteProse";
import {
  resolveBreakdownSteps,
  type LrExplanationData,
  type LrStyleKey,
} from "@/hooks/useLrExplanation";

/**
 * The Argument Breakdown under the stimulus: the question-level half of the
 * Question Explanation, LSAT Lab's shape.
 *
 * Closed by default. While Explanation is on, all the student sees here is a
 * rule under the stimulus with a small chevron sitting on it, so she knows
 * there is more without being handed it. Pressing the chevron opens the style
 * pills (only when the source published more than one style) and the
 * labelled steps. The drawer's Explanation tab renders the same data.
 */
interface Props {
  data?: LrExplanationData | null;
  isLoading?: boolean;
  isError?: boolean;
  activeStyle: LrStyleKey | null;
  onStyleChange: (style: LrStyleKey) => void;
  fontScale?: number;
  open: boolean;
  onToggle: () => void;
}

export default function ArgumentBreakdown({
  data,
  isLoading,
  isError,
  activeStyle,
  onStyleChange,
  fontScale = 1,
  open,
  onToggle,
}: Props) {
  const styles = data?.styles ?? [];
  const { current, steps, borrowsStandard } = resolveBreakdownSteps(data, activeStyle);
  const baseSize = 19 * fontScale;

  let body: React.ReactNode = null;
  if (open) {
    if (isLoading) {
      body = <p className="text-[13px] text-slate-400">Loading explanation…</p>;
    } else if (isError) {
      body = (
        <p className="text-[13px] text-slate-400">
          Could not load the explanation. Try again in a moment.
        </p>
      );
    } else if (!data?.hasAuthored) {
      body = (
        <p className="text-[13px] leading-relaxed text-slate-500">
          No written explanation was published for this question.
        </p>
      );
    } else {
      body = (
        <>
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
          {borrowsStandard && (
            <p className="text-[11px] uppercase tracking-wide text-slate-400">same as Standard</p>
          )}
          {steps.map((step) => (
            <div key={step.position}>
              {/* Label on its own line, a step under a step, the way LSAT Lab
                  sets Conclusion / Evidence / Evaluate / Goal. */}
              <p
                className="font-semibold text-slate-700"
                style={{ fontSize: `${baseSize * 0.85}px`, lineHeight: 1.4 }}
              >
                {step.label}
              </p>
              <div
                className="mt-1 whitespace-pre-line text-slate-800"
                style={{ fontSize: `${baseSize}px`, lineHeight: 1.6 }}
              >
                {/* Same drawn chains and struck negations as the choice notes. */}
                <NoteProse note={step.body} />
              </div>
            </div>
          ))}
        </>
      );
    }
  }

  return (
    <section aria-label="Argument breakdown" className="font-sans">
      {/* A rule with the expander sitting on it: the only thing on screen while closed. */}
      <div className="relative flex items-center justify-center border-t border-slate-200">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Hide argument breakdown" : "Show argument breakdown"}
          title={open ? "Hide argument breakdown" : "Show argument breakdown"}
          className="-mt-[14px] flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {open && <div className="mt-4 flex flex-col gap-4">{body}</div>}
    </section>
  );
}
