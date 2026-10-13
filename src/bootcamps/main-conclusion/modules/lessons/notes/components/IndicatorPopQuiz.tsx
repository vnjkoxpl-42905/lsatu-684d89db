import { useMemo, useState } from "react";

import { InteractiveCard } from "../NoteInteractions";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type IndicatorKind = "premise" | "conclusion";

type IndicatorItem = {
  word: string;
  kind: IndicatorKind;
  note: string;
};

const ITEMS: IndicatorItem[] = [
  { word: "Therefore", kind: "conclusion", note: "Points forward to the claim the author is proving." },
  { word: "Because", kind: "premise", note: "Hands you a reason; the support sits right after it." },
  { word: "Thus", kind: "conclusion", note: "Wraps up the reasoning into the author's point." },
  { word: "Since", kind: "premise", note: "Usually drops a fact first, then leans on it." },
  { word: "For", kind: "premise", note: "A quiet FABS word: the evidence follows it." },
  { word: "So", kind: "conclusion", note: "Signals the payoff the premises were building to." },
  { word: "After all", kind: "premise", note: "Another FABS reason offered to back the claim." },
  { word: "Hence", kind: "conclusion", note: "Formal cousin of “therefore”: the conclusion lands here." },
];

const OPTIONS: { value: IndicatorKind; label: string }[] = [
  { value: "premise", label: "Premise indicator" },
  { value: "conclusion", label: "Conclusion indicator" },
];

export function IndicatorPopQuiz() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, IndicatorKind>>({});

  const item = ITEMS[index];
  const selected = answers[item.word] ?? null;
  const answered = selected !== null;
  const isCorrect = answered && selected === item.kind;
  const score = useMemo(
    () => ITEMS.filter((entry) => answers[entry.word] === entry.kind).length,
    [answers],
  );
  const completed = Object.keys(answers).length === ITEMS.length;

  function pick(value: IndicatorKind) {
    if (answered) return;
    setAnswers((current) => ({ ...current, [item.word]: value }));
  }

  return (
    <InteractiveCard
      prominent
      className="border-[#D8BE82] bg-[linear-gradient(180deg,#FFFDF8_0%,#FBF4E7_100%)] p-6 shadow-[0_24px_54px_rgba(92,67,20,0.11)] md:p-8"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-[#E6D6B2] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#74541B]">
              Pop quiz
            </div>
            <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">
              Premise or conclusion indicator?
            </h3>
            <p className="max-w-2xl text-[16px] leading-[1.6] text-[rgba(26,26,26,0.74)]">
              One word at a time. Tag what each indicator is pointing at.
            </p>
          </div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(116,84,27,0.7)]">
            {score}/{ITEMS.length} right
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" aria-hidden="true">
          {ITEMS.map((entry, entryIndex) => {
            const entryAnswer = answers[entry.word];
            const state = !entryAnswer
              ? "bg-[#E6D6B2]"
              : entryAnswer === entry.kind
                ? "bg-[#2F5B35]"
                : "bg-[#B4763E]";
            return (
              <span
                key={entry.word}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  entryIndex === index ? "w-6" : "w-3",
                  state,
                )}
              />
            );
          })}
        </div>

        <div className="rounded-[18px] border border-[rgba(116,84,27,0.18)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF9EF_100%)] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[rgba(116,84,27,0.6)]">
            Indicator {index + 1} of {ITEMS.length}
          </p>
          <p className="mt-3 font-serif text-[40px] italic leading-tight text-[#1a1a1a] md:text-[48px]">
            {item.word}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const isPicked = selected === option.value;
            const isAnswerKey = answered && option.value === item.kind;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => pick(option.value)}
                disabled={answered}
                aria-pressed={isPicked}
                className={cn(
                  "rounded-[14px] border px-5 py-4 text-[16px] font-semibold transition-[border-color,background,box-shadow,transform] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5AD5F] focus-visible:ring-offset-2",
                  !answered &&
                    "border-[#E6D6B2] bg-white/90 text-[rgba(26,26,26,0.78)] shadow-[0_8px_18px_rgba(92,67,20,0.05)] hover:-translate-y-[1px] hover:border-[#D5AD5F] hover:bg-[#FFF8EA] hover:shadow-[0_16px_30px_rgba(92,67,20,0.08)]",
                  isAnswerKey && "border-[#B9D6B4] bg-[#F6FBF3] text-[#2F5B35]",
                  answered && isPicked && !isCorrect && "border-[#E0B48A] bg-[#FBEFE3] text-[#8A4B1F]",
                  answered && !isPicked && !isAnswerKey && "border-[rgba(26,26,26,0.08)] bg-white/55 text-[rgba(26,26,26,0.5)]",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-[14px] border px-5 py-4 text-[15px] leading-[1.6] shadow-[0_12px_24px_rgba(26,26,26,0.04)]",
              isCorrect ? "border-[#B9D6B4] bg-[#F6FBF3] text-[#2F5B35]" : "border-[#E0B48A] bg-[#FBEFE3] text-[#7A451C]",
            )}
          >
            <p>
              <strong>
                {isCorrect ? "Right." : "Not quite."}
              </strong>{" "}
              <span className="text-[rgba(26,26,26,0.78)]">
                “{item.word}” is a {item.kind} indicator. {item.note}
              </span>
            </p>
            {!completed ? (
              <button
                type="button"
                onClick={() => setIndex((current) => Math.min(current + 1, ITEMS.length - 1))}
                className="mt-4 rounded-full border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-[background,transform] duration-200 hover:-translate-y-[1px] hover:bg-[rgba(26,26,26,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5AD5F] focus-visible:ring-offset-2"
              >
                Next word
              </button>
            ) : (
              <p className="mt-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-[rgba(116,84,27,0.72)]">
                Done — {score}/{ITEMS.length} indicators tagged.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </InteractiveCard>
  );
}
