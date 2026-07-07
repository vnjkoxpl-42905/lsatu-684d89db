import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  whyItFits: string;
  weakness: string;
  question: string;
};

const typeLabels: Array<{ id: ConclusionTypeId; label: string }> = [
  { id: "recommendation", label: "Recommendation" },
  { id: "causal-hypothesis", label: "Causal Hypothesis" },
  { id: "prediction", label: "Prediction" },
  { id: "judgment", label: "Judgment" },
  { id: "rebuttal", label: "Rebuttal" },
];

const examples: Example[] = [
  {
    id: "recommendation-example",
    claim: "The city should expand evening bus service on weekends.",
    correctType: "recommendation",
    whyItFits: "It tells us what should happen.",
    weakness: "The author still has to show that this proposal is worth the cost, effort, and tradeoffs.",
    question: "Why is that the best move?",
  },
  {
    id: "causal-example",
    claim: "The new speed bumps caused the decline in accidents on Maple Street.",
    correctType: "causal-hypothesis",
    whyItFits: "It claims to know why something happened.",
    weakness: "Something else may have caused the decline, such as less traffic, better lighting, or increased police presence.",
    question: "What else could explain it?",
  },
  {
    id: "prediction-example",
    claim: "Enrollment in the city’s adult-education classes will increase next year.",
    correctType: "prediction",
    whyItFits: "It claims what will happen in the future.",
    weakness: "The author has to assume the relevant conditions will stay the same or move in the expected direction.",
    question: "What could change?",
  },
  {
    id: "judgment-example",
    claim: "Because the restaurant received several negative reviews, its new menu is a failure.",
    correctType: "judgment",
    whyItFits: "It assigns a verdict to something.",
    weakness: "Several negative reviews may not be enough to prove the whole menu is a failure.",
    question: "Did they actually prove that judgment?",
  },
  {
    id: "rebuttal-example",
    claim: "Critics say the park renovation is unnecessary, but they are wrong because the playground equipment is unsafe.",
    correctType: "rebuttal",
    whyItFits: "The author responds to another view and says that view is wrong.",
    weakness: "The author has to actually answer the criticism, not just make a separate point.",
    question: "Did the author actually respond to the point?",
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
  const shuffledExamples = useMemo(() => {
    const arr = [...examples];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const [exampleIndex, setExampleIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<ConclusionTypeId | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const example = shuffledExamples[exampleIndex] ?? shuffledExamples[0];
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
    setExampleIndex((current) => (current + 1) % shuffledExamples.length);
    setSelectedType(null);
    setSubmitted(false);
  }


  return (
    <InteractiveCard prominent className="bg-[#FFFDFC] p-6 md:p-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[rgba(26,26,26,0.48)]">
            One active pass • Question {exampleIndex + 1} of {shuffledExamples.length}
          </div>
          <h3 className="font-serif text-[36px] italic leading-[1.1] text-[#1a1a1a]">
            Name the kind of conclusion before the page tells you
          </h3>
          <p className="text-[15px] font-serif leading-[1.7] text-[rgba(26,26,26,0.76)]">
            Pick the type first. Then use the reveal to connect that kind of claim to its usual weak spot.
          </p>
        </div>

        {exampleIndex < shuffledExamples.length ? (
          <motion.div
            key={exampleIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="rounded-[16px] border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.76)] p-5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[rgba(26,26,26,0.48)]">
                Current claim
              </p>
              <p className="mt-2 text-[15px] font-serif leading-[1.7] text-[rgba(26,26,26,0.82)]">
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
                      "rounded-[14px] border px-4 py-4 text-left transition-all duration-200 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                      !submitted &&
                        "border-[rgba(26,26,26,0.10)] bg-white hover:-translate-y-[2px] hover:border-[rgba(26,26,26,0.20)] hover:shadow-[0_8px_16px_-4px_rgba(26,26,26,0.1)]",
                      checked && !submitted && "border-[var(--role-conclusion)] bg-[#F0FDF4] scale-[1.02]",
                      isCorrect && "border-[var(--role-conclusion)] bg-[#F0FDF4]",
                      isWrongPick && "border-[var(--state-error)] bg-[#FEF2F2]",
                      submitted && !isCorrect && !isWrongPick && "border-[rgba(26,26,26,0.08)] bg-[rgba(26,26,26,0.02)]",
                    )}
                  >
                    <span className="text-[14px] font-sans leading-[1.6] text-[rgba(26,26,26,0.84)]">{type.label}</span>
                  </button>
                );
              })}
            </div>

            {!submitted ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[rgba(26,26,26,0.45)]">
                  Pick the kind of claim this is.
                </p>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!selectedType}
                  className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
                >
                  Check the type
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                role="status"
                aria-live="polite"
                className={cn(
                  "rounded-[14px] border px-4 py-4",
                  selectionCorrect ? "border-[#B9D6B4] bg-[#F6FBF3]" : "border-[#E6D6B2] bg-[#FEFBF2]",
                )}
              >
                <p className="text-[15px] font-serif leading-[1.7] text-[rgba(26,26,26,0.82)]">
                  <strong>{selectionCorrect ? titleByType[example.correctType] : "Not this one."}</strong>{" "}
                  {selectionCorrect
                    ? example.whyItFits
                    : `${example.whyItFits} The right label here is ${correctLabel}.`}
                </p>
                <p className="mt-3 text-[14px] font-sans leading-[1.6] text-[rgba(26,26,26,0.72)]">
                  <strong>Likely weak spot:</strong> {example.weakness}
                </p>
                <p className="mt-2 text-[14px] font-sans leading-[1.6] text-[rgba(26,26,26,0.72)]">
                  <strong>Student question:</strong> {example.question}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={nextExample}
                    className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
                  >
                    Next claim
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="rounded-[14px] border border-[#B9D6B4] bg-[#F6FBF3] px-5 py-4 text-[15px] font-serif leading-[1.7] text-[#2F5B35] font-medium text-center"
          >
            You practiced all five conclusion types.
          </motion.div>
        )}
      </div>
    </InteractiveCard>
  );
}
