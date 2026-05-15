import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../store/AppContext";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronRight,
  Star,
  Brain,
  Library,
  Flame,
  Flag,
  LayoutDashboard,
  Medal,
} from "lucide-react";
import type { MasteryLevel } from "../../types";
import { cn } from "../../lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { MODULES, type ModuleId } from "../../data/modules";

interface SidebarProps {
  onNavigate?: () => void;
}

// Small SVG progress ring for module rows.
function ProgressRing({ pct }: { pct: number }) {
  const radius = 9;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r={radius} fill="none" stroke="var(--brutal-ink-trace)" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="var(--brutal-ink)"
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="butt"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

function modulePct(noteDone: boolean, quizPassed: boolean, drillDone: boolean): number {
  let p = 0;
  if (noteDone) p += 33;
  if (quizPassed) p += 33;
  if (drillDone) p += 34;
  return p;
}

export default function Sidebar({ onNavigate }: SidebarProps = {}) {
  const {
    currentView,
    setCurrentView,
    bootcampState,
    openModule,
    isModuleUnlocked,
    isModuleComplete,
    currentModuleId,
  } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const [refOpen, setRefOpen] = useState(false);

  const goDashboard = () => {
    setCurrentView("dashboard");
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
        <div className="mt-3 flex items-center gap-4 text-xs font-black">
          <span className="inline-flex items-center gap-1" title="Total XP">
            <Star className="w-3.5 h-3.5" />
            {bootcampState.xpTotal} XP
          </span>
          {bootcampState.dailyStreak > 0 && (
            <span className="inline-flex items-center gap-1" title="Daily streak">
              <Flame className="w-3.5 h-3.5" />
              {bootcampState.dailyStreak}d
            </span>
          )}
        </div>
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

      <ul className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto custom-scrollbar list-none m-0">
        <li>
          <NavButton
            label="Dashboard"
            icon={LayoutDashboard}
            active={currentView === "dashboard"}
            onClick={goDashboard}
          />
        </li>
        <li className="pt-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft px-3 mb-1">
            Modules
          </div>
        </li>
        {MODULES.map((m) => {
          const row = bootcampState.moduleProgress[m.id];
          const noteDone = Boolean(row?.noteComplete);
          const quizPassed =
            row?.quizTotal > 0 && row.quizScore / row.quizTotal >= m.quizPassThreshold;
          const drillDone = Boolean(row?.drillComplete);
          const pct = modulePct(noteDone, quizPassed, drillDone);
          const unlocked = isModuleUnlocked(m.id);
          const done = isModuleComplete(m.id);
          const active = currentView === "module" && currentModuleId === m.id;
          const aced = bootcampState.aceBadges.includes(m.id);
          const mastery: MasteryLevel = row?.masteryLevel ?? "none";
          const medalColor =
            mastery === "mastered"
              ? "text-brutal-yellow"
              : mastery === "solid"
                ? "text-brutal-cyan"
                : mastery === "practicing"
                  ? "text-brutal-pink"
                  : "text-brutal-ink-trace";
          return (
            <li key={m.id}>
              <motion.button
                type="button"
                onClick={() => {
                  if (unlocked) {
                    openModule(m.id);
                    onNavigate?.();
                  }
                }}
                disabled={!unlocked}
                aria-current={active ? "page" : undefined}
                whileHover={prefersReducedMotion || !unlocked ? undefined : { x: 4 }}
                whileTap={prefersReducedMotion || !unlocked ? undefined : { scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 border-2 border-brutal-ink text-xs font-black uppercase tracking-tight transition-shadow",
                  !unlocked && "opacity-60 cursor-not-allowed",
                  active
                    ? "bg-brutal-yellow brutal-shadow translate-x-[-2px] translate-y-[-2px]"
                    : "bg-brutal-paper hover:shadow-[2px_2px_0px_0px_var(--brutal-ink)]",
                )}
              >
                {!unlocked ? (
                  <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : done ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <ProgressRing pct={pct} />
                )}
                <span className="flex-1 text-left truncate">
                  M{m.number}. {m.name}
                </span>
                {mastery !== "none" && (
                  <Medal
                    className={cn("w-3.5 h-3.5 shrink-0", medalColor)}
                    aria-label={`Mastery: ${mastery}`}
                  />
                )}
                {aced && <Star className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              </motion.button>
            </li>
          );
        })}

        <li className="pt-2">
          <NavButton
            label="Final Set"
            icon={Flag}
            active={currentView === "timed_set"}
            onClick={() => {
              setCurrentView("timed_set");
              onNavigate?.();
            }}
          />
        </li>

        <li className="pt-3">
          <button
            type="button"
            onClick={() => setRefOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft"
          >
            {refOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Reference
          </button>
          {refOpen && (
            <ul className="space-y-1 pl-2 list-none m-0">
              <li>
                <NavButton
                  small
                  label="Flashcards"
                  icon={Brain}
                  active={currentView === "flashcards"}
                  onClick={() => {
                    setCurrentView("flashcards");
                    onNavigate?.();
                  }}
                />
              </li>
              <li>
                <NavButton
                  small
                  label="Methods Library"
                  icon={Library}
                  active={currentView === "methods_library"}
                  onClick={() => {
                    setCurrentView("methods_library");
                    onNavigate?.();
                  }}
                />
              </li>
              <li>
                <NavButton
                  small
                  label="Completion Report"
                  icon={CheckCircle2}
                  active={currentView === "completion_report"}
                  onClick={() => {
                    setCurrentView("completion_report");
                    onNavigate?.();
                  }}
                />
              </li>
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  small,
}: {
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-full flex items-center gap-3 border-2 border-brutal-ink font-black uppercase tracking-tight transition-shadow",
        small ? "min-h-[40px] px-3 py-2 text-[10px]" : "min-h-[44px] px-3 py-2.5 text-xs",
        active
          ? "bg-brutal-yellow brutal-shadow translate-x-[-2px] translate-y-[-2px]"
          : "bg-brutal-paper hover:shadow-[2px_2px_0px_0px_var(--brutal-ink)]",
      )}
    >
      <Icon className={cn(small ? "w-3.5 h-3.5" : "w-4 h-4", "shrink-0")} aria-hidden="true" />
      <span className="flex-1 text-left truncate">{label}</span>
    </button>
  );
}
