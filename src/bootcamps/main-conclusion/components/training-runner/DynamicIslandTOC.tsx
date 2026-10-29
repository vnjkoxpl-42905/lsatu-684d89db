import { useState, useEffect, ReactNode, useMemo } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

// --- Types ---

type HeadingData = {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
};

// --- Shared Animation Configs ---

const islandTransition: Transition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.5,
};

// --- Progress Circle Component ---

function CircleProgress({ percentage }: { percentage: number }) {
  const size = 24;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={radius} 
        fill="none" 
        stroke="rgb(var(--ink-faint) / 0.14)" 
        strokeWidth={strokeWidth} 
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(var(--ink))"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
  );
}

// --- Main Component ---

type DynamicIslandTOCProps = {
  children?: ReactNode;
  selector?: string;
};

export function DynamicIslandTOC({
  children,
  selector = "[data-toc]",
}: DynamicIslandTOCProps) {
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const scrollContainer = document.querySelector('#main') as HTMLElement | null;
    if (!scrollContainer) return;

    const getHeadings = () => {
      const elements = Array.from(scrollContainer.querySelectorAll(selector)) as HTMLElement[];

      const validHeadings = elements
        .filter((el) => !el.hasAttribute("data-toc-ignore"))
        .map((el, index) => {
          if (!el.id) {
            const generatedId =
              el.textContent
                ?.toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^\w-]/g, "") || `toc-heading-${index}`;
            el.id = generatedId;
          }

          const depthAttr = el.getAttribute("data-toc-depth");
          let level = 2;

          if (depthAttr) {
            level = parseInt(depthAttr, 10);
          } else {
            const tagName = el.tagName.toUpperCase();
            if (tagName.startsWith("H") && tagName.length === 2) {
              level = parseInt(tagName[1], 10);
            }
          }

          const text = el.getAttribute("data-toc-title") || el.textContent || "Section";
          return { id: el.id, text, level, element: el };
        });

      validHeadings.sort((a, b) =>
        a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );

      setHeadings(validHeadings);
    };

    const timer = setTimeout(getHeadings, 100);
    return () => clearTimeout(timer);
  }, [selector]);

  useEffect(() => {
    const scrollContainer = document.querySelector('#main') as HTMLElement | null;
    if (!scrollContainer) return;

    const handleScroll = () => {
      let currentActiveId: string | null = null;
      const containerRect = scrollContainer.getBoundingClientRect();

      for (const heading of headings) {
        const top = heading.element.getBoundingClientRect().top - containerRect.top;
        if (top <= 150) {
          currentActiveId = heading.id;
        } else {
          break;
        }
      }

      if (!currentActiveId && headings.length > 0) {
        currentActiveId = headings[0].id;
      }

      setActiveId(currentActiveId);

      const total = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (scrollContainer.scrollTop / total) * 100)) : 0);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const activeHeading = headings.find((h) => h.id === activeId);

  const minLevel = useMemo(() => {
    if (headings.length === 0) return 1;
    return Math.min(...headings.map((h) => h.level));
  }, [headings]);

  return (
    <>
      {children}
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
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-[30px] left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center pointer-events-none"
      >
        <motion.div
          onClick={() => { if (!isExpanded) setIsExpanded(true); }}
          initial={false}
          animate={{
            width: isExpanded ? 340 : 280,
            height: isExpanded ? 320 : 54,
            borderRadius: isExpanded ? 24 : 27,
          }}
          transition={islandTransition}
          style={{ cursor: isExpanded ? "default" : "pointer" }}
          className={cn(
            "relative overflow-hidden pointer-events-auto",
            "bg-[rgb(var(--surface-elev)/0.94)] backdrop-blur-md",
            "border border-[rgb(var(--border)/0.12)]",
            "shadow-[var(--shadow-3)]"
          )}
        >
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 0 : 1, scale: isExpanded ? 0.95 : 1 }}
            className={cn("absolute inset-0 flex items-center gap-4 px-5", isExpanded && "pointer-events-none")}
          >
            <div className="h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--ink))]" />
            <div className="relative flex h-full flex-1 items-center overflow-hidden text-left">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={activeId || "empty"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap font-mc-mono text-[13px] font-bold tracking-tight text-[rgb(var(--ink))]"
                >
                  {activeHeading?.text || "Contents"}
                </motion.span>
              </AnimatePresence>
            </div>
            <CircleProgress percentage={progress} />
          </motion.div>
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 1 : 0 }}
            className={cn("absolute inset-0 flex flex-col", !isExpanded && "pointer-events-none")}
          >
            <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-5 border-b border-[rgb(var(--border)/0.08)]">
              <span className="font-mc-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--ink-faint))]">Contents</span>
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="text-[rgb(var(--ink-faint))] hover:text-[rgb(var(--ink))]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
              <div className="flex flex-col gap-1">
                {headings.map((h) => {
                  const isActive = activeId === h.id;
                  const indentLevel = Math.max(0, h.level - minLevel);
                  return (
                    <button
                      key={h.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const scrollContainer = document.querySelector('#main') as HTMLElement;
                        scrollContainer.scrollTo({ top: h.element.offsetTop - 80, behavior: "smooth" });
                        setIsExpanded(false);
                      }}
                      style={{ paddingLeft: `${indentLevel * 14 + 12}px` }}
                      className={cn(
                        "group flex w-full shrink-0 items-center rounded-[8px] py-2 pr-3 text-left transition-all",
                        isActive ? "bg-[rgb(var(--ink)/0.08)] font-bold text-[rgb(var(--ink))]" : "text-[rgb(var(--ink-faint))]",
                      )}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mc-mono text-[12px] uppercase">{h.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
