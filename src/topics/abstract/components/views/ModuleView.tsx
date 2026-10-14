import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Lock,
  BookOpen,
  ListChecks,
  Target,
  ArrowRight,
  ArrowLeft,
  Flame,
  Star,
  Trophy,
  Award,
  Medal,
  Lightbulb,
  HelpCircle,
  Pause,
  Play,
} from "lucide-react";
import confetti from "canvas-confetti";
import { computeMastery } from "../../lib/mastery";
import { sourceExerciseIds } from "../../lib/grading-status";
import { restoreDrillPosition } from "../../lib/drill-resume";
import { emptyQuizSession, loadQuizSession, quizSessionKey, saveQuizSession } from "../../lib/quiz-session";
import { useAuth } from "@/contexts/AuthContext";
import type { MasteryLevel } from "../../types";
import { useApp } from "../../store/AppContext";
import { cn } from "../../lib/utils";
import {
  MODULES,
  LECTURE_MODULES,
  type ModuleId,
  type ModulePart,
  type QuizSource,
  getModule,
} from "../../data/modules";
import { LESSONS } from "../../data/lessons";
import LessonBody from "./LessonBody";
import { TermText } from "./LSATTermCard";
import { DRILLS } from "../../data/drills";
import { TRANSLATOR_QUIZ_ITEMS } from "../../data/translatorItems";
import { MATCHING_ITEMS } from "../../data/matchingItems";
import { GAUNTLET_QUIZ_ITEMS } from "../../data/abstractChoices";
import BreakdownDrill from "./BreakdownDrill";
import AnswerChoiceDrill, { AnswerChoiceSteps } from "./AnswerChoiceDrill";
import { RoleChoiceClosing } from "./RoleChoiceLecture";
import { WHY_HARD_ITEMS } from "../../data/whyHardItems";
import { TERM_QUIZ_ITEMS } from "../../data/termQuizItems";
import { METHOD_QUIZ_ITEMS } from "../../data/methodQuizItems";
import { TRAP_ITEMS, TRAP_OPTION_TEXT } from "../../data/trapItems";
import type { DrillItem, DrillType } from "../../types";

type Stage = "overview" | "note" | "steps" | "quiz" | "drill" | "complete";

export default function ModuleView() {
  const { currentModuleId, setCurrentView, isModuleUnlocked } = useApp();
  const [stage, setStage] = useState<Stage>("overview");
  const moduleRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setStage("overview"); }, [currentModuleId]);
  useEffect(() => { moduleRef.current?.scrollIntoView({ block: "start" }); }, [stage]);

  if (!currentModuleId) {
    return (
      <div className="p-8">
        <button
          type="button"
          onClick={() => setCurrentView("dashboard")}
          className="brutal-btn"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const mod = getModule(currentModuleId);
  if (!mod) return null;

  if (!isModuleUnlocked(currentModuleId)) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setCurrentView("dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <div className="bg-brutal-paper border-4 border-brutal-ink p-8 brutal-shadow">
          <Lock className="w-8 h-8 mb-4" />
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
            Module {mod.number}: {mod.name}
          </h1>
          <p className="font-bold text-brutal-ink-soft">
            Locked. Finish the previous module to unlock this one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={moduleRef} className="p-6 md:p-10 max-w-3xl mx-auto scroll-mt-24">
      <button
        type="button"
        onClick={() => {
          if (stage === "overview") setCurrentView("dashboard");
          else setStage("overview");
        }}
        className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> {stage === "overview" ? "Dashboard" : `Module ${mod.number}`}
      </button>

      <AnimatePresence mode="wait">
        {stage === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ModuleOverview moduleId={currentModuleId} onPick={(next) => setStage(next === "drill" && mod.drillKind === "answer-choice" ? "steps" : next)} />
          </motion.div>
        )}
        {stage === "note" && (
          <motion.div
            key="note"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ModuleNote
              moduleId={currentModuleId}
              onDone={() => setStage("overview")}
              onStartQuiz={() => setStage(mod.quizSource ? "quiz" : mod.drillKind === "answer-choice" ? "steps" : "drill")}
            />
          </motion.div>
        )}
        {stage === "steps" && (
          <motion.div key="steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnswerChoiceSteps onStart={() => setStage("drill")} />
          </motion.div>
        )}
        {stage === "quiz" && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ModuleQuiz moduleId={currentModuleId} onDone={() => setStage("overview")} />
          </motion.div>
        )}
        {stage === "drill" && (
          <motion.div
            key="drill"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ModuleDrill moduleId={currentModuleId} onDone={() => setStage("complete")} />
          </motion.div>
        )}
        {stage === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ModuleComplete moduleId={currentModuleId} onContinue={() => setStage("overview")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Overview (3-row) ============

function ModuleOverview({
  moduleId,
  onPick,
}: {
  moduleId: ModuleId;
  onPick: (stage: Stage) => void;
}) {
  const { bootcampState, isPartUnlocked, isModuleComplete } = useApp();
  const { user } = useAuth();
  const mod = getModule(moduleId)!;
  const row = bootcampState.moduleProgress[moduleId];
  const noteDone = Boolean(row?.noteComplete);
  const quizDone = row?.quizTotal > 0 && row.quizScore / row.quizTotal >= mod.quizPassThreshold;
  const sourceWork = sourceExerciseIds(bootcampState.drillAttempts);
  const drillDone = isModuleComplete(moduleId);
  const quizSession = loadQuizSession(quizSessionKey(user?.id ?? null, moduleId), mod.quizSource ? quizItemCount(mod.quizSource) : 0);
  const quizStarted = quizSession.index > 0 || quizSession.answered;
  const drillStarted = bootcampState.drillAttempts.some((attempt) => mod.drillIds.includes(attempt.drillId));
  const mastery: MasteryLevel = ["m3", "m5", "m6", "m7"].includes(moduleId) ? computeMastery(row) : row?.masteryLevel ?? "none";

  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brutal-ink-soft mb-1">
          Module {mod.number}
        </p>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight">
          {mod.name}
        </h1>
        <p className="font-bold text-brutal-ink-soft mt-3">{mod.subtitle}</p>
        {mastery !== "none" && (
          <div className="mt-3">
            <MasteryBadge level={mastery} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <PartRow
          icon={BookOpen}
          label="Note"
          meta="Read the lesson"
          status={noteDone ? "done" : isPartUnlocked(moduleId, "note") ? "active" : "locked"}
          accent="cyan"
          onOpen={() => onPick("note")}
          ctaLabel={noteDone ? "Re-read" : "Start"}
        />
        {mod.quizSource && <PartRow
          icon={ListChecks}
          label="Quiz"
          meta={
            row?.quizTotal
              ? `${row.quizScore} of ${row.quizTotal} correct`
              : `${quizItemCount(mod.quizSource)} items`
          }
          status={quizDone ? "done" : isPartUnlocked(moduleId, "quiz") ? "active" : "locked"}
          lockedHint="Read the note to unlock."
          accent="yellow"
          onOpen={() => onPick("quiz")}
          ctaLabel={quizStarted ? "Resume" : quizDone ? "Retake" : "Start"}
        />}
        <PartRow
          icon={Target}
          label="Drill"
          meta={
            mod.drillKind === "answer-choice"
              ? `${mod.drillIds.length} answer choices`
              : mod.drillKind === "breakdown"
              ? `${mod.drillIds.length} breakdown items`
              : `${mod.drillIds.length} practice question${mod.drillIds.length === 1 ? "" : "s"}`
          }
          status={drillDone ? "done" : isPartUnlocked(moduleId, "drill") ? "active" : "locked"}
          lockedHint={mod.quizSource ? `Pass the quiz at ${Math.round(mod.quizPassThreshold * 100)}% to unlock.` : "Read the note to unlock."}
          accent="pink"
          onOpen={() => onPick("drill")}
          ctaLabel={drillDone ? "Retake" : drillStarted ? "Resume" : "Start"}
        />
      </div>
    </>
  );
}

function PartRow({
  icon: Icon,
  label,
  meta,
  status,
  lockedHint,
  accent,
  onOpen,
  ctaLabel,
}: {
  icon: typeof BookOpen;
  label: string;
  meta: string;
  status: "done" | "active" | "locked";
  lockedHint?: string;
  accent: "cyan" | "yellow" | "pink";
  onOpen: () => void;
  ctaLabel: string;
}) {
  const accentBg =
    accent === "cyan" ? "bg-brutal-cyan" : accent === "yellow" ? "bg-brutal-yellow" : "bg-brutal-pink";
  if (status === "done") {
    return (
      <div className="bg-brutal-paper border-4 border-brutal-ink p-4 flex items-center gap-4">
        <CheckCircle2 className="w-6 h-6 shrink-0" />
        <div className="flex-1">
          <p className="font-black uppercase tracking-tight">{label}</p>
          <p className="text-xs font-bold text-brutal-ink-soft">{meta}</p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-black uppercase tracking-wider underline"
        >
          {ctaLabel}
        </button>
      </div>
    );
  }
  if (status === "locked") {
    return (
      <div className="bg-brutal-paper border-4 border-brutal-ink-trace p-6 flex items-center gap-4 opacity-70">
        <Lock className="w-6 h-6 shrink-0" />
        <div className="flex-1">
          <p className="font-black uppercase tracking-tight">{label}</p>
          <p className="text-xs font-bold text-brutal-ink-soft">{lockedHint ?? "Locked"}</p>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full text-left p-6 border-4 border-brutal-ink brutal-shadow transition-shadow",
        accentBg,
        "hover:translate-x-[-2px] hover:translate-y-[-2px]",
      )}
    >
      <div className="flex items-center gap-4">
        <Icon className="w-8 h-8 shrink-0" />
        <div className="flex-1">
          <p className="text-2xl font-black uppercase tracking-tight">{label}</p>
          <p className="text-sm font-bold text-brutal-ink-soft mt-1">{meta}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
          {ctaLabel} <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}

function quizItemCount(source: QuizSource): number {
  switch (source) {
    case "whyHardItems":
      return WHY_HARD_ITEMS.length;
    case "termQuizItems":
      return TERM_QUIZ_ITEMS.length;
    case "translatorItems":
      return TRANSLATOR_QUIZ_ITEMS.length;
    case "matchingItems":
      return MATCHING_ITEMS.length;
    case "methodQuizItems":
      return METHOD_QUIZ_ITEMS.length;
    case "trapItems":
      return TRAP_ITEMS.length;
    case "abstractChoices":
      return GAUNTLET_QUIZ_ITEMS.length;
  }
}

// ============ Note ============

function ModuleNote({
  moduleId,
  onDone,
  onStartQuiz,
}: {
  moduleId: ModuleId;
  onDone: () => void;
  onStartQuiz: () => void;
}) {
  const { markNoteRead, bootcampState } = useApp();
  const mod = getModule(moduleId)!;
  const lesson = LESSONS.find((l) => l.id === mod.noteLessonId);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [marked, setMarked] = useState(
    Boolean(bootcampState.moduleProgress[moduleId]?.noteComplete),
  );
  const [pulse, setPulse] = useState(false);

  // Read-aware enable: watch a sentinel placed right after the lesson
  // body. The button activates once the sentinel comes into view inside
  // the scrolling ancestor (AppShell's main area). Walking up the DOM to
  // find the scroll container lets us use IntersectionObserver with that
  // ancestor as root, which behaves correctly when the page itself
  // scrolls rather than the lesson card.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    let parent: HTMLElement | null = el.parentElement;
    let root: HTMLElement | null = null;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        root = parent;
        break;
      }
      parent = parent.parentElement;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setReachedEnd((prev) => {
              if (!prev) {
                setPulse(true);
                setTimeout(() => setPulse(false), 800);
              }
              return true;
            });
          }
        }
      },
      { root, rootMargin: "0px 0px -120px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const onMark = async () => {
    await markNoteRead(moduleId);
    setMarked(true);
  };

  return (
    <div>
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
        Note: {["m4", "m5", "m6", "m7"].includes(moduleId) ? mod.name : lesson?.title ?? mod.name}
      </h2>
      <p className="font-bold text-brutal-ink-soft mb-6">{mod.subtitle}</p>

      <div className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow mb-6">
        <div className="px-6 md:px-10 py-8 md:py-12">
          <LessonBody lessonId={mod.noteLessonId} />
        </div>
      </div>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

      <AnimatePresence mode="wait">
        {!marked ? (
          <motion.div
            key="read-row"
            initial={false}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 flex-wrap"
          >
            <button
              type="button"
              onClick={onMark}
              className={cn(
                "brutal-btn inline-flex items-center gap-2 bg-brutal-green",
                pulse && "animate-pulse",
              )}
              title="Mark this note as read"
            >
              <CheckCircle2 className="w-4 h-4" /> I read this
            </button>
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest bg-brutal-yellow border-2 border-brutal-ink px-3 py-1.5"
            >
              {reachedEnd ? "Ready" : "Click when done"}
            </motion.span>
          </motion.div>
        ) : (
          <motion.div
            key="quiz-cta"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 flex-wrap"
          >
            <button
              type="button"
              onClick={onStartQuiz}
              className="brutal-btn bg-brutal-green inline-flex items-center gap-2"
            >
              {mod.quizSource ? "Start quiz" : mod.drillKind === "answer-choice" ? "Read the seven steps" : "Try the worked question"} <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-brutal-ink-soft">
              {mod.quizSource ? "Quiz unlocked" : "Practice unlocked"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Quiz ============

type QuizVerdict = "correct" | "partial" | "incorrect";

export function ModuleQuiz({ moduleId, onDone }: { moduleId: ModuleId; onDone: () => void }) {
  const { recordQuizScore, addXp, loading, progressOwnerId } = useApp();
  const { user } = useAuth();
  const owner = user?.id ?? null;
  const sessionKey = quizSessionKey(owner, moduleId);
  const activeSessionKey = useRef(sessionKey);
  activeSessionKey.current = sessionKey;
  const mod = getModule(moduleId)!;
  const items = useMemo(() => loadQuizItems(mod.quizSource), [mod.quizSource]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0); // can be fractional via partial credit
  const [streak, setStreak] = useState(0);
  const [streakHigh, setStreakHigh] = useState(0);
  const [finished, setFinished] = useState(false);
  const [restoredAnswer, setRestoredAnswer] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const initialized = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (loading || progressOwnerId !== owner || initialized.current === sessionKey) return;
    const saved = loadQuizSession(sessionKey, items.length);
    setIndex(saved.index); setScore(saved.score); setStreak(saved.streak); setStreakHigh(saved.streakHigh);
    setRestoredAnswer(saved.answered); setFinished(false);
    initialized.current = sessionKey; setReady(true);
  }, [loading, progressOwnerId, owner, sessionKey, items.length]);

  if (loading || progressOwnerId !== owner || !ready || initialized.current !== sessionKey) return <p role="status">Loading your saved quiz...</p>;

  if (finished) {
    const passed = items.length > 0 && score / items.length >= mod.quizPassThreshold;
    const displayScore = Number.isInteger(score) ? score : score.toFixed(1);
    return (
      <div className="text-center">
        <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Quiz complete</h2>
        <div className="inline-block bg-brutal-yellow border-4 border-brutal-ink p-6 brutal-shadow mb-6">
          <p className="text-6xl font-black">
            {displayScore} / {items.length}
          </p>
          <p className="text-xs font-black uppercase tracking-widest mt-2">Correct</p>
        </div>
        {streakHigh >= 3 && (
          <p className="font-bold mb-4 inline-flex items-center gap-2">
            <Flame className="w-4 h-4" /> Best run: {streakHigh} in a row
          </p>
        )}
        <p className="font-bold mb-6">
          {passed ? "Drill unlocked. Nice. Next." : `Need ${Math.round(mod.quizPassThreshold * 100)}% to unlock the drill. Retake when ready.`}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="brutal-btn bg-brutal-green inline-flex items-center gap-2"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const onAnswer = (verdictOrCorrect: boolean | QuizVerdict) => {
    const verdict: QuizVerdict =
      typeof verdictOrCorrect === "boolean"
        ? verdictOrCorrect
          ? "correct"
          : "incorrect"
        : verdictOrCorrect;
    const nextScore = score + (verdict === "correct" ? 1 : verdict === "partial" ? 0.5 : 0);
    const nextStreak = verdict === "correct" ? streak + 1 : 0;
    const nextHigh = Math.max(streakHigh, nextStreak);
    setStorageError(!saveQuizSession(sessionKey, { index, score: nextScore, streak: nextStreak, streakHigh: nextHigh, answered: true }));
    if (verdict === "correct") {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setStreakHigh((h) => Math.max(h, next));
        return next;
      });
      addXp(1);
    } else if (verdict === "partial") {
      setScore((s) => s + 0.5);
      setStreak(0);
    } else {
      setStreak(0);
    }
  };

  const onNext = async () => {
    if (index + 1 >= items.length) {
      if (savingQuiz) return;
      setSavingQuiz(true);
      const result = await recordQuizScore(moduleId, Math.round(score), items.length, streakHigh);
      if (activeSessionKey.current !== sessionKey) return;
      setSavingQuiz(false);
      if (!result.ok) { setSaveError(true); return; }
      setSaveError(false);
      setFinished(true);
      setStorageError(!saveQuizSession(sessionKey, emptyQuizSession()));
    } else {
      setStorageError(!saveQuizSession(sessionKey, { index: index + 1, score, streak, streakHigh, answered: false }));
      setRestoredAnswer(false);
      setIndex((i) => i + 1);
    }
  };

  const progressPct = ((index) / items.length) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-brutal-ink-soft">
              Item {index + 1} of {items.length}
            </p>
            <KeyboardHelp />
          </div>
          <div className="h-2 bg-brutal-ink-trace border border-brutal-ink">
            <div
              className="h-full bg-brutal-ink transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        {streak >= 3 && (
          <p className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider shrink-0">
            <Flame className="w-4 h-4" /> {streak}
          </p>
        )}
      </div>
      <p className="text-sm mb-3" role={storageError ? "alert" : undefined}>{storageError ? "Your quiz place could not be saved on this browser. Keep this page open." : "Your quiz place and score are saved as you answer."}</p>
      {saveError && <p role="alert">Your quiz result could not be saved. Try Continue again.</p>}
      {restoredAnswer ? <div className="bg-brutal-paper border-2 border-brutal-ink p-6"><p className="font-bold mb-4">Your answer to this item is saved and included in your score.</p><button disabled={savingQuiz} className="brutal-btn" onClick={() => void onNext()}>Continue</button></div> : <QuizItemRenderer
        key={index}
        source={mod.quizSource}
        item={items[index]}
        onAnswer={onAnswer}
        onNext={onNext}
      />}
    </div>
  );
}

function KeyboardHelp() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button
        type="button"
        aria-label="Keyboard shortcuts"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-brutal-ink-soft hover:text-brutal-ink"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <span className="absolute right-0 top-full mt-1 w-60 bg-brutal-paper border-2 border-brutal-ink p-3 z-50 text-left text-xs font-bold normal-case tracking-normal pointer-events-none">
          <span className="block text-[10px] font-black uppercase tracking-widest mb-1.5">
            Keyboard
          </span>
          <span className="block">1 - 5: pick option</span>
          <span className="block">Enter: submit</span>
          <span className="block">Space: next</span>
        </span>
      )}
    </span>
  );
}

function loadQuizItems(source: QuizSource): unknown[] {
  switch (source) {
    case "whyHardItems":
      return WHY_HARD_ITEMS;
    case "termQuizItems":
      return TERM_QUIZ_ITEMS;
    case "translatorItems":
      return TRANSLATOR_QUIZ_ITEMS;
    case "matchingItems":
      return MATCHING_ITEMS;
    case "methodQuizItems":
      return METHOD_QUIZ_ITEMS;
    case "trapItems":
      return TRAP_ITEMS;
    case "abstractChoices":
      return GAUNTLET_QUIZ_ITEMS;
  }
}

function QuizItemRenderer({
  source,
  item,
  onAnswer,
  onNext,
}: {
  source: QuizSource;
  item: unknown;
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  switch (source) {
    case "whyHardItems":
      return <WhyHardRenderer item={item as typeof WHY_HARD_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "termQuizItems":
      return <TermQuizRenderer item={item as typeof TERM_QUIZ_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "translatorItems":
      return <KeywordExtractionRenderer item={item as typeof TRANSLATOR_QUIZ_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "matchingItems":
      return <MatchToStimulusRenderer item={item as typeof MATCHING_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "methodQuizItems":
      return <MethodPickerRenderer item={item as typeof METHOD_QUIZ_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "trapItems":
      return <TrapSpotterRenderer item={item as typeof TRAP_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "abstractChoices":
      return <DecodingGauntletRenderer item={item as typeof GAUNTLET_QUIZ_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
  }
}

// Generic single-column MC renderer used by most quiz sources.
function MultipleChoiceCard({
  prompt,
  context,
  options,
  correctIndex,
  explanation,
  optionExplanations,
  onAnswer,
  onNext,
}: {
  prompt: string;
  context?: React.ReactNode;
  options: string[];
  correctIndex: number;
  explanation: string;
  optionExplanations?: string[];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  const { autoAdvance } = useApp();
  const [picked, setPicked] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [paused, setPaused] = useState(false);
  const submitted = picked !== null;
  const wasCorrect = picked === correctIndex;

  useEffect(() => {
    if (submitted) return;
    const t = setTimeout(() => setShowHint(true), 30000);
    return () => clearTimeout(t);
  }, [submitted]);

  const pick = (i: number) => {
    if (submitted) return;
    if (eliminated.has(i)) return;
    setPicked(i);
    const isCorrect = i === correctIndex;
    const verdict: QuizVerdict = hintUsed
      ? (isCorrect ? "partial" : "incorrect")
      : (isCorrect ? "correct" : "incorrect");
    onAnswer(verdict);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!submitted) {
        const n = parseInt(e.key, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= options.length) {
          e.preventDefault();
          pick(n - 1);
        }
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, options.length]);

  useEffect(() => {
    if (!submitted || !wasCorrect || !autoAdvance || paused) return;
    const t = setTimeout(onNext, 1200);
    return () => clearTimeout(t);
  }, [submitted, wasCorrect, autoAdvance, paused, onNext]);

  const useHint = () => {
    setHintUsed(true);
    setShowHint(false);
    for (let i = 0; i < options.length; i++) {
      if (i !== correctIndex && !eliminated.has(i)) {
        setEliminated(new Set([...eliminated, i]));
        break;
      }
    }
  };

  return (
    <div className="bg-brutal-paper border-4 border-brutal-ink p-6 brutal-shadow">
      {context && <div className="mb-5">{context}</div>}
      <p className="font-black mb-4">{prompt}</p>
      <ul className="space-y-3 list-none m-0 p-0">
        {options.map((opt, i) => {
          const isCorrect = i === correctIndex;
          const isPicked = picked === i;
          const isEliminated = eliminated.has(i);
          const tone = !submitted
            ? isEliminated
              ? "bg-white opacity-30 line-through"
              : "bg-white hover:bg-brutal-yellow/30"
            : isCorrect
              ? "bg-brutal-green"
              : isPicked
                ? "bg-brutal-red text-brutal-paper"
                : "bg-white opacity-60";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={submitted || isEliminated}
                onClick={() => pick(i)}
                className={cn(
                  "w-full text-left p-4 border-2 border-brutal-ink font-bold transition-colors",
                  tone,
                )}
              >
                <span className="text-brutal-ink-soft mr-2 text-xs">{i + 1}.</span>
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {!submitted && showHint && (
        <button
          type="button"
          onClick={useHint}
          className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-brutal-yellow border-2 border-brutal-ink px-3 py-2"
        >
          <Lightbulb className="w-3.5 h-3.5" /> Need a hint?
        </button>
      )}
      {submitted && (
        <div className="mt-5 bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
          {/*
            The verdict in words. Its two siblings in this file
            (KeywordExtractionRenderer, DecodingGauntletRenderer) both render this
            and this one did not, so the only signal that you got it wrong was
            brutal-green vs brutal-red fill — a pair that is not separable under
            deuteranopia. The "Why" copy below explains the answer but never says
            whether you got it.
          */}
          <div className="mb-3">
            <VerdictHeader
              verdict={
                picked === correctIndex ? (hintUsed ? "partial" : "correct") : "incorrect"
              }
            />
          </div>
          <p className="text-xs font-black uppercase tracking-widest mb-2">Why</p>
          {picked !== null && picked !== correctIndex && optionExplanations?.[picked] && (
            <p className="font-bold mb-2">{optionExplanations[picked]}</p>
          )}
          <p className="font-bold">{explanation}</p>
          {hintUsed && (
            <p className="text-xs italic mt-2 text-brutal-ink-soft">
              Hint used: counted as partial credit.
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onNext}
              className="brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
            {wasCorrect && autoAdvance && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider"
                aria-label={paused ? "Resume auto-advance" : "Pause auto-advance"}
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {paused ? "Resume" : "Pause"}
              </button>
            )}
          </div>
          {wasCorrect && autoAdvance && !paused && (
            <div className="mt-3 h-1 bg-brutal-ink-trace border border-brutal-ink overflow-hidden">
              <motion.div
                className="h-full bg-brutal-ink"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "linear" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WhyHardRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof WHY_HARD_ITEMS[number];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  const correctIdx = item.options.findIndex((o) => o.correct);
  return (
    <MultipleChoiceCard
      prompt={item.question}
      context={
        <div className="space-y-3">
          <div className="bg-white border-2 border-brutal-ink p-3 text-sm font-bold whitespace-pre-line">
            {item.stimulus}
          </div>
          <div className="bg-brutal-yellow border-2 border-brutal-ink p-3 italic font-bold">
            {item.answerChoice}
          </div>
        </div>
      }
      options={item.options.map((o) => o.text)}
      correctIndex={correctIdx}
      explanation={item.options[correctIdx]?.explanation ?? ""}
      optionExplanations={item.options.map((o) => o.explanation)}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  );
}

function TermQuizRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof TERM_QUIZ_ITEMS[number];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  return (
    <MultipleChoiceCard
      prompt={item.prompt}
      options={item.options}
      correctIndex={item.correctOption}
      explanation={item.explanation}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  );
}

function MethodPickerRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof METHOD_QUIZ_ITEMS[number];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  return (
    <MultipleChoiceCard
      prompt={item.prompt}
      context={
        <div className="bg-white border-2 border-brutal-ink p-4 text-sm font-bold whitespace-pre-line">
          {item.stimulus}
        </div>
      }
      options={item.options}
      correctIndex={item.correctOption}
      explanation={item.explanation}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  );
}

function TrapSpotterRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof TRAP_ITEMS[number];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  return (
    <MultipleChoiceCard
      prompt={item.prompt}
      context={
        <div className="space-y-3">
          <div className="bg-white border-2 border-brutal-ink p-3 text-sm font-bold whitespace-pre-line">
            {item.stimulus}
          </div>
          <div className="bg-brutal-red/20 border-2 border-brutal-ink p-3 italic font-bold">
            Wrong answer: {item.wrongChoice}
          </div>
        </div>
      }
      options={TRAP_OPTION_TEXT}
      correctIndex={item.correctOption}
      explanation={item.explanation}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  );
}

// Clickable words for the keyword step. Real buttons, so they work from the
// keyboard and announce their pressed state.
function WordPicker({
  tokens,
  picked,
  onToggle,
  locked,
  isCorrectWord,
}: {
  tokens: string[];
  picked: Set<number>;
  onToggle: (i: number) => void;
  locked: boolean;
  isCorrectWord: (token: string) => boolean;
}) {
  return (
    <p className="text-lg md:text-xl font-semibold leading-loose m-0">
      {tokens.map((t, i) => {
        if (!/\w/.test(t)) return <span key={i}>{t}</span>;
        const isPicked = picked.has(i);
        const right = locked && isCorrectWord(t);
        return (
          <button
            key={i}
            type="button"
            disabled={locked}
            aria-pressed={isPicked}
            onClick={() => onToggle(i)}
            className={cn(
              "px-0.5 transition-colors",
              !locked && isPicked && "bg-brutal-yellow outline outline-2 outline-brutal-ink",
              !locked && !isPicked && "hover:bg-brutal-yellow/40",
              locked && right && isPicked && "bg-brutal-green",
              locked && right && !isPicked && "bg-brutal-yellow underline decoration-2",
              locked && isPicked && !right && "bg-brutal-red text-brutal-paper line-through",
            )}
          >
            {t}
          </button>
        );
      })}
    </p>
  );
}

// Keyword extraction (Module 3 quiz): click the keywords, write the plain
// English version, then compare it with the model sentence. Keywords are
// auto-graded. The sentence is a self-check: "not quite" turns a correct
// keyword score into partial credit.
function KeywordExtractionRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof TRANSLATOR_QUIZ_ITEMS[number];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  const { markTranslatorComplete } = useApp();
  const tokens = useMemo(() => splitTokens(item.stemText), [item.stemText]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [translation, setTranslation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [finalVerdict, setFinalVerdict] = useState<QuizVerdict | null>(null);

  const correctLower = item.correctKeywords.map((k) => k.toLowerCase());
  const isCorrectWord = (t: string) => correctLower.includes(stripPunc(t).toLowerCase());

  const togglePick = (i: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const canSubmit = picked.size > 0 && translation.trim().length >= 10;
  const pickedWords = Array.from(picked).map((i) => stripPunc(tokens[i]).toLowerCase());
  const matched = correctLower.filter((k) => pickedWords.includes(k));
  const wrong = pickedWords.filter((w) => !correctLower.includes(w));
  const pctCorrect = correctLower.length > 0 ? matched.length / correctLower.length : 0;
  const keywordVerdict: QuizVerdict =
    pctCorrect >= 0.75 && wrong.length === 0
      ? "correct"
      : pctCorrect >= 0.75 && wrong.length <= 2
        ? "partial"
        : "incorrect";

  const submit = () => {
    setSubmitted(true);
    void markTranslatorComplete(
      item.stemNumber,
      Array.from(picked).map((i) => tokens[i]),
      translation,
    );
  };

  const selfCheck = (same: boolean) => {
    const verdict: QuizVerdict = !same && keywordVerdict === "correct" ? "partial" : keywordVerdict;
    setFinalVerdict(verdict);
    onAnswer(verdict);
  };

  return (
    <div className="bg-brutal-paper border-4 border-brutal-ink p-5 md:p-6 brutal-shadow">
      <p className="text-xs font-black uppercase tracking-widest mb-3">
        Answer choice
      </p>
      <p className="font-black mb-2">Step 1. Click the words that carry the meaning.</p>
      <div className="bg-white border-4 border-brutal-ink p-4 md:p-5 mb-5">
        <WordPicker
          tokens={tokens}
          picked={picked}
          onToggle={togglePick}
          locked={submitted}
          isCorrectWord={isCorrectWord}
        />
      </div>
      <p className="font-black mb-2">Step 2. Say it in plain English.</p>
      <textarea
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
        disabled={submitted}
        aria-label="Plain English version"
        placeholder="The statement is..."
        className="w-full min-h-[96px] border-2 border-brutal-ink p-3 font-medium bg-white"
      />
      {!submitted && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={cn("mt-4 brutal-btn", canSubmit ? "bg-brutal-yellow" : "bg-brutal-paper opacity-60")}
        >
          Check my work
        </button>
      )}
      {submitted && (
        <div className="mt-5 space-y-4">
          <p className="font-medium">
            <span className="font-black">Keywords:</span> you found {matched.length} of {correctLower.length}.{" "}
            {wrong.length > 0
              ? `${wrong.length} of your picks ${wrong.length === 1 ? "is" : "are"} filler (struck through). Green is a keyword you found; yellow is one you missed.`
              : "No filler picked."}
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-white border-2 border-brutal-ink p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-2">Yours</p>
              <p className="font-medium m-0">{translation}</p>
            </div>
            <div className="bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-2">Model</p>
              <p className="font-medium m-0">{item.idealTranslation}</p>
            </div>
          </div>
          {finalVerdict === null ? (
            <div>
              <p className="font-black mb-2">Self-check: does yours say the same thing as the model?</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => selfCheck(true)} className="brutal-btn bg-brutal-green">
                  Yes, same idea
                </button>
                <button type="button" onClick={() => selfCheck(false)} className="brutal-btn bg-white">
                  Not quite
                </button>
              </div>
            </div>
          ) : (
            <>
              <VerdictHeader verdict={finalVerdict} />
              <div className="bg-white border-2 border-brutal-ink p-4">
                <p className="text-xs font-black uppercase tracking-widest mb-2">Walkthrough</p>
                {item.walkthrough.reasoning.map((p, i) => (
                  <p key={i} className="font-medium mb-2">
                    <TermText>{p}</TermText>
                  </p>
                ))}
              </div>
              {item.walkthrough.vocab.length > 0 && (
                <div className="grid md:grid-cols-2 gap-2">
                  {item.walkthrough.vocab.map((v, i) => (
                    <div key={i} className="bg-brutal-yellow border-2 border-brutal-ink p-3">
                      <p className="font-black text-sm">{v.term}</p>
                      <p className="font-medium m-0">{v.meaning}</p>
                      {v.note && <p className="text-sm mt-1 m-0">{v.note}</p>}
                    </div>
                  ))}
                </div>
              )}
              {item.walkthrough.requirements.length > 0 && (
                <div className="bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
                  <p className="text-xs font-black uppercase tracking-widest mb-2">The stimulus must have</p>
                  <ul className="list-disc pl-5 space-y-1 m-0">
                    {item.walkthrough.requirements.map((r, i) => (
                      <li key={i} className="font-medium">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-white border-2 border-brutal-ink p-4">
                <p className="text-xs font-black uppercase tracking-widest mb-2">Worked example</p>
                <p className="italic font-medium mb-2">{item.walkthrough.example.stimulus}</p>
                <p className="font-medium text-brutal-ink-soft m-0">{item.walkthrough.example.explanation}</p>
              </div>
              <button type="button" onClick={onNext} className="brutal-btn bg-brutal-green inline-flex items-center gap-2">
                Next answer choice <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VerdictHeader({ verdict }: { verdict: QuizVerdict }) {
  const tone =
    verdict === "correct"
      ? "bg-brutal-green"
      : verdict === "partial"
        ? "bg-brutal-yellow"
        : "bg-brutal-red text-brutal-paper";
  const label =
    verdict === "correct" ? "Correct" : verdict === "partial" ? "Partial" : "Not quite";
  return (
    <div
      className={cn(
        "inline-block border-4 border-brutal-ink px-4 py-2 text-sm font-black uppercase tracking-wider",
        tone,
      )}
    >
      {label}
    </div>
  );
}

function splitTokens(text: string): string[] {
  return text.split(/(\s+|[.,;:?!"()])/).filter((t) => t.length > 0);
}

function stripPunc(s: string): string {
  return s.replace(/[.,;:?!"()]/g, "");
}

// Match-to-stimulus: read stimulus + answer choice, judge each part.
function MatchToStimulusRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof MATCHING_ITEMS[number];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  const [partIndex, setPartIndex] = useState(0);
  const [decisions, setDecisions] = useState<("match" | "no_match")[]>([]);
  const [revealed, setRevealed] = useState(false);

  const currentPart = item.parts[partIndex];

  const decide = (choice: "match" | "no_match") => {
    const next = [...decisions, choice];
    setDecisions(next);
    if (partIndex + 1 < item.parts.length) {
      setPartIndex(partIndex + 1);
    } else {
      const allCorrect = next.every((d, i) =>
        d === "match" ? item.parts[i].matches : !item.parts[i].matches,
      );
      onAnswer(allCorrect);
      setRevealed(true);
    }
  };

  return (
    <div className="bg-brutal-paper border-4 border-brutal-ink p-6 brutal-shadow">
      <div className="bg-white border-2 border-brutal-ink p-4 mb-4">
        <p className="text-xs font-black uppercase tracking-widest mb-2">Stimulus</p>
        <p className="font-bold whitespace-pre-line">{item.stimulus}</p>
      </div>
      <div className="bg-brutal-yellow border-2 border-brutal-ink p-4 mb-5">
        <p className="text-xs font-black uppercase tracking-widest mb-2">Answer choice</p>
        <p className="font-bold italic">{item.answerChoice}</p>
      </div>
      {!revealed ? (
        <>
          <p className="text-xs font-black uppercase tracking-widest mb-2">
            Part {partIndex + 1} of {item.parts.length}
          </p>
          <div className="bg-white border-2 border-brutal-ink p-4 mb-4">
            <p className="font-bold">{currentPart.text}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => decide("match")}
              className="brutal-btn bg-brutal-green flex-1"
            >
              Match
            </button>
            <button
              type="button"
              onClick={() => decide("no_match")}
              className="brutal-btn bg-brutal-red text-brutal-paper flex-1"
            >
              No match
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {item.parts.map((p, i) => {
            const correct = decisions[i] === "match" ? p.matches : !p.matches;
            return (
              <div
                key={i}
                className={cn(
                  "border-2 border-brutal-ink p-3",
                  correct ? "bg-brutal-green" : "bg-brutal-red/30",
                )}
              >
                <p className="font-bold mb-1">{p.text}</p>
                <p className="text-xs italic">{p.explanation}</p>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onNext}
            className="brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Decoding Gauntlet (Module 7 quiz): keywords, plain English, then pick what
// the stimulus must contain. Requirements and trap descriptions are mixed in
// a stable shuffled order; the student checks only the real requirements.
function seededShuffle<T>(items: T[], seed: number): T[] {
  let h = (seed * 2654435761) >>> 0;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function DecodingGauntletRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof GAUNTLET_QUIZ_ITEMS[number];
  onAnswer: (verdict: boolean | QuizVerdict) => void;
  onNext: () => void;
}) {
  const { recordGauntletItem } = useApp();
  const tokens = useMemo(() => splitTokens(item.original), [item.original]);
  const correctLower = item.correctKeywords.map((k) => k.toLowerCase());
  const isCorrectWord = (t: string) =>
    correctLower.some((k) => k.split(/\s+/).includes(stripPunc(t).toLowerCase()));
  const allRequirements = useMemo(
    () => [...item.stimulusRequirements, ...item.trapRequirements].map((text, index) => ({ text, index })),
    [item],
  );
  const shuffled = useMemo(() => seededShuffle(allRequirements, item.id), [allRequirements, item.id]);
  const isRequired = (index: number) => index < item.stimulusRequirements.length;

  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [translation, setTranslation] = useState("");
  const [reqChecked, setReqChecked] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const pickedWords = Array.from(picked).map((i) => stripPunc(tokens[i]).toLowerCase());
  const wrong = pickedWords.filter((w) => !correctLower.some((k) => k.split(/\s+/).includes(w)));
  const phrasesHit = correctLower.filter((k) => k.split(/\s+/).some((part) => pickedWords.includes(part))).length;
  const keywordsOk = correctLower.length > 0 && phrasesHit / correctLower.length >= 0.75 && wrong.length <= 2;
  const reqsOk = allRequirements.every((r) => reqChecked.has(r.index) === isRequired(r.index));
  const verdict: QuizVerdict =
    keywordsOk && reqsOk && wrong.length === 0 ? "correct" : keywordsOk || reqsOk ? "partial" : "incorrect";

  const toggle = (setter: typeof setPicked, i: number) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const submit = () => {
    setSubmitted(true);
    onAnswer(verdict);
    void recordGauntletItem({
      choiceId: item.id,
      keywordsPicked: Array.from(picked).map((i) => tokens[i]),
      translationText: translation,
      requirementsChecked: Array.from(reqChecked),
      correctCount: phrasesHit,
    });
  };

  return (
    <div className="bg-brutal-paper border-4 border-brutal-ink p-5 md:p-6 brutal-shadow">
      <p className="text-xs font-black uppercase tracking-widest mb-3">
        Answer choice
      </p>
      <p className="font-black mb-2">Step 1. Click the words that carry the meaning.</p>
      <div className="bg-white border-4 border-brutal-ink p-4 md:p-5 mb-5">
        <WordPicker
          tokens={tokens}
          picked={picked}
          onToggle={(i) => toggle(setPicked, i)}
          locked={submitted}
          isCorrectWord={isCorrectWord}
        />
      </div>
      <p className="font-black mb-2">Step 2. Say it in plain English.</p>
      <textarea
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
        disabled={submitted}
        aria-label="Plain English version"
        placeholder="The statement is..."
        className="w-full min-h-[80px] border-2 border-brutal-ink p-3 font-medium bg-white mb-5"
      />
      <p className="font-black mb-1">Step 3. Which of these must be true of the stimulus for this choice to be right?</p>
      <p className="text-sm font-medium text-brutal-ink-soft mb-3">
        Pick every one that applies. Some describe ways the choice would be wrong.
      </p>
      <div className="space-y-2 mb-5">
        {shuffled.map((r) => {
          const checked = reqChecked.has(r.index);
          const required = isRequired(r.index);
          return (
            <button
              key={r.index}
              type="button"
              disabled={submitted}
              aria-pressed={checked}
              onClick={() => toggle(setReqChecked, r.index)}
              className={cn(
                "w-full text-left flex items-start gap-3 border-2 border-brutal-ink p-3 font-medium transition-colors",
                !submitted && (checked ? "bg-brutal-cyan/50" : "bg-white hover:bg-brutal-cyan/15"),
                submitted && required && "bg-brutal-green/50",
                submitted && !required && checked && "bg-brutal-red/20",
                submitted && !required && !checked && "bg-white opacity-70",
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 mt-0.5 border-2 border-brutal-ink shrink-0 flex items-center justify-center",
                  checked ? "bg-brutal-ink text-brutal-paper" : "bg-white",
                )}
                aria-hidden
              >
                {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
              </span>
              <span className="flex-1">
                {r.text}
                {submitted && (
                  <span className="block text-xs font-black uppercase tracking-wider mt-1">
                    {required
                      ? checked
                        ? "Required. You caught it."
                        : "Required. You missed it."
                      : checked
                        ? "Not required. This would make the choice wrong."
                        : "Correctly left out."}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button
          type="button"
          disabled={picked.size === 0 || translation.trim().length < 10 || reqChecked.size === 0}
          onClick={submit}
          className="brutal-btn bg-brutal-yellow disabled:opacity-60"
        >
          Check my work
        </button>
      ) : (
        <div className="space-y-3">
          <VerdictHeader verdict={verdict} />
          <p className="text-sm font-medium">
            Keywords: {phrasesHit} of {correctLower.length}. Stimulus checklist:{" "}
            {reqsOk ? "all right." : "not all right."}
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-white border-2 border-brutal-ink p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-2">Yours</p>
              <p className="font-medium m-0">{translation}</p>
            </div>
            <div className="bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-2">Model</p>
              <p className="font-medium m-0">{item.plainEnglish}</p>
            </div>
          </div>
          <div className="bg-brutal-yellow border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Coach note</p>
            <p className="font-medium m-0">{item.coachNote}</p>
          </div>
          <button type="button" onClick={onNext} className="brutal-btn bg-brutal-green inline-flex items-center gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============ Drill ============

export function ModuleDrill({ moduleId, onDone }: { moduleId: ModuleId; onDone: () => void }) {
  const { markDrillComplete, markModuleDrillComplete, addXp, bootcampState, loading, progressOwnerId } = useApp();
  const { user } = useAuth();
  const owner = user?.id ?? null;
  const activeOwner = useRef(owner);
  activeOwner.current = owner;
  const mod = getModule(moduleId)!;
  const drills = useMemo(
    () => mod.drillIds.map((id) => DRILLS.find((d) => d.id === id)).filter(Boolean) as DrillItem[],
    [mod.drillIds],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const initializedOwner = useRef<string | null | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [answerSaved, setAnswerSaved] = useState(false);
  useEffect(() => {
    if (loading || progressOwnerId !== owner || initializedOwner.current === owner) return;
    const restored = restoreDrillPosition(drills.map((d) => d.id), bootcampState.drillAttempts, Boolean(bootcampState.moduleProgress[moduleId]?.drillComplete));
    setIndex(restored.index);
    setPicked(restored.picked);
    setAnswerSaved(restored.picked !== null);
    setSaveError(null);
    initializedOwner.current = owner;
    setReady(true);
  }, [loading, progressOwnerId, owner, drills, bootcampState, moduleId]);
  // Time per question: restart the clock whenever a new question shows.
  const startedRef = useRef(Date.now());
  useEffect(() => {
    startedRef.current = Date.now();
  }, [index]);

  if (mod.drillKind === "answer-choice") {
    return <AnswerChoiceDrill onDone={onDone} />;
  }
  if (mod.drillKind === "breakdown") {
    return <BreakdownDrill onDone={onDone} />;
  }
  if (loading || progressOwnerId !== owner || !ready || initializedOwner.current !== owner) return <p role="status">Loading your saved practice...</p>;

  if (drills.length === 0) {
    return (
      <div className="text-center">
        <p className="font-bold mb-4">No drills configured for this module.</p>
        <button onClick={onDone} className="brutal-btn bg-brutal-green">Continue</button>
      </div>
    );
  }

  const current = drills[index];

  const submit = async (i: number) => {
    setSaving(true);
    setSaveError(null);
    setPicked(i);
    setAnswerSaved(false);
    const correct = i === current.correctOptionIndex;
    const result = await markDrillComplete(
      current.id,
      current.type as DrillType,
      correct,
      i,
      "Pretty sure",
      current.trapTag,
      Date.now() - startedRef.current,
    );
    if (activeOwner.current !== owner) return;
    setSaving(false);
    if (!result.ok) setSaveError("Your answer could not be saved. Choose it again to retry.");
    else { setAnswerSaved(true); if (correct) addXp(5); }
  };

  const nextItem = async () => {
    if (index + 1 >= drills.length) {
      setSaving(true);
      const result = await markModuleDrillComplete(moduleId);
      if (activeOwner.current !== owner) return;
      setSaving(false);
      if (result.ok) onDone();
      else setSaveError("Your module progress could not be saved. Try again.");
    } else {
      setPicked(null);
      setAnswerSaved(false);
      setSaveError(null);
      setIndex(index + 1);
    }
  };

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest mb-3 text-brutal-ink-soft">
        Question {index + 1} of {drills.length}{current.id.startsWith("source_") && ` · ${current.id.replace("source_", "").toUpperCase().replace(/_/g, "-")}`}
      </p>
      <div className="bg-brutal-paper border-4 border-brutal-ink p-6 brutal-shadow">
        {current.stimulus && (
          <div className="bg-white border-2 border-brutal-ink p-4 mb-4">
            <p className="font-bold whitespace-pre-line">{current.stimulus}</p>
          </div>
        )}
        {current.question && (
          <p className="font-black mb-4">{current.question}</p>
        )}
        <ul className="space-y-3 list-none m-0 p-0">
          {current.options.map((opt, i) => {
            const isCorrect = i === current.correctOptionIndex;
            const isPicked = picked === i;
            const tone =
              picked === null
                ? "bg-white hover:bg-brutal-yellow/30"
                : isCorrect
                  ? "bg-brutal-green"
                  : isPicked
                    ? "bg-brutal-red text-brutal-paper"
                    : "bg-white opacity-60";
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={saving || answerSaved}
                  onClick={() => void submit(i)}
                  className={cn("w-full text-left p-4 border-2 border-brutal-ink font-bold", tone)}
                >
                  {current.id.startsWith("source_") && <span className="mr-2 font-black">{String.fromCharCode(65 + i)}.</span>}{opt.text}
                </button>
                {picked !== null && (isCorrect || isPicked) && (
                  <p className="text-xs italic font-bold p-2 text-brutal-ink-soft">{opt.explanation}</p>
                )}
              </li>
            );
          })}
        </ul>
        {picked !== null && (
          <div className="mt-5 bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Why</p>
            <p className="font-bold">{current.explanation}</p>
            {saveError && <p role="alert">{saveError}</p>}
            <button
              type="button"
              onClick={nextItem}
              disabled={saving || !answerSaved}
              className="mt-4 brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
            >
              {index + 1 >= drills.length ? "Finish module" : "Next question"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Complete ============

function ModuleComplete({ moduleId, onContinue }: { moduleId: ModuleId; onContinue: () => void }) {
  const { bootcampState, openModule, setCurrentView } = useApp();
  const mod = getModule(moduleId)!;
  const row = bootcampState.moduleProgress[moduleId];
  const aced = Boolean(mod.quizSource) && bootcampState.aceBadges.includes(moduleId);
  const mastery: MasteryLevel = ["m3", "m5", "m6", "m7"].includes(moduleId) ? computeMastery(row) : row?.masteryLevel ?? computeMastery(row);
  const nextModule = LECTURE_MODULES[LECTURE_MODULES.findIndex((m) => m.id === moduleId) + 1];
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timeout = setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 35,
        origin: { y: 0.3 },
        ticks: 200,
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, [prefersReducedMotion]);

  return (
    <div className="text-center py-8">
      {prefersReducedMotion ? (
        <div className="inline-block bg-brutal-yellow border-4 border-brutal-ink px-6 py-3 mb-4 font-black uppercase tracking-widest text-sm">
          Done
        </div>
      ) : (
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4"
        >
          <Trophy className="w-20 h-20 mx-auto" />
        </motion.div>
      )}
      <p className="text-xs font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
        Module {mod.number}
      </p>
      <h2 className="text-4xl font-black uppercase tracking-tight mb-2">Done.</h2>
      {mastery !== "none" && <MasteryBadge level={mastery} />}
      {aced && (
        <p className="inline-flex items-center gap-2 font-black uppercase tracking-wider text-sm bg-brutal-yellow border-2 border-brutal-ink px-4 py-2 mt-3">
          <Star className="w-4 h-4" /> Aced It
        </p>
      )}

      <div className="mt-6 inline-flex flex-wrap items-center gap-3 justify-center">
        {mod.quizSource && row && row.quizTotal > 0 && (
          <span className="bg-brutal-paper border-2 border-brutal-ink px-3 py-2 text-xs font-black uppercase tracking-wider">
            Quiz {row.quizScore} / {row.quizTotal}
          </span>
        )}
        {moduleId === "m3" && row?.drillComplete && <span className="bg-brutal-paper border-2 border-brutal-ink px-3 py-2 text-xs font-bold">Completed the 15 source exercises. Ungraded practice.</span>}
        {moduleId !== "m3" && row && row.drillTotal && (
          <span className="bg-brutal-paper border-2 border-brutal-ink px-3 py-2 text-xs font-black uppercase tracking-wider">
            Drill {row.drillCorrect ?? 0} / {row.drillTotal}
          </span>
        )}
      </div>

      {moduleId === "m3" ? <details className="text-left mt-8"><summary className="font-semibold cursor-pointer">Answer-choice recap</summary><div className="mt-6"><RoleChoiceClosing /></div></details> : <p className="font-bold mt-6 mb-6">Continue when you are ready.</p>}
      {nextModule ? (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-brutal-ink-soft mb-3">
            Next module: Module {nextModule.number}: {nextModule.name}
          </p>
          <button
            type="button"
            onClick={() => openModule(nextModule.id)}
            className="brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCurrentView("dashboard")}
          className="brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
        >
          Back to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function MasteryBadge({ level }: { level: MasteryLevel }) {
  if (level === "none") return null;
  const tone =
    level === "mastered"
      ? "bg-brutal-yellow"
      : level === "solid"
        ? "bg-brutal-cyan"
        : "bg-brutal-paper";
  const label =
    level === "mastered" ? "Mastered" : level === "solid" ? "Solid" : "Practicing";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border-2 border-brutal-ink px-3 py-1 text-[10px] font-black uppercase tracking-widest",
        tone,
      )}
    >
      <Medal className="w-3.5 h-3.5" /> {label}
    </span>
  );
}
