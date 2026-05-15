import { Link } from "react-router-dom";
import { useApp } from "../../store/AppContext";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  FileText,
  Target,
  Brain,
  PenTool,
  LayoutDashboard,
  Layers,
  Flag,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ViewState } from "../../types";
import { motion, useReducedMotion } from "framer-motion";
import { computeProgress, type ProgressBreakdown } from "../../lib/progress";

interface SidebarProps {
  // Called after a nav item is selected. Used by AppShell's mobile drawer
  // to close itself once the student picks a section.
  onNavigate?: () => void;
}

type ProgressKey = keyof Omit<ProgressBreakdown, "overallPct">;

const NAV_ITEMS: {
  id: ViewState;
  label: string;
  icon: typeof BookOpen;
  accent: "yellow" | "cyan" | "green" | "pink" | "red";
  progressKey: ProgressKey | null;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "yellow", progressKey: null },
  { id: "lesson", label: "Guided Lessons", icon: BookOpen, accent: "cyan", progressKey: "lessons" },
  { id: "extraction_workspace", label: "Extraction", icon: PenTool, accent: "green", progressKey: null },
  { id: "translator_workspace", label: "Translator", icon: FileText, accent: "pink", progressKey: "translator" },
  { id: "decoding_gauntlet", label: "Decoding Gauntlet", icon: Layers, accent: "pink", progressKey: "gauntlet" },
  { id: "drill", label: "Targeted Drills", icon: Target, accent: "red", progressKey: "drills" },
  { id: "flashcards", label: "Flashcards", icon: Brain, accent: "cyan", progressKey: "flashcards" },
  { id: "methods_library", label: "Methods Library", icon: BookOpen, accent: "yellow", progressKey: null },
  { id: "timed_set", label: "Final Timed Set", icon: Flag, accent: "green", progressKey: "finalSet" },
  { id: "completion_report", label: "Completion Report", icon: CheckCircle, accent: "pink", progressKey: null },
];

const ACCENT_BG: Record<typeof NAV_ITEMS[number]["accent"], string> = {
  yellow: "bg-brutal-yellow",
  cyan: "bg-brutal-cyan",
  green: "bg-brutal-green",
  pink: "bg-brutal-pink",
  red: "bg-brutal-red",
};

export default function Sidebar({ onNavigate }: SidebarProps = {}) {
  const { currentView, setCurrentView, bootcampState } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const progress = computeProgress(bootcampState);

  const handleNavigate = (id: ViewState) => {
    setCurrentView(id);
    onNavigate?.();
  };

  return (
    <nav
      aria-label="Bootcamp sections"
      id="abstract-mobile-nav"
      className="w-64 bg-brutal-bg border-r-4 border-brutal-ink flex flex-col h-full shrink-0 z-20"
    >
      <div className="p-5 md:p-6 border-b-4 border-brutal-ink bg-brutal-yellow">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 bg-brutal-ink border-2 border-brutal-ink flex items-center justify-center brutal-shadow-sm"
          >
            <span className="text-sm font-black text-brutal-paper">LU</span>
          </div>
          <span className="font-display font-black text-xl text-brutal-ink tracking-tight uppercase">
            LSAT U
          </span>
        </div>
        <p className="text-[10px] text-brutal-ink font-black mt-2 uppercase tracking-[0.2em]">
          Abstract Bootcamp
        </p>
      </div>

      <div className="px-3 md:px-4 pt-3 md:pt-4">
        <Link
          to="/foyer"
          onClick={() => onNavigate?.()}
          className="w-full min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-2 border-brutal-ink bg-brutal-paper text-xs font-black uppercase tracking-tight hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_0px_var(--brutal-ink)] transition-shadow"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Return to Main Menu</span>
        </Link>
      </div>

      <ul className="flex-1 p-3 md:p-4 space-y-2 md:space-y-3 overflow-y-auto custom-scrollbar list-none m-0">
        {NAV_ITEMS.map((navItem) => {
          const isActive = currentView === navItem.id;
          const Icon = navItem.icon;
          const itemProgress = navItem.progressKey ? progress[navItem.progressKey] : null;
          const isDone = itemProgress ? itemProgress.pct === 100 : false;
          return (
            <li key={navItem.id}>
              <motion.button
                type="button"
                onClick={() => handleNavigate(navItem.id)}
                aria-current={isActive ? "page" : undefined}
                whileHover={prefersReducedMotion ? undefined : { x: 4 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "w-full min-h-[44px] flex items-center gap-3 px-4 py-3 border-2 border-brutal-ink text-sm font-black uppercase tracking-tight transition-shadow",
                  isActive
                    ? `${ACCENT_BG[navItem.accent]} brutal-shadow translate-x-[-2px] translate-y-[-2px]`
                    : "bg-brutal-paper hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_0px_var(--brutal-ink)]",
                )}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left truncate">{navItem.label}</span>
                {itemProgress ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "w-2.5 h-2.5 border-2 border-brutal-ink rounded-full shrink-0",
                      isDone ? "bg-brutal-green" : itemProgress.pct > 0 ? "bg-brutal-yellow" : "bg-brutal-paper",
                    )}
                    title={`${itemProgress.pct}% complete`}
                  />
                ) : null}
              </motion.button>
            </li>
          );
        })}
      </ul>

      <div
        className="p-5 md:p-6 border-t-4 border-brutal-ink bg-brutal-paper"
        aria-live="polite"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest">
            Overall
          </span>
          <span className="text-xs font-black">{progress.overallPct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.overallPct}
          aria-label={`Bootcamp progress: ${progress.overallPct}%`}
          className="w-full h-4 bg-brutal-bg border-2 border-brutal-ink p-1"
        >
          <div
            className="h-full bg-brutal-green border-r-2 border-brutal-ink transition-[width] duration-500"
            style={{ width: `${progress.overallPct}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
