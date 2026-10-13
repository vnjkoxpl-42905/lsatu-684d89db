import { useState } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";
import { type Phase } from "@/bootcamps/main-conclusion/content/lessons-phased.source";

const islandTransition: Transition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.5,
};

type Props = {
  phases: Phase[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  canAdvance: boolean;
};

export function DynamicIslandPhaseNav({ phases, currentIndex, onNavigate, canAdvance }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentPhase = phases[currentIndex];
  const progress = ((currentIndex + 1) / phases.length) * 100;

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={islandTransition}
            className="fixed inset-0 z-[9998] bg-[rgb(var(--bg)/0.2)] backdrop-blur-[4px]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-[30px] left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center pointer-events-none"
      >
        <motion.div
          onClick={() => { if (!isExpanded) setIsExpanded(true); }}
          initial={false}
          animate={{
            width: isExpanded ? 320 : 260,
            height: isExpanded ? (phases.length * 52 + 80) : 54,
            borderRadius: 999,
          }}
          transition={islandTransition}
          style={{ cursor: isExpanded ? "default" : "pointer" }}
          className={cn(
            "relative overflow-hidden pointer-events-auto",
            "bg-[rgb(var(--surface-elev))] border border-[rgb(var(--border)/0.12)] shadow-[var(--shadow-3)]"
          )}
        >
          {/* CLOSED PILL */}
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 0 : 1 }}
            transition={{ ...islandTransition, delay: isExpanded ? 0 : 0.1 }}
            className={cn("absolute inset-0 flex items-center justify-between px-6", isExpanded && "pointer-events-none")}
          >
            <span className="font-mc-mono text-[11px] font-bold uppercase tracking-tight text-[rgb(var(--ink))]">
              {currentIndex + 1}. {currentPhase?.kind || "Phase"}
            </span>
            <div className="h-1.5 w-16 rounded-full bg-[rgb(var(--border)/0.1)] overflow-hidden">
              <div className="h-full bg-[rgb(var(--accent))]" style={{ width: `${progress}%` }} />
            </div>
          </motion.div>

          {/* EXPANDED MENU */}
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 1 : 0 }}
            transition={{ ...islandTransition, delay: isExpanded ? 0.1 : 0 }}
            className={cn("absolute inset-0 flex flex-col p-4", !isExpanded && "pointer-events-none")}
          >
            <div className="flex items-center justify-between px-2 pb-4 border-b border-[rgb(var(--border)/0.08)]">
              <span className="font-mc-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--ink-faint))]">Lesson Phases</span>
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="text-[rgb(var(--ink-faint))] hover:text-[rgb(var(--ink))]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1 pt-2">
              {phases.map((p, i) => {
                const isActive = i === currentIndex;
                const isLocked = i > currentIndex && !canAdvance && i !== currentIndex + 1;
                return (
                  <button
                    key={i}
                    disabled={isLocked}
                    onClick={() => { onNavigate(i); setIsExpanded(false); }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-[8px] transition-all",
                      isActive ? "bg-[rgb(var(--ink)/0.08)] font-bold text-[rgb(var(--ink))]" : "text-[rgb(var(--ink-faint))]",
                      !isLocked && !isActive && "hover:bg-[rgb(var(--ink)/0.04)]",
                      isLocked && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="font-mc-mono text-[12px] uppercase">{i + 1}. {p.kind}</span>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
