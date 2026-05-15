import { useApp } from "../../store/AppContext";
import { BookOpen, Target, ArrowRight, Play, PenTool, Brain, Library, FileText, Flag } from "lucide-react";
import { LESSONS } from "../../data/mockData";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ViewState, CardReview } from "../../types";

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

// Asymmetric tile sizing escapes the identical-card-grid trap. The primary
// next-step claims one wide row, secondary tools sit at half width below.
type DashTile = {
  id: ViewState;
  label: string;
  description: string;
  icon: typeof PenTool;
  span: "wide" | "half";
  // Tile background. Yellow is reserved for the active resume tile per the
  // One-Voice rule mirrored from the Intro to LR DESIGN.md.
  surface: string;
};

const SECONDARY_TILES: DashTile[] = [
  {
    id: "extraction_workspace",
    label: "Extraction Workspace",
    description: "Take an abstract answer choice apart, match its parts to the stimulus.",
    icon: PenTool,
    span: "half",
    surface: "bg-brutal-paper",
  },
  {
    id: "translator_workspace",
    label: "Translator",
    description: "Plain-English an abstract phrase, get coach feedback.",
    icon: FileText,
    span: "half",
    surface: "bg-brutal-paper",
  },
  {
    id: "methods_library",
    label: "Methods Library",
    description: "Reference all 17 reasoning patterns and 14 question stems.",
    icon: Library,
    span: "half",
    surface: "bg-brutal-paper",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Self-test on key terms, stems, and distinctions.",
    icon: Brain,
    span: "half",
    surface: "bg-brutal-paper",
  },
];

export default function Dashboard() {
  const { bootcampState, setCurrentView } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const lessonsDone = bootcampState.completedLessons.length;
  const drillsDone = bootcampState.completedDrills.length;
  const cardsReviewed = Object.values(bootcampState.cards as Record<string, CardReview>)
    .filter((c) => c.status !== "unseen").length;
  const totalLessons = LESSONS.length;
  const isReturning = lessonsDone > 0;
  const nextLessonId = LESSONS.find((l) => !bootcampState.completedLessons.includes(l.id))?.id;
  const nextLessonTitle = LESSONS.find((l) => l.id === nextLessonId)?.title ?? "Continue training";

  const motionProps = prefersReducedMotion
    ? { initial: false }
    : { initial: "hidden", animate: "show", variants: container };

  return (
    <motion.div {...motionProps} className="space-y-10 sm:space-y-14 z-10 relative pb-16">
      <motion.header variants={prefersReducedMotion ? undefined : item} className="space-y-5">
        <span className="inline-block bg-brutal-yellow px-3 py-1 border-2 border-brutal-ink brutal-shadow-sm text-[11px] font-black uppercase tracking-[0.2em]">
          {isReturning ? "Pick up where you left off" : "Bootcamp"}
        </span>
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
        aria-labelledby="dash-progress-heading"
        className="border-t-4 border-brutal-ink pt-8"
      >
        <h2 id="dash-progress-heading" className="sr-only">
          Your progress so far
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-brutal-ink">
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
              Lessons
            </dt>
            <dd className="text-3xl sm:text-4xl font-black tracking-tighter">
              {lessonsDone}
              <span className="text-brutal-ink-faint text-xl">/{totalLessons}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
              Drills logged
            </dt>
            <dd className="text-3xl sm:text-4xl font-black tracking-tighter">{drillsDone}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
              Cards reviewed
            </dt>
            <dd className="text-3xl sm:text-4xl font-black tracking-tighter">{cardsReviewed}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
              Translator
            </dt>
            <dd className="text-3xl sm:text-4xl font-black tracking-tighter">
              {new Set(bootcampState.translatorAttempts.map((a) => a.stemNumber)).size}
              <span className="text-brutal-ink-faint text-xl">/14</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
              Final set
            </dt>
            <dd className="text-3xl sm:text-4xl font-black tracking-tighter">
              {bootcampState.finalSetScore
                ? `${bootcampState.finalSetScore.score}/${bootcampState.finalSetScore.total}`
                : "··"}
            </dd>
          </div>
        </dl>
      </motion.section>

      <motion.section
        variants={prefersReducedMotion ? undefined : item}
        aria-labelledby="dash-secondary-heading"
        className="space-y-5"
      >
        <div className="flex items-end justify-between gap-6">
          <h2 id="dash-secondary-heading" className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
            Tools at hand
          </h2>
          <button
            type="button"
            onClick={() => setCurrentView("drill")}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-brutal-ink hover:underline underline-offset-4 min-h-[44px] px-1"
          >
            <Target className="w-4 h-4" aria-hidden="true" />
            Jump to drills
          </button>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 list-none m-0 p-0">
          {SECONDARY_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <li key={tile.id}>
                <button
                  type="button"
                  onClick={() => setCurrentView(tile.id)}
                  className={`${tile.surface} group w-full h-full min-h-[44px] text-left p-6 sm:p-7 border-4 border-brutal-ink brutal-shadow hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[10px_10px_0px_0px_var(--brutal-ink)] transition-transform flex flex-col gap-5`}
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
                  <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink mt-auto pt-2">
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
        <BookOpen className="w-6 h-6 text-brutal-ink-soft hidden sm:block" aria-hidden="true" />
        <p className="text-sm sm:text-base font-bold text-brutal-ink-soft leading-snug flex-1">
          When you finish all eight lessons, the Final Timed Set unlocks a five-question simulation that mirrors a real LSAT section.
        </p>
        <button
          type="button"
          onClick={() => setCurrentView("timed_set")}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brutal-paper border-4 border-brutal-ink text-sm font-black uppercase tracking-[0.15em] brutal-shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)] transition-transform min-h-[44px]"
        >
          <Flag className="w-4 h-4" aria-hidden="true" />
          Preview final set
        </button>
      </motion.section>
    </motion.div>
  );
}
