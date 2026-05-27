import { useId, useMemo, useState, type ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type AnatomyRegionId = "stimulus" | "stem" | "answers";

type AnatomyRegion = {
  id: AnatomyRegionId;
  label: string;
  eyebrow: string;
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
    prompt: "Tap the stimulus first.",
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
    eyebrow: "Reasoning surface",
    description: "Read this first. This is where the actual reasoning lives.",
    content: (
      <p className="text-[18px] leading-[1.8] text-[rgba(26,26,26,0.84)]">
        &ldquo;Humans are no better than apes at investing. We gave five stock analysts and one chimpanzee $1,350 each
        to invest. After one month, the chimp won, increasing its net worth by $210. The next best analyst increased by
        only $140.&rdquo;
      </p>
    ),
  },
  {
    id: "stem",
    label: "Question Stem",
    eyebrow: "Task prompt",
    description: "This tells you what job you need to perform on the stimulus.",
    content: (
      <p className="text-[18px] font-semibold leading-[1.7] text-[#1a1a1a]">
        Each of the following describes a flaw in the game show host&apos;s reasoning EXCEPT:
      </p>
    ),
  },
  {
    id: "answers",
    label: "Answer Choices",
    eyebrow: "Response set",
    description: "These only matter after you understand the stimulus.",
    content: (
      <ol className="divide-y divide-[rgba(26,26,26,0.08)] text-left">
        {[
          "(A) It draws a sweeping conclusion about two entire species based on an exceptionally small sample size.",
          "(B) It takes for granted that a single one-month trial is a reliable indicator of long-term investing skill.",
          "(C) It fails to consider the possibility that the chimpanzee's success was merely the result of random chance.",
          "(D) It inappropriately relies on the emotional appeal of an animal succeeding in a human profession.",
          "(E) It presumes, without providing justification, that the five chosen analysts are representative of human investors generally.",
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

        <div id={statusId} aria-live="polite" className="mt-5 flex items-center gap-3 rounded-[10px] border border-[#E6D6B2] bg-white px-4 py-3 text-[16px] font-medium leading-[1.55] text-[#5D4216] shadow-[0_10px_24px_rgba(116,84,27,0.05)]">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#C49B45] shadow-[0_0_0_5px_rgba(216,190,130,0.22)]"
          />
          <span>{status}</span>
        </div>

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
              region.isExpected && !region.isCompleted && "border-[#D8BE82] bg-[#FFFDF8] shadow-[0_18px_42px_rgba(116,84,27,0.10)]",
              region.isActive && "border-[rgba(26,26,26,0.22)] shadow-[0_16px_30px_rgba(26,26,26,0.08)]",
              region.isWaiting && "opacity-70",
              region.isSecondaryAfterComplete && "opacity-60",
            )}
          >
            {region.isExpected && !region.isCompleted ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[12px] bg-[linear-gradient(90deg,rgba(216,190,130,0.10),transparent_28%,transparent)]"
              />
            ) : null}
            <div className="border-b border-[rgba(26,26,26,0.08)] px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.44)]">
                    {region.eyebrow}
                  </div>
                  <div className="font-serif text-[25px] italic leading-tight text-[#1a1a1a]">{region.label}</div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    region.isCompleted
                      ? "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35]"
                      : region.isExpected
                        ? "border-[#D8BE82] bg-[#FEFBF2] text-[#74541B] shadow-[0_8px_18px_rgba(116,84,27,0.08)]"
                        : "border-[rgba(26,26,26,0.10)] bg-white text-[rgba(26,26,26,0.48)]",
                  )}
                >
                  {region.isCompleted ? "Found" : region.isExpected ? "Tap this" : "Available"}
                </span>
              </div>
              <p className="mt-3 text-[15px] leading-[1.65] text-[rgba(26,26,26,0.68)]">{region.description}</p>
            </div>

            <div className={cn("px-5 py-5 md:px-6", region.id === "answers" && "rounded-b-[12px]")}>
              {region.id === "answers" ? (
                <div className="rounded-[12px] border border-[rgba(26,26,26,0.08)] bg-white shadow-[0_10px_22px_rgba(26,26,26,0.04)]">
                  {region.content}
                </div>
              ) : region.id === "stimulus" ? (
                <div className="rounded-[12px] border border-[rgba(26,26,26,0.08)] bg-white px-5 py-5 shadow-[0_10px_22px_rgba(26,26,26,0.04)]">
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
