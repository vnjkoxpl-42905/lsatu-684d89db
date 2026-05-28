import { useId, useMemo, useState, type ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type AnatomyRegionId = "stimulus" | "stem" | "answers";

type AnatomyRegion = {
  id: AnatomyRegionId;
  label: string;
  description: string;
  content: ReactNode;
};

type ScannerStep = {
  id: AnatomyRegionId;
  label: string;
  prompt: string;
  success: string;
};

const STEPS: ScannerStep[] = [
  {
    id: "stimulus",
    label: "Stimulus",
    prompt: "Tap the stimulus.",
    success: "Right. The reasoning lives in the stimulus.",
  },
  {
    id: "stem",
    label: "Stem",
    prompt: "Now tap the question stem.",
    success: "Good. The question stem tells you the task.",
  },
  {
    id: "answers",
    label: "Answers",
    prompt: "Now tap the answer choices.",
    success: "Exactly. The answer choices test whether you understood the stimulus.",
  },
];

const REGIONS: AnatomyRegion[] = [
  {
    id: "stimulus",
    label: "Stimulus",
    description: "The stimulus is the content you are being asked about.",
    content: (
      <p className="text-[18px] leading-[1.8] text-[rgba(26,26,26,0.84)]">
        Politician: Nobody can deny that homelessness is a problem yet there seems to be little agreement on how to
        solve it. One thing, however is clear: ignoring the problem will not make it go away. Only if the government
        steps in and provides the homeless with housing will this problem disappear, and this necessitates increased
        taxation. For this reason, we should raise taxes.
      </p>
    ),
  },
  {
    id: "stem",
    label: "Question Stem",
    description: "The stem tells you the task.",
    content: (
      <p className="text-[18px] font-semibold leading-[1.7] text-[#1a1a1a]">
        Which one of the following principles, if valid, most supports the politician’s argument?
      </p>
    ),
  },
  {
    id: "answers",
    label: "Answer Choices",
    description: "The answer choices list the possible answers.",
    content: (
      <ol className="divide-y divide-[rgba(26,26,26,0.08)] text-left">
        {[
          "(A) Only if a measure is required to solve a problem should it be adopted.",
          "(B) Only if a measure is sufficient to solve a problem should it be adopted.",
          "(C) If a measure is required to solve a problem, then it should be adopted.",
          "(D) If a measure is sufficient to solve a problem, then it should be adopted.",
          "(E) If a measure is sufficient to solve a problem, any steps necessitated by that measure should be adopted.",
        ].map((choice) => (
          <li key={choice} className="px-5 py-4 text-[17px] leading-[1.7] text-[rgba(26,26,26,0.82)]">
            {choice}
          </li>
        ))}
      </ol>
    ),
  },
];

export function QuestionAnatomyScanner() {
  const reducedMotion = useReducedMotion();
  const statusId = useId();
  const [completedIds, setCompletedIds] = useState<AnatomyRegionId[]>([]);
  const [activeId, setActiveId] = useState<AnatomyRegionId | null>(null);
  const [status, setStatus] = useState(STEPS[0].prompt);
  const [error, setError] = useState<string | null>(null);

  const nextStep = STEPS[completedIds.length] ?? null;
  const isComplete = completedIds.length === STEPS.length;

  const regionStates = useMemo(() => {
    return REGIONS.map((region) => {
      const isCompleted = completedIds.includes(region.id);
      const isActive = activeId === region.id;
      const isExpected = nextStep?.id === region.id;
      const isWaiting = !isComplete && !isCompleted && !isExpected;
      const isSecondaryAfterComplete = isComplete && region.id !== "stimulus";
      return { ...region, isCompleted, isActive, isExpected, isWaiting, isSecondaryAfterComplete };
    });
  }, [activeId, completedIds, isComplete, nextStep]);

  function handleRegionClick(regionId: AnatomyRegionId) {
    if (isComplete) {
      setActiveId(regionId);
      setError(null);
      return;
    }

    if (regionId !== nextStep?.id) {
      const expectedLabel = REGIONS.find((region) => region.id === nextStep?.id)?.label ?? "the next part";
      setError(`Not yet. Tap ${expectedLabel.toLowerCase()} first.`);
      return;
    }

    setCompletedIds((current) => [...current, regionId]);
    setActiveId(regionId);
    setError(null);

    const currentStep = STEPS.find((step) => step.id === regionId);
    const upcomingStep = STEPS[completedIds.length + 1];
    setStatus(upcomingStep ? `${currentStep?.success} ${upcomingStep.prompt}` : "Complete. The reasoning lives in the stimulus.");
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[12px] border border-[#D8BE82] bg-[#FFFDF8] p-5 shadow-[0_18px_42px_rgba(116,84,27,0.08)] md:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#D8BE82]"
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-[#E6D6B2] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#74541B] shadow-[0_8px_18px_rgba(116,84,27,0.06)]">
              Mini Drill
            </div>
            <p className="max-w-2xl text-[18px] font-medium leading-[1.55] text-[#1a1a1a]">
              Tap the highlighted part of the question.
            </p>
            <p className="max-w-2xl text-[15px] leading-[1.6] text-[rgba(26,26,26,0.66)]">
              Move through the three parts in order: stimulus, question stem, then answer choices.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step, index) => {
              const isCurrent = nextStep?.id === step.id;
              const isDone = completedIds.includes(step.id);
              return (
                <motion.span
                  key={step.id}
                  aria-current={isCurrent ? "step" : undefined}
                  animate={
                    isCurrent && !reducedMotion
                      ? {
                          scale: [1, 1.035, 1],
                          boxShadow: [
                            "0 0 0 0 rgba(216,190,130,0)",
                            "0 0 0 6px rgba(216,190,130,0.18)",
                            "0 0 0 0 rgba(216,190,130,0)",
                          ],
                        }
                      : { scale: 1, boxShadow: "0 0 0 0 rgba(216,190,130,0)" }
                  }
                  transition={
                    isCurrent && !reducedMotion
                      ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.16 }
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    isDone
                      ? "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35] shadow-[inset_0_0_0_1px_rgba(47,91,53,0.04)]"
                      : isCurrent
                        ? "border-[#D8BE82] bg-[#FEFBF2] text-[#74541B]"
                        : "border-[rgba(26,26,26,0.10)] bg-white text-[rgba(26,26,26,0.48)]",
                  )}
                >
                  {isDone ? "Found" : `${index + 1} ${step.label}`}
                </motion.span>
              );
            })}
          </div>
        </div>

        <motion.div
          id={statusId}
          aria-live="polite"
          animate={
            nextStep && !reducedMotion
              ? {
                  boxShadow: [
                    "0 12px 28px rgba(116,84,27,0.06), 0 0 0 0 rgba(216,190,130,0.00)",
                    "0 18px 36px rgba(116,84,27,0.10), 0 0 0 4px rgba(216,190,130,0.16)",
                    "0 12px 28px rgba(116,84,27,0.06), 0 0 0 0 rgba(216,190,130,0.00)",
                  ],
                }
              : { boxShadow: "0 12px 28px rgba(116,84,27,0.06)" }
          }
          transition={nextStep && !reducedMotion ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }}
          className="mt-5 flex items-center gap-3 rounded-[12px] border border-[#D8BE82] bg-[linear-gradient(180deg,#fffdfa_0%,#fffaf1_100%)] px-4 py-3.5 text-[16px] font-medium leading-[1.55] text-[#5D4216]"
        >
          <motion.span
            aria-hidden="true"
            animate={
              nextStep && !reducedMotion
                ? {
                    scale: [1, 1.18, 1],
                    opacity: [0.85, 1, 0.85],
                    boxShadow: [
                      "0 0 0 0 rgba(216,190,130,0.18)",
                      "0 0 0 8px rgba(216,190,130,0.00)",
                      "0 0 0 0 rgba(216,190,130,0.18)",
                    ],
                  }
                : { scale: 1, opacity: 1, boxShadow: "0 0 0 0 rgba(216,190,130,0.00)" }
            }
            transition={nextStep && !reducedMotion ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }}
            className="h-3 w-3 shrink-0 rounded-full bg-[#C49B45]"
          />
          <span>{status}</span>
        </motion.div>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.p
              key={error}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.16, ease: "easeOut" }}
              className="mt-3 rounded-[10px] border border-[#E6D6B2] bg-[#FEFBF2] px-4 py-3 text-[14px] leading-[1.6] text-[#74541B]"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-4" role="group" aria-describedby={statusId}>
        {regionStates.map((region) => (
          <motion.button
            key={region.id}
            type="button"
            onClick={() => handleRegionClick(region.id)}
            animate={
              region.isExpected && !reducedMotion
                ? {
                    y: [0, -2, 0],
                    boxShadow: [
                      "0 18px 42px rgba(116,84,27,0.10), 0 0 0 0 rgba(216,190,130,0.00)",
                      "0 22px 52px rgba(116,84,27,0.16), 0 0 0 7px rgba(216,190,130,0.18)",
                      "0 18px 42px rgba(116,84,27,0.10), 0 0 0 0 rgba(216,190,130,0.00)",
                    ],
                  }
                : { y: 0 }
            }
            transition={
              region.isExpected && !reducedMotion
                ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.18 }
            }
            className={cn(
              "relative block w-full overflow-hidden rounded-[12px] border bg-white text-left transition-[transform,box-shadow,border-color,opacity] duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
              "hover:-translate-y-[1px] hover:border-[rgba(26,26,26,0.18)] hover:shadow-[0_14px_28px_rgba(26,26,26,0.06)]",
              region.isCompleted && "border-[rgba(26,26,26,0.18)] shadow-[0_10px_22px_rgba(26,26,26,0.04)]",
              region.isExpected && !region.isCompleted && "border-[#D8BE82] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7eb_100%)] shadow-[0_22px_52px_rgba(116,84,27,0.12)]",
              region.isActive && "border-[rgba(26,26,26,0.22)] shadow-[0_16px_30px_rgba(26,26,26,0.08)]",
              region.isWaiting && "opacity-70",
              region.isSecondaryAfterComplete && "opacity-60",
            )}
          >
            {region.isExpected && !region.isCompleted ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[12px] bg-[linear-gradient(120deg,rgba(216,190,130,0.12),rgba(216,190,130,0.05)_22%,transparent_42%)]"
              />
            ) : null}
            <div className="border-b border-[rgba(26,26,26,0.08)] px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-serif text-[25px] italic leading-tight text-[#1a1a1a]">{region.label}</div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    region.isCompleted
                      ? "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35]"
                      : region.isExpected
                        ? "border-[#D8BE82] bg-[#FEFBF2] text-[#74541B] shadow-[0_10px_24px_rgba(116,84,27,0.10)]"
                        : "border-[rgba(26,26,26,0.10)] bg-white text-[rgba(26,26,26,0.48)]",
                  )}
                >
                  {region.isCompleted ? "Found" : region.isExpected ? "Tap this" : "Available"}
                </span>
              </div>
              <p className={cn(
                "mt-3 text-[15px] leading-[1.65] text-[rgba(26,26,26,0.68)]",
                region.isExpected && !region.isCompleted && "text-[rgba(93,66,22,0.92)]",
              )}>{region.description}</p>
            </div>

            <div className={cn("px-5 py-5 md:px-6", region.id === "answers" && "rounded-b-[12px]")}>
              {region.id === "answers" ? (
                <div className={cn(
                  "rounded-[12px] border border-[rgba(26,26,26,0.08)] bg-white shadow-[0_10px_22px_rgba(26,26,26,0.04)]",
                  region.isExpected && !region.isCompleted && "border-[#E6D6B2] shadow-[0_14px_28px_rgba(116,84,27,0.08)]",
                )}>
                  {region.content}
                </div>
              ) : region.id === "stimulus" ? (
                <div className={cn(
                  "rounded-[12px] border border-[rgba(26,26,26,0.08)] bg-white px-5 py-5 shadow-[0_10px_22px_rgba(26,26,26,0.04)]",
                  region.isExpected && !region.isCompleted && "border-[#E6D6B2] shadow-[0_14px_28px_rgba(116,84,27,0.08)]",
                )}>
                  {region.content}
                </div>
              ) : (
                region.content
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {isComplete ? (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }}
            className="rounded-[12px] border border-[#B9D6B4] bg-[#F6FBF3] px-5 py-4 text-[16px] leading-[1.65] text-[#2F5B35]"
          >
            <strong>Coach note:</strong> The reasoning lives in the stimulus. The stem tells you what job to do, and the
            answer choices only matter after you understand the stimulus.
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
