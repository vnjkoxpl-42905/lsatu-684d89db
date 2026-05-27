import { useMemo, useState } from "react";

import { InteractiveCard } from "../NoteInteractions";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type ConclusionTypeId =
  | "recommendation"
  | "causal-hypothesis"
  | "prediction"
  | "judgment"
  | "rebuttal";

type Example = {
  id: string;
  claim: string;
  correctType: ConclusionTypeId;
  explanation: string;
  weakness: string;
  question: string;
};

const typeLabels: Array<{ id: ConclusionTypeId; label: string }> = [
  { id: "recommendation", label: "Recommendation" },
  { id: "causal-hypothesis", label: "Causal hypothesis" },
  { id: "prediction", label: "Prediction" },
  { id: "judgment", label: "Judgment / label" },
  { id: "rebuttal", label: "Rebuttal" },
];

const examples: Example[] = [
  {
    id: "recommendation-example",
    claim: "Double-blind techniques should be used whenever possible in scientific experiments.",
    correctType: "recommendation",
    explanation: "This claim is a recommendation. It is telling us what should be done.",
    weakness: "The author still has to show why that move is worth the costs, tradeoffs, or alternatives.",
    question: "Why is that the best move?",
  },
  {
    id: "causal-example",
    claim: "Restrictions on tobacco advertisements caused the reduction in the number of people smoking.",
    correctType: "causal-hypothesis",
    explanation: "The author is trying to explain why something happened, so that conclusion is a causal hypothesis.",
    weakness: "A timing pattern or correlation does not prove cause by itself. Something else may explain the change.",
    question: "What else could explain it?",
  },
  {
    id: "prediction-example",
    claim: "Global warming probably will not produce more frequent and intense tropical storms.",
    correctType: "prediction",
    explanation: "This claim is a prediction because it projects what will happen in the future.",
    weakness: "The argument assumes the relevant conditions will stay stable, and future conditions often change.",
    question: "What could change?",
  },
  {
    id: "judgment-example",
    claim: "Because the new products are selling poorly, the ad campaign is ill-conceived.",
    correctType: "judgment",
    explanation: "This claim assigns a verdict to something, so it is a judgment or label.",
    weakness: "The evidence may not really justify that strong label, even if the label sounds plausible.",
    question: "Did they actually prove that label fits?",
  },
  {
    id: "rebuttal-example",
    claim: "Critics say this movie is unrealistic. They are wrong, because it is a funny comedy and that is all that matters.",
    correctType: "rebuttal",
    explanation: "The author is responding to another side and saying that side is wrong, so this is a rebuttal.",
    weakness: "The author may answer the wrong criticism or fail to engage the real objection.",
    question: "Did the author actually answer them?",
  },
];

const titleByType: Record<ConclusionTypeId, string> = {
  recommendation: "That conclusion is a recommendation.",
  "causal-hypothesis": "That conclusion is a causal hypothesis.",
  prediction: "That conclusion is a prediction.",
  judgment: "That conclusion is a judgment or label.",
  rebuttal: "That conclusion is a rebuttal.",
};

export function ConclusionTypeSwitchboard() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<ConclusionTypeId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const example = examples[exampleIndex] ?? examples[0];
  const selectionCorrect = selectedType === example.correctType;

  const correctLabel = useMemo(
    () => typeLabels.find((type) => type.id === example.correctType)?.label ?? "",
    [example.correctType],
  );

  function submit() {
    if (!selectedType || submitted) return;
    setSubmitted(true);
  }

  function nextExample() {
    setExampleIndex((current) => (current + 1) % examples.length);
    setSelectedType(null);
    setSubmitted(false);
  }

  function resetCurrent() {
    setSelectedType(null);
    setSubmitted(false);
  }

  return (
    <InteractiveCard prominent className="bg-[#FFFDFC] p-6 md:p-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
            One active pass
          </div>
          <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">
            Name the kind of conclusion before the page tells you
          </h3>
          <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
            Pick the type first. Then use the reveal to connect that kind of claim to its usual weak spot.
          </p>
        </div>

        <div className="rounded-[16px] border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.76)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
            Current claim
          </p>
          <p className="mt-2 text-[18px] leading-[1.75] text-[rgba(26,26,26,0.82)]">
            <em>{example.claim}</em>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Conclusion type choices">
          {typeLabels.map((type) => {
            const checked = selectedType === type.id;
            const isCorrect = submitted && type.id === example.correctType;
            const isWrongPick = submitted && checked && type.id !== example.correctType;

            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={submitted}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "rounded-[14px] border px-4 py-4 text-left transition-[border-color,background,box-shadow,transform] duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                  !submitted &&
                    "border-[rgba(26,26,26,0.10)] bg-white hover:-translate-y-[1px] hover:border-[rgba(26,26,26,0.18)] hover:shadow-[0_14px_28px_rgba(26,26,26,0.06)]",
                  checked && !submitted && "border-[#C7D9E8] bg-[#F8FBFE]",
                  isCorrect && "border-[#B9D6B4] bg-[#F6FBF3]",
                  isWrongPick && "border-[#E6D6B2] bg-[#FEFBF2]",
                  submitted && !isCorrect && !isWrongPick && "border-[rgba(26,26,26,0.08)] bg-[rgba(26,26,26,0.02)]",
                )}
              >
                <span className="text-[16px] leading-[1.55] text-[rgba(26,26,26,0.84)]">{type.label}</span>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[rgba(26,26,26,0.45)]">
              Pick the kind of claim this is.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={nextExample}
                className="rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors duration-200 hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
              >
                Show next example
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!selectedType}
                className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
              >
                Check the type
              </button>
            </div>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-[14px] border px-4 py-4",
              selectionCorrect ? "border-[#B9D6B4] bg-[#F6FBF3]" : "border-[#E6D6B2] bg-[#FEFBF2]",
            )}
          >
            <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.82)]">
              <strong>{selectionCorrect ? titleByType[example.correctType] : "Not this one."}</strong>{" "}
              {selectionCorrect
                ? example.explanation
                : `${example.explanation} The right label here is ${correctLabel}.`}
            </p>
            <p className="mt-3 text-[16px] leading-[1.6] text-[rgba(26,26,26,0.72)]">
              <strong>Likely weak spot:</strong> {example.weakness}
            </p>
            <p className="mt-2 text-[16px] leading-[1.6] text-[rgba(26,26,26,0.72)]">
              <strong>Student question:</strong> {example.question}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetCurrent}
                className="rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors duration-200 hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
              >
                Try this claim again
              </button>
              <button
                type="button"
                onClick={nextExample}
                className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
              >
                Next claim
              </button>
            </div>
          </div>
        )}
      </div>
    </InteractiveCard>
  );
}
