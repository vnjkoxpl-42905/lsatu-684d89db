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

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { InteractiveCard } from "../NoteInteractions";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";
...
        {exampleIndex < examples.length ? (
          <motion.div
            key={exampleIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="rounded-[16px] border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.76)] p-5">
...
            {!submitted ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
...
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
...
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
