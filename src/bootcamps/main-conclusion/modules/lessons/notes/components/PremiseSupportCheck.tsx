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
    text: "After all, residents now report using those lit parks more often after dark.",
    rationale: "The FABS word “After all” gives it away: this is the reason offered for the recommendation, the sentence doing the support work.",
    isSupport: true,
  },
  {
    id: "park-conclusion",
    text: "The city should extend the lighting program to more parks.",
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
    <InteractiveCard
      prominent
      className="border-[#D8BE82] bg-[linear-gradient(180deg,#FFFDF8_0%,#FBF4E7_100%)] p-6 shadow-[0_24px_54px_rgba(92,67,20,0.11)] md:p-8"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-[#E6D6B2] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#74541B]">
            One quick rep
          </div>
          <h3 className="font-serif text-[32px] italic leading-tight text-[#1a1a1a]">
            Find the sentence doing the support work
          </h3>
          <p className="max-w-2xl text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
            Accept every sentence as true. One of them even announces itself with a FABS word; find the sentence actually holding the recommendation up.
          </p>
        </div>

        <div className="rounded-[16px] border border-[rgba(116,84,27,0.18)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF9EF_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_26px_rgba(26,26,26,0.045)]">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[rgba(116,84,27,0.62)]">
            Stimulus
          </div>
          <p className="max-w-3xl text-[18px] leading-[1.78] text-[rgba(26,26,26,0.82)]">
            <em>
              Several neighborhood parks received evening lighting last year. The city should extend the lighting program to more parks. After all, residents now report using those lit parks more often after dark.
            </em>
          </p>
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
                  "w-full rounded-[13px] border px-5 py-5 text-left transition-[border-color,background,box-shadow,transform] duration-200 ease-out active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5AD5F] focus-visible:ring-offset-2",
                  !submitted &&
                    "border-[rgba(26,26,26,0.11)] bg-white/90 shadow-[0_8px_18px_rgba(26,26,26,0.035)] hover:-translate-y-[1px] hover:border-[#D5AD5F] hover:bg-[#FFFDF8] hover:shadow-[0_16px_30px_rgba(92,67,20,0.08)]",
                  !submitted && isSelected && "border-[#D5AD5F] bg-[#FFF8E8] shadow-[0_16px_30px_rgba(116,84,27,0.12)]",
                  isCorrect && "border-[#B9D6B4] bg-[#F6FBF3]",
                  isWrongPick && "border-[#E6D6B2] bg-[#FEFBF2]",
                  submitted && !isCorrect && !isWrongPick && "border-[rgba(26,26,26,0.08)] bg-white/55",
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200",
                      isSelected && !submitted
                        ? "border-[#D5AD5F] bg-white text-[#74541B]"
                        : "border-[rgba(26,26,26,0.10)] bg-[rgba(26,26,26,0.03)] text-[#1a1a1a]",
                      isCorrect && "border-[#B9D6B4] bg-white text-[#2F5B35]",
                      isWrongPick && "border-[#E6D6B2] bg-white text-[#74541B]",
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="text-[17px] leading-[1.62] text-[rgba(26,26,26,0.86)]">{choice.text}</div>
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
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[rgba(116,84,27,0.14)] bg-white/65 px-4 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(116,84,27,0.72)]">
              Pick the sentence the recommendation depends on.
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={!selectedId}
              className="rounded-full border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] shadow-[0_12px_22px_rgba(26,26,26,0.16)] transition-[background,box-shadow,transform,opacity] duration-200 hover:-translate-y-[1px] hover:bg-[rgba(26,26,26,0.88)] active:translate-y-0 active:shadow-[0_6px_12px_rgba(26,26,26,0.14)] disabled:cursor-not-allowed disabled:border-[rgba(26,26,26,0.16)] disabled:bg-[rgba(26,26,26,0.18)] disabled:text-[rgba(26,26,26,0.42)] disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5AD5F] focus-visible:ring-offset-2"
            >
              Reveal the support
            </button>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-[14px] border px-5 py-5 shadow-[0_12px_24px_rgba(26,26,26,0.04)]",
              selectedChoice?.isSupport
                ? "border-[#B9D6B4] bg-[#F6FBF3]"
                : "border-[#E6D6B2] bg-[#FEFBF2]",
            )}
          >
            <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.82)]">
              <strong>{selectedChoice?.isSupport ? "That sentence is doing the support work." : "Not quite."}</strong>{" "}
              {selectedChoice?.isSupport
                ? "The premise is the sentence being used as a reason for the recommendation, and its FABS word “After all” flags it."
                : "The real premise is the “After all…” sentence about residents using the lit parks more often after dark."}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-[background,transform,border-color] duration-200 hover:-translate-y-[1px] hover:border-[#D5AD5F] hover:bg-[#FFFDF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5AD5F] focus-visible:ring-offset-2"
            >
              Try another read
            </button>
          </div>
        )}
      </div>
    </InteractiveCard>
  );
}
