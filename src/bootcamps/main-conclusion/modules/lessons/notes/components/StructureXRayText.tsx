import { useId, useState, type ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/bootcamps/main-conclusion/lib/cn";

type StructureRole = "background" | "premise" | "conclusion" | "opposing" | "concession" | "pivot" | "indicator";

export type StructureSegment = {
  id: string;
  text: string;
  role: StructureRole;
  label: string;
  explanation?: string;
};

const ROLE_STYLES: Record<StructureRole, { ink: string; chip: string; underline: string }> = {
  background: {
    ink: "text-[rgba(26,26,26,0.84)]",
    chip: "border-[rgba(26,26,26,0.10)] bg-[rgba(26,26,26,0.04)] text-[rgba(26,26,26,0.58)]",
    underline: "border-b border-[rgba(26,26,26,0.28)]",
  },
  premise: {
    ink: "text-[#24425D]",
    chip: "border-[#A6C2D8] bg-[#EEF5FB] text-[#24425D]",
    underline: "border-b-2 border-[#A6C2D8]",
  },
  conclusion: {
    ink: "text-[#2F5B35]",
    chip: "border-[#B9D6B4] bg-[#F2F8EF] text-[#2F5B35]",
    underline: "border-b-2 border-[#B9D6B4]",
  },
  opposing: {
    ink: "text-[#4D3F68]",
    chip: "border-[#C9BED9] bg-[#F6F1FB] text-[#4D3F68]",
    underline: "border-b-2 border-[#C9BED9]",
  },
  concession: {
    ink: "text-[#74541B]",
    chip: "border-[#DABB7E] bg-[#FCF7EA] text-[#74541B]",
    underline: "border-b-2 border-[#DABB7E]",
  },
  pivot: {
    ink: "text-[#74541B]",
    chip: "border-[#DABB7E] bg-[#FCF7EA] text-[#74541B]",
    underline: "border-b-2 border-dashed border-[#DABB7E]",
  },
  indicator: {
    ink: "text-[#74541B]",
    chip: "border-[#DABB7E] bg-[#FCF7EA] text-[#74541B]",
    underline: "border-b border-dotted border-[#DABB7E]",
  },
};

export function StructureXRayText({
  title,
  description,
  coachNote,
  segments,
}: {
  title: string;
  description?: ReactNode;
  coachNote?: ReactNode;
  segments: StructureSegment[];
}) {
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const [structureOn, setStructureOn] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const activeSegment = segments.find((segment) => segment.id === activeSegmentId) ?? null;

  return (
    <div className="rounded-[12px] border border-[rgba(26,26,26,0.10)] bg-white">
      <div className="border-b border-[rgba(26,26,26,0.08)] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
              Structure view
            </div>
            <h3 className="font-serif text-[30px] italic leading-tight text-[#1a1a1a]">{title}</h3>
            {description ? <div className="max-w-2xl text-[16px] leading-[1.65] text-[rgba(26,26,26,0.72)]">{description}</div> : null}
          </div>
          <button
            type="button"
            aria-expanded={structureOn}
            aria-controls={panelId}
            onClick={() => {
              setStructureOn((current) => !current);
              if (structureOn) setActiveSegmentId(null);
            }}
            className="rounded-full border border-[rgba(26,26,26,0.12)] bg-[#1a1a1a] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#F5F2ED] transition-colors duration-200 ease-out hover:bg-[rgba(26,26,26,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
          >
            {structureOn ? "Hide structure" : "Show structure"}
          </button>
        </div>
      </div>

      <div id={panelId} className="space-y-5 px-5 py-5 md:px-6 md:py-6">
        <div className="rounded-[12px] border border-[rgba(26,26,26,0.08)] bg-[#FFFDFC] px-5 py-5 shadow-[0_10px_22px_rgba(26,26,26,0.04)]">
          <p className="text-[19px] leading-[1.9] text-[rgba(26,26,26,0.84)]">
            {segments.map((segment) => (
              <button
                key={segment.id}
                type="button"
                disabled={!structureOn}
                aria-pressed={structureOn && activeSegmentId === segment.id}
                onClick={() => setActiveSegmentId((current) => (current === segment.id ? null : segment.id))}
                className={cn(
                  "inline rounded-[4px] px-[2px] py-[1px] text-left transition-[color,border-color,background-color,opacity] duration-150 ease-out",
                  structureOn ? "cursor-pointer hover:bg-[rgba(26,26,26,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2" : "cursor-default",
                  !structureOn && "text-[rgba(26,26,26,0.84)]",
                  structureOn && ROLE_STYLES[segment.role].ink,
                  structureOn && ROLE_STYLES[segment.role].underline,
                  structureOn && activeSegmentId === segment.id && "bg-[rgba(26,26,26,0.04)]",
                )}
              >
                {segment.text}{" "}
              </button>
            ))}
          </p>
        </div>

        <AnimatePresence initial={false}>
          {structureOn ? (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-2">
                {segments.map((segment) => (
                  <button
                    key={segment.id}
                    type="button"
                    aria-pressed={activeSegmentId === segment.id}
                    onClick={() => setActiveSegmentId((current) => (current === segment.id ? null : segment.id))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition-transform duration-150 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2",
                      ROLE_STYLES[segment.role].chip,
                      activeSegmentId === segment.id && "translate-y-[-1px] shadow-[0_10px_18px_rgba(26,26,26,0.08)]",
                    )}
                  >
                    {segment.label}
                  </button>
                ))}
              </div>

              <div aria-live="polite" className="rounded-[12px] border border-[rgba(26,26,26,0.08)] bg-[#FBF8F1] px-4 py-4 text-[15px] leading-[1.65] text-[rgba(26,26,26,0.76)]">
                {activeSegment?.explanation ?? coachNote ?? "The answer choices are downstream from this structure. Read the reasoning first."}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
