import { ReactNode, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type Tone = "premise" | "conclusion" | "opposing" | "pivot" | "neutral";

const toneStyles: Record<Tone, { badge: string; surface: string; text: string; ring: string }> = {
  premise: {
    badge: "border-[#A6C2D8] bg-[#EEF5FB] text-[#24425D]",
    surface: "border-[#CBDDEB] bg-[#F8FBFE]",
    text: "text-[#24425D]",
    ring: "focus-visible:ring-[#A6C2D8]",
  },
  conclusion: {
    badge: "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35]",
    surface: "border-[#D5E7CF] bg-[#FBFDF8]",
    text: "text-[#2F5B35]",
    ring: "focus-visible:ring-[#B9D6B4]",
  },
  opposing: {
    badge: "border-[#C9BED9] bg-[#F6F1FB] text-[#4D3F68]",
    surface: "border-[#DED4EA] bg-[#FBF8FE]",
    text: "text-[#4D3F68]",
    ring: "focus-visible:ring-[#C9BED9]",
  },
  pivot: {
    badge: "border-[#DABB7E] bg-[#FCF7EA] text-[#74541B]",
    surface: "border-[#E6D6B2] bg-[#FEFBF2]",
    text: "text-[#74541B]",
    ring: "focus-visible:ring-[#DABB7E]",
  },
  neutral: {
    badge: "border-[rgba(26,26,26,0.12)] bg-[rgba(26,26,26,0.04)] text-[rgba(26,26,26,0.72)]",
    surface: "border-[rgba(26,26,26,0.10)] bg-white",
    text: "text-[rgba(26,26,26,0.82)]",
    ring: "focus-visible:ring-[rgba(26,26,26,0.18)]",
  },
};

export function InteractiveCard({
  children,
  className,
  prominent = false,
  focusable = false,
}: {
  children: ReactNode;
  className?: string;
  prominent?: boolean;
  focusable?: boolean;
}) {
  return (
    <div
      tabIndex={focusable ? 0 : undefined}
      className={cn(
        "rounded-[12px] border border-[rgba(26,26,26,0.10)] bg-white transition-[transform,box-shadow,border-color,background-color,opacity] duration-200 ease-out",
        "shadow-[0_10px_24px_rgba(26,26,26,0.04)] hover:-translate-y-[2px] hover:border-[rgba(26,26,26,0.18)] hover:shadow-[0_18px_34px_rgba(26,26,26,0.08)]",
        "focus-within:-translate-y-[2px] focus-within:border-[rgba(26,26,26,0.22)] focus-within:shadow-[0_18px_34px_rgba(26,26,26,0.08)]",
        focusable && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
        prominent && "border-[rgba(26,26,26,0.16)] bg-[#FFFCF7] shadow-[0_18px_40px_rgba(26,26,26,0.07)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function IndicatorPillGroup({
  items,
  label,
  variant = "default",
}: {
  items: Array<{ id: string; label: string; explanation: ReactNode; tone?: Tone }>;
  label?: string;
  variant?: "default" | "warm";
}) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const reducedMotion = useReducedMotion();
  const descriptionId = useId();
  const activeItem = items.find((item) => item.id === activeId) ?? null;
  const isWarm = variant === "warm";

  return (
    <div
      className={cn(
        "space-y-4",
        isWarm &&
          "rounded-[16px] border border-[#E6D6B2] bg-[linear-gradient(180deg,#FFFDF8_0%,#FBF4E7_100%)] p-5 shadow-[0_16px_34px_rgba(92,67,20,0.06)]",
      )}
    >
      {label ? (
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.52)]",
            isWarm && "text-[#74541B]",
          )}
        >
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {items.map((item) => {
          const tone = toneStyles[item.tone ?? "neutral"];
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(active ? null : item.id)}
              aria-expanded={active}
              aria-controls={descriptionId}
              className={cn(
                "rounded-full border px-4 py-2 text-[14px] font-semibold tracking-[0.01em] transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isWarm
                  ? active
                    ? "border-[#D5AD5F] bg-[#FFF7E6] text-[#5C3D0E] shadow-[0_12px_20px_rgba(116,84,27,0.11)]"
                    : "border-[#E6D6B2] bg-white/80 text-[rgba(26,26,26,0.72)] hover:border-[#D5AD5F] hover:bg-[#FFFBF2]"
                  : tone.badge,
                isWarm ? "focus-visible:ring-[#D5AD5F]" : tone.ring,
                active ? "translate-y-[-1px]" : "opacity-90 hover:opacity-100",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {activeItem ? (
          <motion.div
            key={activeItem.id}
            id={descriptionId}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
            className={cn(
              "rounded-[12px] border px-5 py-4 text-[16px] leading-[1.65]",
              isWarm
                ? "border-[#E6D6B2] border-l-[#C79B45] border-l-4 bg-[#FFFDF8] text-[rgba(26,26,26,0.78)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                : toneStyles[activeItem.tone ?? "neutral"].surface,
              !isWarm && toneStyles[activeItem.tone ?? "neutral"].text,
            )}
          >
            {activeItem.explanation}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type PremiseIndicatorLabOption = "premise" | "conclusion" | "background";

type PremiseIndicatorLabItem = {
  id: string;
  label: string;
  chipNote: string;
  functionLabel: string;
  teachingNote: string;
  example: {
    conclusion: string;
    indicator: string;
    premise: string;
    order: "conclusion-first" | "premise-first";
  };
};

const premiseIndicatorLabItems: PremiseIndicatorLabItem[] = [
  {
    id: "for",
    label: "For",
    chipNote: "Evidence",
    functionLabel: "Support follows the claim",
    teachingNote: `"For" commonly introduces a reason or evidence that supports the claim before it. Read what comes after "for" as the support.`,
    example: {
      conclusion: "You should try the curry,",
      indicator: "for",
      premise: "it is the restaurant's signature dish.",
      order: "conclusion-first",
    },
  },
  {
    id: "after-all",
    label: "After all",
    chipNote: "Support",
    functionLabel: "Reason arrives after the claim",
    teachingNote: `"After all" introduces a supporting reason after the claim—it's another way the author gives evidence.`,
    example: {
      conclusion: "You should try the curry.",
      indicator: "After all,",
      premise: "you like spicy food.",
      order: "conclusion-first",
    },
  },
  {
    id: "because",
    label: "Because",
    chipNote: "Reason",
    functionLabel: "Reason is introduced directly",
    teachingNote: `"Because" signals that what follows is the reason or explanation supporting the claim.`,
    example: {
      conclusion: "You should try the curry",
      indicator: "because",
      premise: "you like spicy food.",
      order: "conclusion-first",
    },
  },
  {
    id: "since",
    label: "Since",
    chipNote: "Fact",
    functionLabel: "Premise often appears first",
    teachingNote: `"Since" frequently puts the supporting fact or background first; the following text is usually the premise.`,
    example: {
      conclusion: "you should try the curry.",
      indicator: "Since",
      premise: "you like spicy food,",
      order: "premise-first",
    },
  },
];

export function PremiseIndicatorLab() {
  const [pinnedId, setPinnedId] = useState<string | null>(premiseIndicatorLabItems[0]?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, PremiseIndicatorLabOption | null>>({});
  const reducedMotion = useReducedMotion();

  const activeId = hoveredId ?? pinnedId ?? premiseIndicatorLabItems[0]?.id ?? null;
  const activeItem = premiseIndicatorLabItems.find((item) => item.id === activeId) ?? premiseIndicatorLabItems[0];
  const selectedAnswer = activeItem ? responses[activeItem.id] ?? null : null;
  const hasAnswered = Boolean(selectedAnswer);
  const isCorrect = selectedAnswer === "premise";

  function setPinned(itemId: string) {
    setPinnedId((current) => (current === itemId ? null : itemId));
  }

  function setResponse(itemId: string, answer: PremiseIndicatorLabOption) {
    setResponses((current) => ({ ...current, [itemId]: answer }));
  }

  return (
    <InteractiveCard
      prominent
      className="overflow-hidden rounded-[26px] border-[#DFC28D] bg-[linear-gradient(180deg,#FFFEFA_0%,#FCF5E8_100%)] p-5 shadow-[0_24px_50px_rgba(92,67,20,0.08)] md:p-7"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2F]">Premise-Indicator Lab</p>
          <p className="max-w-3xl text-[18px] leading-[1.7] text-[rgba(26,26,26,0.78)]">
            Touch each indicator and watch where the support shows up in the sentence.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {premiseIndicatorLabItems.map((item) => {
            const selected = item.id === activeItem.id;
            const pinned = item.id === pinnedId;

            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId((current) => (current === item.id ? null : current))}
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId((current) => (current === item.id ? null : current))}
                onClick={() => setPinned(item.id)}
                aria-pressed={pinned}
                className={cn(
                  "group rounded-[22px] border px-4 py-4 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C89F4D] focus-visible:ring-offset-2",
                  "hover:-translate-y-[2px] hover:shadow-[0_18px_30px_rgba(92,67,20,0.10)]",
                  selected
                    ? "border-[#C89F4D] bg-[linear-gradient(180deg,#FFF9EE_0%,#FFF2D7_100%)] shadow-[0_20px_32px_rgba(116,84,27,0.12)] ring-1 ring-[#E8D1A1]"
                    : "border-[#E6D6B2] bg-[rgba(255,255,255,0.84)] shadow-[0_8px_18px_rgba(92,67,20,0.05)]",
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[19px] font-semibold text-[#36250C]">{item.label}</span>
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full border transition-all duration-200",
                        selected ? "border-[#C89F4D] bg-[#C89F4D] shadow-[0_0_0_4px_rgba(200,159,77,0.18)]" : "border-[#D8C39A] bg-white",
                      )}
                    />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2F]">{item.chipNote}</p>
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeItem.id}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }}
            className="overflow-hidden rounded-[26px] border border-[#D7B87D] bg-[linear-gradient(180deg,#FFFDF9_0%,#FCF4E6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_36px_rgba(92,67,20,0.08)]"
          >
            <div className="border-b border-[#E5D2AC] px-5 py-5 md:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2F]">Indicator — where support appears</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-serif text-[34px] italic leading-none text-[#1D1610]">{activeItem.label}</h4>
                    <span className="rounded-full border border-[#E1C78F] bg-[#FFF8EA] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A5920]">
                      {activeItem.functionLabel}
                    </span>
                  </div>
                </div>
                <p className="max-w-[360px] text-[14px] leading-[1.65] text-[rgba(26,26,26,0.68)]">
                  Click to pin an indicator. On desktop, hover can preview a different one first.
                </p>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
              <div className="rounded-[24px] border border-[#24344A] bg-[linear-gradient(180deg,#26364C_0%,#162233_100%)] p-5 shadow-[0_22px_44px_rgba(16,25,38,0.28)]">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgba(248,235,206,0.82)]">
                  Example sentence
                </p>
                  <div className="space-y-3">
                    <p className="text-[24px] leading-[1.5] text-[#F8F4EC] md:text-[28px]">
                      {activeItem.example.order === "conclusion-first" ? (
                        <>
                          <span className="text-[#F6E2B6]">{activeItem.example.conclusion}</span>{" "}
                          <span className="rounded-full bg-[#D6A64D] px-3 py-1 text-[#182434] shadow-[0_10px_20px_rgba(214,166,77,0.24)]">
                            {activeItem.example.indicator}
                          </span>{" "}
                          <span className="rounded-full bg-[#F1DFC0] px-3 py-1 text-[#182434] shadow-[0_10px_20px_rgba(241,223,192,0.18)]">
                            {activeItem.example.premise}
                          </span>

                        </>
                      ) : (
                        <>
                          <span className="rounded-full bg-[#D6A64D] px-3 py-1 text-[#182434] shadow-[0_10px_20px_rgba(214,166,77,0.24)]">
                            {activeItem.example.indicator}
                          </span>{" "}
                          <span className="rounded-full bg-[#F1DFC0] px-3 py-1 text-[#182434] shadow-[0_10px_20px_rgba(241,223,192,0.18)]">
                            {activeItem.example.premise}
                          </span>{" "}
                          <span className="text-[#F6E2B6]">{activeItem.example.conclusion}</span>
                        </>
                      )}
                    </p>

                    <div className="rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#C8D6E8]">After the indicator</p>
                      <p className="mt-2 text-[15px] leading-[1.55] text-[#FFF8EA]">{activeItem.example.premise}</p>
                      <p className="mt-2 text-[13px] leading-[1.45] text-[rgba(248,244,236,0.85)]">This part is typically the premise — the reason or evidence supporting the claim.</p>
                    </div>
                  </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="rounded-[22px] border border-[#E3CFAB] bg-[rgba(255,252,245,0.9)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2F]">Teaching note</p>
                  <p className="mt-3 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.78)]">{activeItem.teachingNote}</p>
                </div>

                <div className="rounded-[22px] border border-[#D7B87D] bg-[linear-gradient(180deg,#FFFDF8_0%,#FDF3E1_100%)] px-5 py-5 shadow-[0_16px_28px_rgba(92,67,20,0.07)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2F]">Quick check</p>
                  <p className="mt-3 text-[17px] leading-[1.6] text-[rgba(26,26,26,0.82)]">
                    Which best describes the part immediately after the indicator in this sentence?
                  </p>
                  <div className="mt-4 grid gap-2.5">
                    {(["premise", "conclusion", "background"] as const).map((option) => {
                      const selected = selectedAnswer === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setResponse(activeItem.id, option)}
                          className={cn(
                            "rounded-[16px] border px-4 py-3 text-left text-[15px] font-medium capitalize transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C89F4D] focus-visible:ring-offset-2",
                            selected
                              ? "border-[#C89F4D] bg-[#FFF4DE] text-[#5E3F12] shadow-[0_10px_18px_rgba(116,84,27,0.10)]"
                              : "border-[#E6D6B2] bg-white/90 text-[rgba(26,26,26,0.74)] hover:border-[#D7B87D] hover:bg-[#FFF8EA]",
                          )}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                  <AnimatePresence initial={false}>
                    {hasAnswered ? (
                      <motion.div
                        key={`${activeItem.id}-${selectedAnswer}`}
                        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: reducedMotion ? 0.01 : 0.16, ease: "easeOut" }}
                        className={cn(
                          "mt-4 rounded-[16px] border px-4 py-3 text-[15px] leading-[1.65]",
                          isCorrect
                            ? "border-[#BDA05C] bg-[#FFF7E4] text-[#5C4216]"
                            : "border-[#D9C7A7] bg-[#FFFDF8] text-[rgba(26,26,26,0.72)]",
                        )}
                      >
                        {isCorrect
                          ? "Right — the text after the indicator is the premise: the reason or evidence supporting the claim."
                          : "Not quite. Here, the text after the indicator is the premise — the supporting reason or evidence for the conclusion."}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </InteractiveCard>
  );
}

export function AnswerChoiceDeck({
  items,
}: {
  items: Array<{ id: string; text: ReactNode; state?: "correct" | "neutral" | "teaching-note" }>;
}) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => {
        const state =
          item.state === "correct"
            ? "border-[#B9D6B4] bg-[#F6FBF3]"
            : item.state === "teaching-note"
              ? "border-[#E6D6B2] bg-[#FEFBF2]"
              : "border-[rgba(26,26,26,0.10)] bg-white";

        const label =
          item.state === "correct" ? "Correct" : item.state === "teaching-note" ? "Teaching note" : "Choice";

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.04 }}
            className={cn(
              "rounded-[12px] border p-4 md:p-5 shadow-[0_8px_18px_rgba(26,26,26,0.04)] transition-transform duration-200 ease-out hover:-translate-y-[1px]",
              state,
            )}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(26,26,26,0.10)] bg-[rgba(26,26,26,0.03)] text-[14px] font-semibold text-[#1a1a1a]">
                {item.id}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">{label}</div>
                <div className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.84)]">{item.text}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function SupportSimulator() {
  const premiseSupports = [
    { id: "premise-1", label: "Premise 1", x: 178 },
    { id: "premise-2", label: "Premise 2", x: 360 },
    { id: "premise-3", label: "Premise 3", x: 542 },
  ] as const;

  type PremiseSupportId = (typeof premiseSupports)[number]["id"];

  const [confirmedPremises, setConfirmedPremises] = useState<PremiseSupportId[]>([]);
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const isComplete = confirmedPremises.length === premiseSupports.length;

  function togglePremise(id: PremiseSupportId) {
    setConfirmedPremises((current) =>
      current.includes(id) ? current.filter((premiseId) => premiseId !== id) : [...current, id],
    );
  }

  return (
    <InteractiveCard prominent className="overflow-hidden border-[rgba(26,26,26,0.14)] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf7ef_100%)] p-6 md:p-8">
      <div className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <h3 className="font-serif text-[34px] italic leading-tight text-[#1a1a1a]">A conclusion needs support</h3>
          <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
            A conclusion is the claim the argument is trying to hold up.
          </p>
          <p className="text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
            Premises are the supports underneath it. They keep the claim standing.
          </p>
        </div>

        <div className="rounded-[18px] border border-[rgba(26,26,26,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,244,235,0.84)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_18px_36px_rgba(26,26,26,0.06)] md:p-6">
          <svg
            role="img"
            aria-labelledby={titleId}
            viewBox="0 0 720 430"
            className="h-auto w-full overflow-visible"
          >
            <title id={titleId}>Premises support a conclusion</title>
            <defs>
              <linearGradient id="support-floor" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#F6F0E4" />
                <stop offset="100%" stopColor="#E8DDCB" />
              </linearGradient>
              <linearGradient id="support-beam" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={isComplete ? "#FFF3D0" : "#F7F1E6"} />
                <stop offset="100%" stopColor={isComplete ? "#E8C978" : "#DED3C2"} />
              </linearGradient>
              <linearGradient id="support-leg-confirmed" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#F5DFA8" />
                <stop offset="100%" stopColor="#B78D34" />
              </linearGradient>
              <linearGradient id="support-leg-tentative" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#F3F6F7" />
                <stop offset="100%" stopColor="#D8E2E7" />
              </linearGradient>
              <filter id="support-soft-shadow" x="-20%" y="-20%" width="140%" height="150%">
                <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#1A1A1A" floodOpacity="0.12" />
              </filter>
              <filter id="support-warm-glow" x="-35%" y="-35%" width="170%" height="190%">
                <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#B88727" floodOpacity="0.22" />
              </filter>
            </defs>

            <motion.g
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.12, ease: "easeOut" }}
            >
              <ellipse cx="360" cy="368" rx="286" ry="34" fill="#1A1A1A" opacity="0.045" />
              <path
                d="M86 350H634L596 382H124L86 350Z"
                fill="url(#support-floor)"
                stroke="rgba(120,97,63,0.20)"
                strokeWidth="1.5"
              />
              <line x1="108" x2="612" y1="350" y2="350" stroke="rgba(97,76,45,0.24)" strokeWidth="2" />
            </motion.g>

            {premiseSupports.map((support, index) => {
              const confirmed = confirmedPremises.includes(support.id);
              return (
                <motion.g
                  key={support.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Confirm Premise ${index + 1}`}
                  aria-pressed={confirmed}
                  onClick={() => togglePremise(support.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      togglePremise(support.id);
                    }
                  }}
                  initial={reducedMotion ? false : { scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.32, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : 0.08 + index * 0.04 }}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center bottom",
                  }}
                  className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C49A40] focus-visible:outline-offset-[3px]"
                >
                  <rect x={support.x - 46} y="132" width="92" height="226" rx="18" fill="transparent" />
                  <rect
                    x={support.x - 18}
                    y="150"
                    width="36"
                    height="200"
                    rx="10"
                    fill={confirmed ? "url(#support-leg-confirmed)" : "url(#support-leg-tentative)"}
                    opacity={confirmed ? 1 : 0.56}
                    stroke={confirmed ? "#A87922" : "#9BAEB9"}
                    strokeWidth={confirmed ? 2.4 : 1.6}
                    strokeDasharray={confirmed ? undefined : "8 8"}
                    filter={confirmed ? "url(#support-warm-glow)" : undefined}
                  />
                  <path
                    d={`M${support.x - 18} 150H${support.x + 18}L${support.x + 10} 162H${support.x - 10}Z`}
                    fill={confirmed ? "#FFE7AA" : "#EFF4F6"}
                    opacity={confirmed ? 0.92 : 0.55}
                  />
                  <rect
                    x={support.x - 38}
                    y="341"
                    width="76"
                    height="12"
                    rx="6"
                    fill={confirmed ? "#C69A3E" : "#B9C7CF"}
                    opacity={confirmed ? 0.82 : 0.35}
                  />
                  <motion.text
                    x={support.x}
                    y="398"
                    textAnchor="middle"
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: confirmed ? 1 : 0.68 }}
                    transition={{ duration: reducedMotion ? 0.01 : 0.18, delay: reducedMotion ? 0 : 0.34 }}
                    fill={confirmed ? "#6F4D12" : "rgba(26,26,26,0.56)"}
                    fontSize="17"
                    fontWeight="700"
                    letterSpacing="0.12em"
                  >
                    {support.label}
                  </motion.text>
                </motion.g>
              );
            })}

            <motion.g
              initial={reducedMotion ? false : { opacity: 0, y: -16 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: isComplete ? 4 : 0 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.36, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : 0.28 }}
              filter={isComplete ? "url(#support-soft-shadow)" : undefined}
            >
              <rect
                x="112"
                y="70"
                width="496"
                height="84"
                rx="18"
                fill="url(#support-beam)"
                stroke={isComplete ? "#B88A2E" : "rgba(120,97,63,0.28)"}
                strokeWidth={isComplete ? 2.5 : 1.5}
              />
              <path
                d="M128 154H592L572 174H148L128 154Z"
                fill={isComplete ? "#D9AF55" : "#CBC0AE"}
                opacity={isComplete ? 0.72 : 0.45}
              />
              <motion.text
                x="360"
                y="109"
                textAnchor="middle"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.18, delay: reducedMotion ? 0 : 0.42 }}
                fill={isComplete ? "#5C3E0C" : "rgba(26,26,26,0.72)"}
                fontSize="18"
                fontWeight="800"
                letterSpacing="0.18em"
              >
                CONCLUSION
              </motion.text>
              <motion.text
                x="360"
                y="134"
                textAnchor="middle"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.18, delay: reducedMotion ? 0 : 0.44 }}
                fill={isComplete ? "#6F4D12" : "rgba(26,26,26,0.58)"}
                fontSize="16"
                fontWeight="500"
              >
                The claim being supported
              </motion.text>
            </motion.g>
          </svg>
        </div>

        <AnimatePresence initial={false}>
          {isComplete ? (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: "easeOut" }}
              className="rounded-[14px] border border-[#E6D6B2] bg-[#FEFBF2] px-5 py-4 text-[17px] leading-[1.65] text-[#74541B]"
            >
              Without premises, the conclusion is just a claim with nothing holding it up.
            </motion.div>
          ) : null}
        </AnimatePresence>

        <p className="font-mc-serif text-[18px] italic leading-[1.65] text-[rgba(26,26,26,0.88)]">
          That is the basic structure of an argument: Premises support a conclusion.
        </p>
      </div>
    </InteractiveCard>
  );
}

export function XRayExample({
  title,
  description,
  source,
  blocks,
  focusModes,
  defaultScan = false,
}: {
  title: string;
  description?: ReactNode;
  source?: ReactNode;
  blocks: Array<{
    id: string;
    label: string;
    tone?: Tone;
    content: ReactNode;
    tags?: string[];
  }>;
  focusModes?: Array<{ id: string; label: string }>;
  defaultScan?: boolean;
}) {
  const [scanOn, setScanOn] = useState(defaultScan);
  const [focusId, setFocusId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  return (
    <InteractiveCard prominent className="overflow-hidden border-[rgba(26,26,26,0.14)] bg-[linear-gradient(180deg,#fff 0%,#faf6ee 100%)]">
      <div className="border-b border-[rgba(26,26,26,0.08)] px-6 py-5 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">Structure example</div>
            <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">{title}</h3>
            {description ? <div className="text-[16px] leading-[1.65] text-[rgba(26,26,26,0.72)]">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setScanOn((current) => !current);
              if (scanOn) {
                setFocusId(null);
              }
            }}
            aria-pressed={scanOn}
            className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
          >
            {scanOn ? "Hide structure" : "Show structure"}
          </button>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6 md:px-8 md:py-8">
        {source ? (
          <div className="rounded-[12px] border border-[rgba(26,26,26,0.08)] bg-[rgba(26,26,26,0.02)] px-5 py-4 text-[16px] leading-[1.7] text-[rgba(26,26,26,0.74)]">
            {source}
          </div>
        ) : null}

        {focusModes && focusModes.length > 0 ? (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">Claim-by-claim emphasis</div>
            <div className="flex flex-wrap gap-3">
              {focusModes.map((mode) => {
                const active = focusId === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={!scanOn}
                    onClick={() => setFocusId(active ? null : mode.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                      !scanOn && "cursor-not-allowed opacity-40",
                      active
                        ? "border-[rgba(26,26,26,0.20)] bg-[#1a1a1a] text-[#F5F2ED]"
                        : "border-[rgba(26,26,26,0.12)] bg-white text-[rgba(26,26,26,0.68)]",
                    )}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {blocks.map((block, index) => {
            const tone = toneStyles[block.tone ?? "neutral"];
            const matchesFocus = !focusId || block.tags?.includes(focusId);
            return (
              <motion.div
                key={block.id}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={
                  reducedMotion
                    ? { opacity: scanOn && focusId && !matchesFocus ? 0.55 : 1 }
                    : {
                        opacity: scanOn && focusId && !matchesFocus ? 0.55 : 1,
                        y: 0,
                        scale: scanOn && focusId && matchesFocus ? 1.01 : 1,
                      }
                }
                transition={{ duration: reducedMotion ? 0.01 : 0.22, delay: reducedMotion ? 0 : index * 0.03, ease: "easeOut" }}
                className={cn(
                  "rounded-[14px] border px-5 py-4 transition-colors duration-200 ease-out",
                  scanOn ? tone.surface : "border-[rgba(26,26,26,0.08)] bg-white",
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-opacity duration-200",
                      scanOn ? tone.badge : "border-[rgba(26,26,26,0.08)] bg-[rgba(26,26,26,0.03)] text-[rgba(26,26,26,0.46)]",
                    )}
                  >
                    {block.label}
                  </span>
                  {focusId && matchesFocus ? (
                    <span className="rounded-full border border-[rgba(26,26,26,0.10)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.52)]">
                      Active focus
                    </span>
                  ) : null}
                </div>
                <div className={cn("mt-3 text-[17px] leading-[1.72]", scanOn ? tone.text : "text-[rgba(26,26,26,0.82)]")}>{block.content}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </InteractiveCard>
  );
}

type ConclusionIndicatorItem = {
  id: string;
  label: string;
  functionLabel: string;
  teachingNote: string;
  premise: string;
  conclusion: string;
};

const conclusionIndicatorItems: ConclusionIndicatorItem[] = [
  {
    id: "therefore",
    label: "Therefore",
    functionLabel: "Formal conclusion marker",
    teachingNote: `"Therefore" signals the author's main claim, drawn from the reasons just given.`,
    premise: "The old bridge has cracked, and engineers warn it is no longer safe.",
    conclusion: "the city should repair the bridge.",
  },
  {
    id: "thus",
    label: "Thus",
    functionLabel: "Packages the takeaway",
    teachingNote: `"Thus" packages the conclusion as the natural result of the evidence.`,
    premise: "Three of the five council members have publicly opposed the new policy.",
    conclusion: "the policy is unlikely to pass.",
  },
  {
    id: "so",
    label: "So",
    functionLabel: "Conversational conclusion",
    teachingNote: `"So" introduces a conclusion in plain, conversational reasoning.`,
    premise: "It has been raining all morning,",
    conclusion: "you should bring an umbrella.",
  },
  {
    id: "hence",
    label: "Hence",
    functionLabel: "Formal inference",
    teachingNote: `"Hence" is a formal way of saying "and so, the conclusion is..."`,
    premise: "The sample size was extremely small and the controls were inconsistent.",
    conclusion: "the experiment's results cannot be trusted.",
  },
];

export function ConclusionIndicatorLab() {
  const [pinnedId, setPinnedId] = useState<string | null>(conclusionIndicatorItems[0]?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, "premise" | "conclusion" | "background" | null>>({});
  const reducedMotion = useReducedMotion();

  const activeId = hoveredId ?? pinnedId ?? conclusionIndicatorItems[0]?.id ?? null;
  const activeItem = conclusionIndicatorItems.find((i) => i.id === activeId) ?? conclusionIndicatorItems[0];
  const selectedAnswer = activeItem ? responses[activeItem.id] ?? null : null;
  const hasAnswered = Boolean(selectedAnswer);
  const isCorrect = selectedAnswer === "conclusion";

  return (
    <InteractiveCard
      prominent
      className="overflow-hidden rounded-[26px] border-[#DFC28D] bg-[linear-gradient(180deg,#FFFEFA_0%,#FCF5E8_100%)] p-5 shadow-[0_24px_50px_rgba(92,67,20,0.08)] md:p-7"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="max-w-3xl text-[18px] leading-[1.7] text-[rgba(26,26,26,0.78)]">
            Touch each indicator and watch how the author signals their main claim. The phrase after the indicator is the conclusion.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {conclusionIndicatorItems.map((item) => {
            const selected = item.id === activeItem.id;
            const pinned = item.id === pinnedId;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId((c) => (c === item.id ? null : c))}
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId((c) => (c === item.id ? null : c))}
                onClick={() => setPinnedId((c) => (c === item.id ? null : item.id))}
                aria-pressed={pinned}
                className={cn(
                  "rounded-[22px] border px-4 py-4 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C89F4D] focus-visible:ring-offset-2",
                  "hover:-translate-y-[2px] hover:shadow-[0_18px_30px_rgba(92,67,20,0.10)]",
                  selected
                    ? "border-[#C89F4D] bg-[linear-gradient(180deg,#FFF9EE_0%,#FFF2D7_100%)] shadow-[0_20px_32px_rgba(116,84,27,0.12)] ring-1 ring-[#E8D1A1]"
                    : "border-[#E6D6B2] bg-[rgba(255,255,255,0.84)] shadow-[0_8px_18px_rgba(92,67,20,0.05)]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[19px] font-semibold text-[#36250C]">{item.label}</span>
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border transition-all duration-200",
                      selected ? "border-[#C89F4D] bg-[#C89F4D] shadow-[0_0_0_4px_rgba(200,159,77,0.18)]" : "border-[#D8C39A] bg-white",
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeItem.id}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }}
            className="overflow-hidden rounded-[26px] border border-[#D7B87D] bg-[linear-gradient(180deg,#FFFDF9_0%,#FCF4E6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_36px_rgba(92,67,20,0.08)]"
          >
            <div className="border-b border-[#E5D2AC] px-5 py-5 md:px-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="font-serif text-[34px] italic leading-none text-[#1D1610]">{activeItem.label}</h4>
                  <span className="rounded-full border border-[#E1C78F] bg-[#FFF8EA] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A5920]">
                    {activeItem.functionLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
              <div className="rounded-[24px] border border-[#24344A] bg-[linear-gradient(180deg,#26364C_0%,#162233_100%)] p-5 shadow-[0_22px_44px_rgba(16,25,38,0.28)]">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgba(248,235,206,0.82)]">
                  Example sentence
                </p>
                <p className="text-[24px] leading-[1.5] text-[#F8F4EC] md:text-[28px]">
                  <span>{activeItem.premise}</span>{" "}
                  <span className="rounded-full bg-[#D6A64D] px-3 py-1 text-[#182434] shadow-[0_10px_20px_rgba(214,166,77,0.24)]">
                    {activeItem.label},
                  </span>{" "}
                  <span className="text-[#F6E2B6]">{activeItem.conclusion}</span>
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[18px] border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.06)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#C8D6E8]">Premise</p>
                    <p className="mt-2 text-[15px] leading-[1.55] text-[#FFF8EA]">{activeItem.premise}</p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(214,166,77,0.42)] bg-[rgba(214,166,77,0.16)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#F2D79A]">Indicator</p>
                    <p className="mt-2 text-[15px] leading-[1.55] text-[#FFF8EA]">{activeItem.label}</p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(246,226,182,0.34)] bg-[rgba(246,226,182,0.10)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#E2C887]">Conclusion</p>
                    <p className="mt-2 text-[15px] leading-[1.55] text-[#FFF8EA]">{activeItem.conclusion}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="rounded-[22px] border border-[#E3CFAB] bg-[rgba(255,252,245,0.9)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2F]">Teaching note</p>
                  <p className="mt-3 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.78)]">{activeItem.teachingNote}</p>
                </div>

                <div className="rounded-[22px] border border-[#D7B87D] bg-[linear-gradient(180deg,#FFFDF8_0%,#FDF3E1_100%)] px-5 py-5 shadow-[0_16px_28px_rgba(92,67,20,0.07)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2F]">Quick check</p>
                  <p className="mt-3 text-[17px] leading-[1.6] text-[rgba(26,26,26,0.82)]">
                    What role does the phrase after the indicator play?
                  </p>
                  <div className="mt-4 grid gap-2.5">
                    {(["premise", "conclusion", "background"] as const).map((option) => {
                      const selected = selectedAnswer === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setResponses((c) => ({ ...c, [activeItem.id]: option }))}
                          className={cn(
                            "rounded-[16px] border px-4 py-3 text-left text-[15px] font-medium capitalize transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C89F4D] focus-visible:ring-offset-2",
                            selected
                              ? "border-[#C89F4D] bg-[#FFF4DE] text-[#5E3F12] shadow-[0_10px_18px_rgba(116,84,27,0.10)]"
                              : "border-[#E6D6B2] bg-white/90 text-[rgba(26,26,26,0.74)] hover:border-[#D7B87D] hover:bg-[#FFF8EA]",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <AnimatePresence initial={false}>
                    {hasAnswered ? (
                      <motion.div
                        key={`${activeItem.id}-${selectedAnswer}`}
                        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: reducedMotion ? 0.01 : 0.16, ease: "easeOut" }}
                        className={cn(
                          "mt-4 rounded-[16px] border px-4 py-3 text-[15px] leading-[1.65]",
                          isCorrect
                            ? "border-[#BDA05C] bg-[#FFF7E4] text-[#5C4216]"
                            : "border-[#D9C7A7] bg-[#FFFDF8] text-[rgba(26,26,26,0.72)]",
                        )}
                      >
                        {isCorrect
                          ? "Right. After a conclusion-indicator, the phrase that follows is the author's main claim, supported by the reasons that came before."
                          : "Not quite. After words like therefore, thus, so, and hence, the phrase that follows is the conclusion — the author's main claim."}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </InteractiveCard>
  );
}

