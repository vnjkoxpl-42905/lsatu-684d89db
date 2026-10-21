import { useApp } from "../../store/AppContext";
import { ArrowRight, CheckCircle2, Lock, Star, Flame, Medal } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "../../lib/utils";
import { MODULES } from "../../data/modules";
import type { MasteryLevel } from "../../types";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemFx: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

export default function Dashboard() {
  const {
    bootcampState,
    openModule,
    isModuleUnlocked,
    isModuleComplete,
  } = useApp();
  const prefersReducedMotion = useReducedMotion();

  const completedCount = MODULES.filter((m) => isModuleComplete(m.id)).length;
  const overallPct = Math.round((completedCount / MODULES.length) * 100);

  // Recommended next: first module that is unlocked and not complete.
  const recommended =
    MODULES.find((m) => isModuleUnlocked(m.id) && !isModuleComplete(m.id)) ?? null;

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : container}
      initial="hidden"
      animate="show"
      className="p-6 md:p-10 max-w-4xl mx-auto"
    >
      <motion.div variants={itemFx} className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brutal-ink-soft mb-1">
          Abstract Bootcamp
        </p>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
          Welcome back.
        </h1>
        <div className="flex flex-wrap items-center gap-4 mt-5">
          <Stat label="Complete" value={`${overallPct}%`} accent="yellow" />
          <Stat
            label="XP"
            value={String(bootcampState.xpTotal)}
            icon={Star}
            accent="paper"
          />
          {bootcampState.dailyStreak > 0 && (
            <Stat
              label="Day streak"
              value={String(bootcampState.dailyStreak)}
              icon={Flame}
              accent="pink"
            />
          )}
        </div>
      </motion.div>

      {recommended && (
        <motion.div variants={itemFx} className="mb-10">
          <button
            type="button"
            onClick={() => openModule(recommended.id)}
            className="w-full text-left bg-brutal-yellow border-4 border-brutal-ink p-6 brutal-shadow-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-2">
              Continue where you left off
            </p>
            <p className="text-2xl font-black uppercase tracking-tight">
              Module {recommended.number}: {recommended.name}
            </p>
            <p className="font-bold text-brutal-ink-soft mt-2">{recommended.subtitle}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
              Open module <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </motion.div>
      )}

      <motion.div variants={itemFx}>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-brutal-ink-soft">
          The 7 Modules
        </h2>
        <ul className="space-y-3 list-none m-0 p-0">
          {MODULES.map((m) => {
            const row = bootcampState.moduleProgress[m.id];
            const noteDone = Boolean(row?.noteComplete);
            const quizPassed =
              row?.quizTotal > 0 && row.quizScore / row.quizTotal >= m.quizPassThreshold;
            const drillDone = Boolean(row?.drillComplete);
            const unlocked = isModuleUnlocked(m.id);
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
            const pct = (noteDone ? 33 : 0) + (quizPassed ? 33 : 0) + (drillDone ? 34 : 0);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => unlocked && openModule(m.id)}
                  disabled={!unlocked}
                  className={cn(
                    "w-full text-left p-5 border-4 border-brutal-ink flex items-center gap-4 transition-shadow",
                    !unlocked && "opacity-60 cursor-not-allowed",
                    drillDone
                      ? "bg-brutal-green/40"
                      : unlocked
                        ? "bg-brutal-paper hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_var(--brutal-ink)]"
                        : "bg-brutal-paper",
                  )}
                >
                  <div className="w-12 h-12 border-2 border-brutal-ink bg-brutal-bg flex items-center justify-center font-black shrink-0">
                    {!unlocked ? (
                      <Lock className="w-5 h-5" />
                    ) : drillDone ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <span className="text-lg">{m.number}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase tracking-tight truncate">{m.name}</p>
                    <p className="text-xs font-bold text-brutal-ink-soft truncate mt-0.5">
                      {m.subtitle}
                    </p>
                    <div className="mt-2 h-1.5 w-full bg-brutal-ink-trace">
                      <div
                        className="h-full bg-brutal-ink transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {mastery !== "none" && (
                    <Medal
                      className={cn("w-5 h-5 shrink-0", medalColor)}
                      aria-label={`Mastery: ${mastery}`}
                    />
                  )}
                  {aced && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-brutal-yellow border-2 border-brutal-ink px-2 py-1 shrink-0"
                      title="Aced It: perfect quiz and drill"
                    >
                      <Star className="w-3 h-3" /> Aced
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: typeof Star;
  accent: "yellow" | "paper" | "pink";
}) {
  const bg =
    accent === "yellow"
      ? "bg-brutal-yellow"
      : accent === "pink"
        ? "bg-brutal-pink"
        : "bg-brutal-paper";
  return (
    <div className={cn("border-4 border-brutal-ink px-4 py-3 brutal-shadow-sm", bg)}>
      <p className="text-[10px] font-black uppercase tracking-widest text-brutal-ink-soft mb-1">
        {label}
      </p>
      <p className="text-xl font-black inline-flex items-center gap-1">
        {Icon && <Icon className="w-4 h-4" />}
        {value}
      </p>
    </div>
  );
}
