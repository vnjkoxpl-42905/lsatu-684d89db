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
}: {
  items: Array<{ id: string; label: string; explanation: ReactNode; tone?: Tone }>;
  label?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const reducedMotion = useReducedMotion();
  const descriptionId = useId();
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  return (
    <div className="space-y-4">
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.52)]">{label}</p>
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
                tone.badge,
                tone.ring,
                active ? "translate-y-[-1px] shadow-[0_10px_18px_rgba(26,26,26,0.08)]" : "opacity-90 hover:opacity-100",
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
              toneStyles[activeItem.tone ?? "neutral"].surface,
              toneStyles[activeItem.tone ?? "neutral"].text,
            )}
          >
            {activeItem.explanation}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
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
  const [removed, setRemoved] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  const [submittedCheck, setSubmittedCheck] = useState(false);
  const reducedMotion = useReducedMotion();

  const readyForCheck = removed;
  const checkCorrect = selectedCheck === "lost-support";

  function toggleSupport() {
    setRemoved((current) => {
      const next = !current;
      if (!next) {
        setSelectedCheck(null);
        setSubmittedCheck(false);
      }
      return next;
    });
  }

  function resetAll() {
    setRemoved(false);
    setSelectedCheck(null);
    setSubmittedCheck(false);
  }

  return (
    <InteractiveCard prominent className="overflow-hidden border-[rgba(26,26,26,0.14)] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf7ef_100%)] p-6 md:p-8">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.5)]">Support check</p>
            <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">See what happens when support disappears</h3>
            <p className="max-w-2xl text-[17px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
              Premises are the load-bearing pieces. When one drops away, the conclusion immediately looks less secure.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              aria-live="polite"
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                removed
                  ? "border-[#E6D6B2] bg-[#FEFBF2] text-[#74541B]"
                  : "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35]",
              )}
            >
              {removed ? "Support weakened" : "Supported"}
            </span>
            <button
              type="button"
              onClick={toggleSupport}
              className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
            >
              {removed ? "Put support back" : "Take one premise away"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-full border border-[rgba(26,26,26,0.12)] bg-white px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors duration-200 hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-[16px] border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.7)] p-6">
          <div className="mx-auto flex max-w-[540px] flex-col items-center gap-4">
            <motion.div
              animate={
                removed && !reducedMotion
                  ? { rotate: -3, x: 10, y: 6 }
                  : { rotate: 0, x: 0, y: 0 }
              }
              transition={{ duration: reducedMotion ? 0.01 : 0.38, ease: "easeOut" }}
              className="relative w-full max-w-[360px] rounded-[18px] border border-[#E6D6B2] bg-[linear-gradient(180deg,#FFF3D5_0%,#F7E3B2_100%)] px-6 py-5 text-center shadow-[0_18px_30px_rgba(130,96,28,0.16)]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(78,58,22,0.6)]">Conclusion</div>
              <div className="mt-2 font-serif text-[28px] italic text-[#4E3A16]">The author's claim</div>
              <div className="mt-2 text-[15px] leading-[1.55] text-[rgba(78,58,22,0.76)]">
                The squishy part that needs to be held up.
              </div>
            </motion.div>

            <div className="flex w-full max-w-[420px] items-end justify-center gap-5">
              <motion.div
                layout
                transition={{ duration: reducedMotion ? 0.01 : 0.3, ease: "easeOut" }}
                className="flex-1"
              >
                <div className="rounded-[14px] border border-[#CBDDEB] bg-[#F4FAFE] px-4 py-5 text-center shadow-[0_10px_22px_rgba(54,91,122,0.10)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#456A88]">Premise 1</div>
                  <div className="mt-2 text-[15px] leading-[1.55] text-[#24425D]">Solid evidence already on the table</div>
                </div>
              </motion.div>

              <AnimatePresence initial={false}>
                {!removed ? (
                  <motion.div
                    layout
                    initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.9 }}
                    transition={{ duration: reducedMotion ? 0.01 : 0.32, ease: "easeOut" }}
                    className="flex-1"
                  >
                    <div className="rounded-[14px] border border-[#CBDDEB] bg-[#F4FAFE] px-4 py-5 text-center shadow-[0_10px_22px_rgba(54,91,122,0.10)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#456A88]">Premise 2</div>
                      <div className="mt-2 text-[15px] leading-[1.55] text-[#24425D]">More support keeping the claim upright</div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1 }}
                    className="flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-[rgba(26,26,26,0.12)] px-4 py-5 text-center text-[14px] uppercase tracking-[0.16em] text-[rgba(26,26,26,0.42)]"
                  >
                    missing support
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center text-[15px] leading-[1.6] text-[rgba(26,26,26,0.7)]">
              {removed
                ? "The claim is still there, but it no longer feels properly held up."
                : "Both premises are doing the load-bearing work that keeps the conclusion from crashing down."}
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {readyForCheck ? (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
              className="space-y-4 rounded-[16px] border border-[rgba(26,26,26,0.08)] bg-white p-5"
            >
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
                  Quick check
                </div>
                <p className="text-[18px] leading-[1.65] text-[#1a1a1a]">What failed when one premise disappeared?</p>
              </div>

              <div className="grid gap-3">
                {[
                  {
                    id: "lost-support",
                    label: "The claim lost part of the support holding it up.",
                  },
                  {
                    id: "premise-false",
                    label: "The missing premise became false, so the argument ended.",
                  },
                  {
                    id: "conclusion-role",
                    label: "The conclusion turned into a premise once the block moved.",
                  },
                ].map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={submittedCheck}
                    aria-pressed={selectedCheck === choice.id}
                    onClick={() => setSelectedCheck(choice.id)}
                    className={cn(
                      "rounded-[12px] border px-4 py-4 text-left text-[16px] leading-[1.6] transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                      selectedCheck === choice.id
                        ? "border-[rgba(26,26,26,0.22)] bg-[#FBF8F1] shadow-[0_10px_18px_rgba(26,26,26,0.05)]"
                        : "border-[rgba(26,26,26,0.10)] bg-white hover:-translate-y-[1px] hover:border-[rgba(26,26,26,0.18)]",
                      submittedCheck && choice.id === "lost-support" && "border-[#B9D6B4] bg-[#F6FBF3]",
                      submittedCheck && selectedCheck === choice.id && choice.id !== "lost-support" && "border-[#E6D6B2] bg-[#FEFBF2]",
                    )}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>

              {!submittedCheck ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] leading-[1.6] text-[rgba(26,26,26,0.62)]">
                    Pick the best description before revealing the explanation.
                  </p>
                  <button
                    type="button"
                    disabled={!selectedCheck}
                    onClick={() => setSubmittedCheck(true)}
                    className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F5F2ED] transition-colors duration-200 hover:bg-[rgba(26,26,26,0.88)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
                  >
                    Check it
                  </button>
                </div>
              ) : (
                <div
                  aria-live="polite"
                  className={cn(
                    "rounded-[12px] border px-4 py-4 text-[15px] leading-[1.65]",
                    checkCorrect
                      ? "border-[#B9D6B4] bg-[#F6FBF3] text-[#2F5B35]"
                      : "border-[#E6D6B2] bg-[#FEFBF2] text-[#74541B]",
                  )}
                >
                  <strong>{checkCorrect ? "Exactly." : "Not quite."}</strong>{" "}
                  The problem is not that the premise became false or that the conclusion changed jobs. The problem is
                  that the claim lost some of the evidence supporting it.
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
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
