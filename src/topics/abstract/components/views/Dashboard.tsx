import { useApp } from "../../store/AppContext";
import {
  ArrowRight,
  Play,
  PenTool,
  Brain,
  Library,
  FileText,
  Flag,
  Layers,
  Target,
  Sparkles,
} from "lucide-react";
import { LESSONS } from "../../data/mockData";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ViewState } from "../../types";
import { computeProgress, recommendNext } from "../../lib/progress";
import { cn } from "../../lib/utils";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

interface SurfaceTile {
  id: ViewState;
  label: string;
  description: string;
  icon: typeof PenTool;
  surface: string;
  key: "lessons" | "translator" | "gauntlet" | "drills" | "flashcards" | "finalSet" | null;
}

const SURFACE_TILES: SurfaceTile[] = [
  {
    id: "extraction_workspace",
    label: "Extraction Workspace",
    description: "Take an abstract answer choice apart, match its parts to the stimulus.",
    icon: PenTool,
    surface: "bg-brutal-paper",
    key: null,
  },
  {
    id: "translator_workspace",
    label: "Translator",
    description: "Plain-English the 14 abstract question stems with coach walkthroughs.",
    icon: FileText,
    surface: "bg-brutal-paper",
    key: "translator",
  },
  {
    id: "decoding_gauntlet",
    label: "Decoding Gauntlet",
    description: "15 abstract answer choices, keyword + translation + checklist for each.",
    icon: Layers,
    surface: "bg-brutal-paper",
    key: "gauntlet",
  },
  {
    id: "drill",
    label: "Targeted Drills",
    description: "Filterable role, method, flaw, and one-word-trap reps with response time.",
    icon: Target,
    surface: "bg-brutal-paper",
    key: "drills",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Spaced review with Again, Hard, Good, Easy ratings.",
    icon: Brain,
    surface: "bg-brutal-paper",
    key: "flashcards",
  },
  {
    id: "methods_library",
    label: "Methods Library",
    description: "Reference all reasoning patterns and question stems.",
    icon: Library,
    surface: "bg-brutal-paper",
    key: null,
  },
];

export default function Dashboard() {
  const { bootcampState, setCurrentView } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const progress = computeProgress(bootcampState);
  const next = recommendNext(progress);

  const lessonsDone = bootcampState.completedLessons.length;
  const isReturning = lessonsDone > 0;
  const nextLessonId = LESSONS.find((l) => !bootcampState.completedLessons.includes(l.id))?.id;
  const nextLessonTitle = LESSONS.find((l) => l.id === nextLessonId)?.title ?? "Continue training";

  const motionProps = prefersReducedMotion
    ? { initial: false }
    : { initial: "hidden", animate: "show", variants: container };

  return (
    <motion.div {...motionProps} className="space-y-10 sm:space-y-14 z-10 relative pb-16">
      <motion.header variants={prefersReducedMotion ? undefined : item} className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-block bg-brutal-yellow px-3 py-1 border-2 border-brutal-ink brutal-shadow-sm text-[11px] font-black uppercase tracking-[0.2em]">
            {isReturning ? "Pick up where you left off" : "Bootcamp"}
          </span>
          <span className="inline-flex items-center gap-2 bg-brutal-ink text-brutal-paper border-2 border-brutal-ink px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {progress.overallPct}% complete
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-brutal-ink leading-[0.95] uppercase">
          Abstract <br className="hidden sm:block" />
          Reasoning <span className="text-brutal-red italic">Bootcamp</span>
        </h1>
        <p className="text-base sm:text-lg font-bold text-brutal-ink max-w-2xl leading-snug">
          Decode abstract LSAT answer choices by extracting keywords, translating them into plain English, and matching each description against the argument.
        </p>
      </motion.header>

      <motion.section
        variants={prefersReducedMotion ? undefined : item}
        aria-labelledby="dash-resume-heading"
        className="bg-brutal-yellow border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-10 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">
              {isReturning ? "Next lesson" : "Start here"}
            </span>
            <h2 id="dash-resume-heading" className="text-2xl sm:text-3xl md:text-4xl font-black text-brutal-ink leading-tight uppercase italic">
              {isReturning ? nextLessonTitle : "Why Abstract Answer Choices Feel Hard"}
            </h2>
            <p className="text-base font-bold text-brutal-ink/85 leading-snug">
              {isReturning
                ? "Keep building the S + K method. Translate abstract language into concrete claims."
                : "Start with the fundamentals. Learn why abstract answer choices break down even the best test-takers."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView("lesson")}
            className="self-start md:self-end inline-flex items-center gap-3 px-6 sm:px-8 py-4 sm:py-5 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black text-base sm:text-lg uppercase tracking-widest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform min-h-[44px]"
          >
            <Play className="w-5 h-5 fill-current" aria-hidden="true" />
            {isReturning ? "Continue training" : "Start bootcamp"}
          </button>
        </div>
      </motion.section>

      <motion.section
        variants={prefersReducedMotion ? undefined : item}
        aria-labelledby="dash-recommend-heading"
        className="bg-brutal-pink border-4 border-brutal-ink brutal-shadow p-5 sm:p-7 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink">
            Recommended next
          </span>
          <h2 id="dash-recommend-heading" className="text-xl sm:text-2xl font-black text-brutal-ink uppercase italic tracking-tight">
            {next.label}
          </h2>
          <p className="text-sm font-bold text-brutal-ink leading-snug">{next.blurb}</p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentView(next.view)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black uppercase tracking-widest text-xs sm:text-sm shrink-0 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform"
        >
          Open
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </motion.section>

      <motion.section
        variants={prefersReducedMotion ? undefined : item}
        aria-labelledby="dash-progress-heading"
        className="border-t-4 border-brutal-ink pt-8 space-y-6"
      >
        <h2
          id="dash-progress-heading"
          className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-brutal-ink"
        >
          Surface progress
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 text-brutal-ink">
          <ProgressStat label="Lessons" pct={progress.lessons.pct} done={progress.lessons.done} total={progress.lessons.total} />
          <ProgressStat label="Translator" pct={progress.translator.pct} done={progress.translator.done} total={progress.translator.total} />
          <ProgressStat label="Gauntlet" pct={progress.gauntlet.pct} done={progress.gauntlet.done} total={progress.gauntlet.total} />
          <ProgressStat label="Drills" pct={progress.drills.pct} done={progress.drills.done} total={progress.drills.total} />
          <ProgressStat label="Flashcards" pct={progress.flashcards.pct} done={progress.flashcards.done} total={progress.flashcards.total} />
          <ProgressStat
            label="Final set"
            pct={progress.finalSet.pct}
            done={progress.finalSet.done}
            total={progress.finalSet.total}
            display={
              bootcampState.finalSetScore
                ? `${bootcampState.finalSetScore.score}/${bootcampState.finalSetScore.total}`
                : null
            }
          />
        </dl>
      </motion.section>

      <motion.section
        variants={prefersReducedMotion ? undefined : item}
        aria-labelledby="dash-surfaces-heading"
        className="space-y-5"
      >
        <h2 id="dash-surfaces-heading" className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
          Tools at hand
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none m-0 p-0">
          {SURFACE_TILES.map((tile) => {
            const Icon = tile.icon;
            const tilePct = tile.key ? progress[tile.key].pct : null;
            return (
              <li key={tile.id}>
                <button
                  type="button"
                  onClick={() => setCurrentView(tile.id)}
                  className={`${tile.surface} group w-full h-full min-h-[44px] text-left p-6 sm:p-7 border-4 border-brutal-ink brutal-shadow hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[10px_10px_0px_0px_var(--brutal-ink)] transition-transform flex flex-col gap-4`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 bg-brutal-ink text-brutal-paper border-2 border-brutal-ink flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                      {tile.label}
                    </h3>
                  </div>
                  <p className="text-sm font-bold text-brutal-ink-soft leading-snug">
                    {tile.description}
                  </p>
                  {tilePct !== null && (
                    <div className="mt-auto">
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={tilePct}
                        aria-label={`${tile.label} progress: ${tilePct}%`}
                        className="w-full h-2 bg-brutal-bg border-2 border-brutal-ink"
                      >
                        <div
                          className={cn(
                            "h-full",
                            tilePct === 100 ? "bg-brutal-green" : "bg-brutal-ink",
                          )}
                          style={{ width: `${tilePct}%` }}
                        />
                      </div>
                      <span className="block mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
                        {tilePct}% complete
                      </span>
                    </div>
                  )}
                  <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink pt-1">
                    Open
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </motion.section>

      <motion.section
        variants={prefersReducedMotion ? undefined : item}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-t-4 border-brutal-ink pt-6"
      >
        <Flag className="w-6 h-6 text-brutal-ink-soft hidden sm:block" aria-hidden="true" />
        <p className="text-sm sm:text-base font-bold text-brutal-ink-soft leading-snug flex-1">
          Finish the bootcamp by clearing the final timed set. It mirrors a real LSAT section and locks in your completion report.
        </p>
        <button
          type="button"
          onClick={() => setCurrentView("timed_set")}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brutal-paper border-4 border-brutal-ink text-sm font-black uppercase tracking-[0.15em] brutal-shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)] transition-transform min-h-[44px]"
        >
          <Flag className="w-4 h-4" aria-hidden="true" />
          Open final set
        </button>
      </motion.section>
    </motion.div>
  );
}

interface ProgressStatProps {
  label: string;
  pct: number;
  done: number;
  total: number;
  display?: string | null;
}

function ProgressStat({ label, pct, done, total, display }: ProgressStatProps) {
  return (
    <div className="space-y-1.5">
      <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
        {label}
      </dt>
      <dd className="text-2xl sm:text-3xl font-black tracking-tighter text-brutal-ink">
        {display ?? (
          <>
            {done}
            <span className="text-brutal-ink-faint text-lg">/{total}</span>
          </>
        )}
      </dd>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${label} progress: ${pct}%`}
        className="w-full h-1.5 bg-brutal-bg border border-brutal-ink"
      >
        <div
          className={cn(
            "h-full",
            pct === 100 ? "bg-brutal-green" : "bg-brutal-ink",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
