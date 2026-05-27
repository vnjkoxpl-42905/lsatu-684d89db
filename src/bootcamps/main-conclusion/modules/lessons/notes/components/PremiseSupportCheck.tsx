import { useMemo, useState } from "react";

import { InteractiveCard } from "../NoteInteractions";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type Choice = {
  id: string;
  text: string;
  rationale: string;
  isSupport: boolean;
};

const choices: Choice[] = [
  {
    id: "park-background",
    text: "Several neighborhood parks received evening lighting last year.",
    rationale: "This sets the scene. It matters to the topic, but it is not the reason the recommendation is being made.",
    isSupport: false,
  },
  {
    id: "park-support",
    text: "Residents now report using those parks more often after dark.",
    rationale: "This is the reason offered for the city's recommendation. It is the sentence doing the support work.",
    isSupport: true,
  },
  {
    id: "park-conclusion",
    text: "Therefore, the city should extend the lighting program to more parks.",
    rationale: "This is the claim being argued for. It is the conclusion, not the support.",
    isSupport: false,
  },
];

export function PremiseSupportCheck() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedChoice = useMemo(
    () => choices.find((choice) => choice.id === selectedId) ?? null,
    [selectedId],
  );

  function submit() {
    if (!selectedId || submitted) return;
    setSubmitted(true);
  }

  function reset() {
    setSelectedId(null);
    setSubmitted(false);
  }

  return (
    <InteractiveCard prominent className="bg-[#FFFDFC] p-6 md:p-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
            One quick rep
          </div>
          <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">
            Find the sentence doing the support work
          </h3>
          <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
            Accept every sentence as true. Then ask which one is actually being used to hold the recommendation up.
          </p>
        </div>

        <div className="rounded-[16px] border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.76)] p-5 text-[18px] leading-[1.75] text-[rgba(26,26,26,0.82)]">
          <em>
            Several neighborhood parks received evening lighting last year. Residents now report using those parks more often after dark. Therefore, the city should extend the lighting program to more parks.
          </em>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Support sentence choices">
          {choices.map((choice, index) => {
            const isSelected = selectedId === choice.id;
            const isCorrect = submitted && choice.isSupport;
            const isWrongPick = submitted && isSelected && !choice.isSupport;

            return (
              <button
                key={choice.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={submitted}
                onClick={() => setSelectedId(choice.id)}
                className={cn(
                  "w-full rounded-[14px] border px-4 py-4 text-left transition-[border-color,background,box-shadow,transform] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                  !submitted &&
                    "border-[rgba(26,26,26,0.10)] bg-white hover:-translate-y-[1px] hover:border-[rgba(26,26,26,0.18)] hover:shadow-[0_14px_28px_rgba(26,26,26,0.06)]",
                  !submitted && isSelected && "border-[#C7D9E8] bg-[#F8FBFE] shadow-[0_14px_28px_rgba(54,91,122,0.08)]",
                  isCorrect && "border-[#B9D6B4] bg-[#F6FBF3]",
                  isWrongPick && "border-[#E6D6B2] bg-[#FEFBF2]",
                  submitted && !isCorrect && !isWrongPick && "border-[rgba(26,26,26,0.08)] bg-[rgba(26,26,26,0.02)]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(26,26,26,0.10)] bg-[rgba(26,26,26,0.03)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a]">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="text-[17px] leading-[1.6] text-[rgba(26,26,26,0.84)]">{choice.text}</div>
                    {submitted ? (
                      <p className="text-[15px] leading-[1.6] text-[rgba(26,26,26,0.66)]">{choice.rationale}</p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[rgba(26,26,26,0.45)]">
              Pick the sentence the recommendation depends on.
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={!selectedId}
              className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
            >
              Reveal the support
            </button>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-[14px] border px-4 py-4",
              selectedChoice?.isSupport
                ? "border-[#B9D6B4] bg-[#F6FBF3]"
                : "border-[#E6D6B2] bg-[#FEFBF2]",
            )}
          >
            <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.82)]">
              <strong>{selectedChoice?.isSupport ? "That sentence is doing the support work." : "Not quite."}</strong>{" "}
              {selectedChoice?.isSupport
                ? "The premise is the sentence being used as a reason for the recommendation."
                : "The real premise is the sentence about residents using the parks more often after dark."}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors duration-200 hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
            >
              Try another read
            </button>
          </div>
        )}
      </div>
    </InteractiveCard>
  );
}
