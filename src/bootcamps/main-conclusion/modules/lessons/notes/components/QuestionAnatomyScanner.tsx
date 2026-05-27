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
  prompt: string;
  success: string;
};

const STEPS: ScannerStep[] = [
  {
    id: "stimulus",
    prompt: "Find the stimulus first.",
    success: "Right. The reasoning lives in the stimulus.",
  },
  {
    id: "stem",
    prompt: "Now find the question stem.",
    success: "Good. The question stem tells you the task.",
  },
  {
    id: "answers",
    prompt: "Now find the answer choices.",
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
      const isSecondaryAfterComplete = isComplete && region.id !== "stimulus";
      return { ...region, isCompleted, isActive, isExpected, isSecondaryAfterComplete };
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
      setError(`Not yet. Find ${expectedLabel.toLowerCase()} first.`);
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
      <div className="rounded-[12px] border border-[rgba(26,26,26,0.10)] bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
              Question anatomy
            </div>
            <p className="max-w-2xl text-[16px] leading-[1.65] text-[rgba(26,26,26,0.72)]">
              Click each part in order. Stimulus first, then question stem, then answer choices.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step, index) => {
              const isCurrent = nextStep?.id === step.id;
              const isDone = completedIds.includes(step.id);
              return (
                <span
                  key={step.id}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    isDone
                      ? "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35]"
                      : isCurrent
                        ? "border-[rgba(26,26,26,0.18)] bg-[rgba(26,26,26,0.06)] text-[#1a1a1a]"
                        : "border-[rgba(26,26,26,0.10)] bg-white text-[rgba(26,26,26,0.48)]",
                  )}
                >
                  Step {index + 1}
                </span>
              );
            })}
          </div>
        </div>

        <div id={statusId} aria-live="polite" className="mt-4 rounded-[10px] bg-[#FBF8F1] px-4 py-3 text-[15px] leading-[1.6] text-[rgba(26,26,26,0.76)]">
          {status}
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
          <button
            key={region.id}
            type="button"
            onClick={() => handleRegionClick(region.id)}
            className={cn(
              "block w-full rounded-[12px] border bg-white text-left transition-[transform,box-shadow,border-color,opacity] duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
              "hover:-translate-y-[1px] hover:border-[rgba(26,26,26,0.18)] hover:shadow-[0_14px_28px_rgba(26,26,26,0.06)]",
              region.isCompleted && "border-[rgba(26,26,26,0.18)] shadow-[0_10px_22px_rgba(26,26,26,0.04)]",
              region.isExpected && !region.isCompleted && "border-[rgba(26,26,26,0.16)] bg-[#FFFDFC]",
              region.isActive && "border-[rgba(26,26,26,0.22)] shadow-[0_16px_30px_rgba(26,26,26,0.08)]",
              region.isSecondaryAfterComplete && "opacity-60",
            )}
          >
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
                        ? "border-[#E6D6B2] bg-[#FEFBF2] text-[#74541B]"
                        : "border-[rgba(26,26,26,0.10)] bg-white text-[rgba(26,26,26,0.48)]",
                  )}
                >
                  {region.isCompleted ? "Found" : region.isExpected ? "Find this now" : "Available"}
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
          </button>
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
