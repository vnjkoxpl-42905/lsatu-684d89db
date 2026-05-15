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
} from "lucide-react";
import { useApp } from "../../store/AppContext";
import { cn } from "../../lib/utils";
import {
  MODULES,
  type ModuleId,
  type ModulePart,
  type QuizSource,
  getModule,
} from "../../data/modules";
import { LESSONS } from "../../data/lessons";
import LessonBody from "./LessonBody";
import { DRILLS } from "../../data/drills";
import { TRANSLATOR_ITEMS } from "../../data/translatorItems";
import { MATCHING_ITEMS } from "../../data/matchingItems";
import { ABSTRACT_CHOICES } from "../../data/abstractChoices";
import { WHY_HARD_ITEMS } from "../../data/whyHardItems";
import { TERM_QUIZ_ITEMS } from "../../data/termQuizItems";
import { METHOD_QUIZ_ITEMS } from "../../data/methodQuizItems";
import { TRAP_ITEMS, TRAP_OPTION_TEXT } from "../../data/trapItems";
import type { DrillItem, DrillType } from "../../types";

type Stage = "overview" | "note" | "quiz" | "drill" | "complete";

export default function ModuleView() {
  const { currentModuleId, setCurrentView, isModuleUnlocked } = useApp();
  const [stage, setStage] = useState<Stage>("overview");

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
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
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
            <ModuleOverview moduleId={currentModuleId} onPick={setStage} />
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
              onStartQuiz={() => setStage("quiz")}
            />
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
  const { bootcampState, isPartUnlocked } = useApp();
  const mod = getModule(moduleId)!;
  const row = bootcampState.moduleProgress[moduleId];
  const noteDone = Boolean(row?.noteComplete);
  const quizDone = row?.quizTotal > 0 && row.quizScore / row.quizTotal >= mod.quizPassThreshold;
  const drillDone = Boolean(row?.drillComplete);

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
        <PartRow
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
          ctaLabel={quizDone ? "Retake" : "Start"}
        />
        <PartRow
          icon={Target}
          label="Drill"
          meta={`${mod.drillIds.length} LSAT questions`}
          status={drillDone ? "done" : isPartUnlocked(moduleId, "drill") ? "active" : "locked"}
          lockedHint={`Pass the quiz at ${Math.round(mod.quizPassThreshold * 100)}% to unlock.`}
          accent="pink"
          onOpen={() => onPick("drill")}
          ctaLabel={drillDone ? "Retake" : "Start"}
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
      return TRANSLATOR_ITEMS.length;
    case "matchingItems":
      return MATCHING_ITEMS.length;
    case "methodQuizItems":
      return METHOD_QUIZ_ITEMS.length;
    case "trapItems":
      return TRAP_ITEMS.length;
    case "abstractChoices":
      return ABSTRACT_CHOICES.length;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [marked, setMarked] = useState(
    Boolean(bootcampState.moduleProgress[moduleId]?.noteComplete),
  );
  const [pulse, setPulse] = useState(false);

  // Scroll-aware enable: button activates once the student scrolls within
  // 200px of the bottom of the note container.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining <= 200 && !reachedEnd) {
        setReachedEnd(true);
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // If the note is short enough to fit without scrolling, enable immediately.
    if (el.scrollHeight <= el.clientHeight + 4) {
      setReachedEnd(true);
    }
    return () => el.removeEventListener("scroll", onScroll);
  }, [reachedEnd]);

  const onMark = async () => {
    await markNoteRead(moduleId);
    setMarked(true);
  };

  return (
    <div>
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
        Note: {lesson?.title ?? mod.name}
      </h2>
      <p className="font-bold text-brutal-ink-soft mb-6">{mod.subtitle}</p>

      <div
        ref={scrollRef}
        className="bg-brutal-paper border-4 border-brutal-ink mb-6 max-h-[60vh] overflow-y-auto custom-scrollbar"
      >
        <div className="p-6 md:p-8">
          <LessonBody lessonId={mod.noteLessonId} />
        </div>
      </div>

      {!marked ? (
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onMark}
            disabled={!reachedEnd}
            className={cn(
              "brutal-btn inline-flex items-center gap-2",
              reachedEnd ? "bg-brutal-green" : "bg-brutal-paper",
              pulse && "animate-pulse",
            )}
            title={reachedEnd ? "Mark this note as read" : "Scroll to the bottom to enable"}
          >
            <CheckCircle2 className="w-4 h-4" /> I read this
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-brutal-ink-soft">
            {reachedEnd ? "+10 XP" : "Scroll to enable"}
          </span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="bg-brutal-cyan border-4 border-brutal-ink p-5 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1">
              Note complete
            </p>
            <p className="font-bold">Ready for the quiz.</p>
          </div>
          <button
            type="button"
            onClick={onStartQuiz}
            className="brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
          >
            Start quiz <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ============ Quiz ============

function ModuleQuiz({ moduleId, onDone }: { moduleId: ModuleId; onDone: () => void }) {
  const { recordQuizScore, addXp } = useApp();
  const mod = getModule(moduleId)!;
  const items = useMemo(() => loadQuizItems(mod.quizSource), [mod.quizSource]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakHigh, setStreakHigh] = useState(0);
  const [finished, setFinished] = useState(false);

  if (finished) {
    const passed = items.length > 0 && score / items.length >= mod.quizPassThreshold;
    return (
      <div className="text-center">
        <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Quiz complete</h2>
        <div className="inline-block bg-brutal-yellow border-4 border-brutal-ink p-6 brutal-shadow mb-6">
          <p className="text-6xl font-black">
            {score} / {items.length}
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

  const onAnswer = (correct: boolean) => {
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setStreakHigh((h) => Math.max(h, next));
        return next;
      });
      addXp(1);
    } else {
      setStreak(0);
    }
  };

  const onNext = () => {
    if (index + 1 >= items.length) {
      setFinished(true);
      void recordQuizScore(moduleId, score, items.length, streakHigh);
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-brutal-ink-soft">
          Item {index + 1} of {items.length}
        </p>
        {streak >= 3 && (
          <p className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider">
            <Flame className="w-4 h-4" /> {streak} in a row
          </p>
        )}
      </div>
      <QuizItemRenderer
        key={index}
        source={mod.quizSource}
        item={items[index]}
        onAnswer={onAnswer}
        onNext={onNext}
      />
    </div>
  );
}

function loadQuizItems(source: QuizSource): unknown[] {
  switch (source) {
    case "whyHardItems":
      return WHY_HARD_ITEMS;
    case "termQuizItems":
      return TERM_QUIZ_ITEMS;
    case "translatorItems":
      return TRANSLATOR_ITEMS;
    case "matchingItems":
      return MATCHING_ITEMS;
    case "methodQuizItems":
      return METHOD_QUIZ_ITEMS;
    case "trapItems":
      return TRAP_ITEMS;
    case "abstractChoices":
      return ABSTRACT_CHOICES;
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
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  switch (source) {
    case "whyHardItems":
      return <WhyHardRenderer item={item as typeof WHY_HARD_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "termQuizItems":
      return <TermQuizRenderer item={item as typeof TERM_QUIZ_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "translatorItems":
      return <KeywordExtractionRenderer item={item as typeof TRANSLATOR_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "matchingItems":
      return <MatchToStimulusRenderer item={item as typeof MATCHING_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "methodQuizItems":
      return <MethodPickerRenderer item={item as typeof METHOD_QUIZ_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "trapItems":
      return <TrapSpotterRenderer item={item as typeof TRAP_ITEMS[number]} onAnswer={onAnswer} onNext={onNext} />;
    case "abstractChoices":
      return <DecodingGauntletRenderer item={item as typeof ABSTRACT_CHOICES[number]} onAnswer={onAnswer} onNext={onNext} />;
  }
}

// Generic single-column MC renderer used by most quiz sources.
function MultipleChoiceCard({
  prompt,
  context,
  options,
  correctIndex,
  explanation,
  onAnswer,
  onNext,
}: {
  prompt: string;
  context?: React.ReactNode;
  options: string[];
  correctIndex: number;
  explanation: string;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const submitted = picked !== null;
  return (
    <div className="bg-brutal-paper border-4 border-brutal-ink p-6 brutal-shadow">
      {context && <div className="mb-5">{context}</div>}
      <p className="font-black mb-4">{prompt}</p>
      <ul className="space-y-3 list-none m-0 p-0">
        {options.map((opt, i) => {
          const isCorrect = i === correctIndex;
          const isPicked = picked === i;
          const tone = !submitted
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
                disabled={submitted}
                onClick={() => {
                  setPicked(i);
                  onAnswer(isCorrect);
                }}
                className={cn(
                  "w-full text-left p-4 border-2 border-brutal-ink font-bold transition-colors",
                  tone,
                )}
              >
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {submitted && (
        <div className="mt-5 bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
          <p className="text-xs font-black uppercase tracking-widest mb-2">Why</p>
          <p className="font-bold">{explanation}</p>
          <button
            type="button"
            onClick={onNext}
            className="mt-4 brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
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
  onAnswer: (correct: boolean) => void;
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
  onAnswer: (correct: boolean) => void;
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
  onAnswer: (correct: boolean) => void;
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
  onAnswer: (correct: boolean) => void;
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

// Keyword extraction: clickable stem + translation textarea + reveal.
function KeywordExtractionRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof TRANSLATOR_ITEMS[number];
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  const { markTranslatorComplete } = useApp();
  const tokens = useMemo(() => splitTokens(item.stemText), [item.stemText]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [translation, setTranslation] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const correctLower = item.correctKeywords.map((k) => k.toLowerCase());

  const togglePick = (i: number) => {
    if (submitted) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const canSubmit = picked.size > 0 && translation.trim().length >= 10;

  const submit = () => {
    setSubmitted(true);
    const pickedWords = Array.from(picked).map((i) => stripPunc(tokens[i]).toLowerCase());
    const matched = pickedWords.filter((w) => correctLower.includes(w));
    // "Correct" for quiz scoring: matched at least half of correct keywords
    const correct = matched.length >= Math.ceil(correctLower.length / 2);
    onAnswer(correct);
    void markTranslatorComplete(
      item.stemNumber,
      Array.from(picked).map((i) => tokens[i]),
      translation,
    );
  };

  return (
    <div className="bg-brutal-paper border-4 border-brutal-ink p-6 brutal-shadow">
      <p className="text-xs font-black uppercase tracking-widest mb-2">Stem {item.stemNumber} of {TRANSLATOR_ITEMS.length}</p>
      <div className="bg-brutal-paper border-4 border-brutal-ink p-5 mb-4">
        <p className="text-xl italic font-black leading-snug">
          {tokens.map((t, i) => {
            const isPicked = picked.has(i);
            const isWord = /\w/.test(t);
            const isCorrectWord = submitted && correctLower.includes(stripPunc(t).toLowerCase());
            const isWrongPick = submitted && isPicked && !isCorrectWord;
            const cls = cn(
              "transition-colors",
              isWord ? "cursor-pointer" : "",
              !submitted && isPicked ? "bg-brutal-yellow" : "",
              submitted && isCorrectWord && isPicked ? "bg-brutal-green" : "",
              submitted && isCorrectWord && !isPicked ? "bg-brutal-yellow" : "",
              isWrongPick ? "bg-brutal-red text-brutal-paper" : "",
            );
            return (
              <span
                key={i}
                onClick={() => isWord && togglePick(i)}
                className={cls}
              >
                {t}
              </span>
            );
          })}
        </p>
      </div>
      <p className="text-xs font-black uppercase tracking-widest mb-2">Step 2: Plain English</p>
      <textarea
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
        disabled={submitted}
        placeholder="Translate the stem in your own words..."
        className="w-full min-h-[100px] border-2 border-brutal-ink p-3 font-bold bg-white"
      />
      {!submitted && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={cn(
            "mt-4 brutal-btn",
            canSubmit ? "bg-brutal-yellow" : "bg-brutal-paper opacity-60",
          )}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className="mt-5 space-y-4">
          <div className="bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Ideal translation</p>
            <p className="font-bold italic">{item.idealTranslation}</p>
          </div>
          <div className="bg-white border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Walkthrough</p>
            {item.walkthrough.reasoning.map((p, i) => (
              <p key={i} className="font-bold mb-2">{p}</p>
            ))}
          </div>
          {item.walkthrough.vocab.length > 0 && (
            <div className="space-y-2">
              {item.walkthrough.vocab.map((v, i) => (
                <div key={i} className="bg-brutal-yellow border-2 border-brutal-ink p-3">
                  <p className="font-black uppercase text-xs tracking-widest">{v.term}</p>
                  <p className="font-bold">{v.meaning}</p>
                  {v.note && <p className="text-xs italic mt-1">{v.note}</p>}
                </div>
              ))}
            </div>
          )}
          {item.walkthrough.requirements.length > 0 && (
            <div className="bg-brutal-cyan border-2 border-brutal-ink p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-2">Stimulus must have</p>
              <ul className="list-disc pl-5 space-y-1">
                {item.walkthrough.requirements.map((r, i) => (
                  <li key={i} className="font-bold">{r}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="bg-white border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Worked example</p>
            <p className="italic font-bold mb-2">{item.walkthrough.example.stimulus}</p>
            <p className="font-bold text-brutal-ink-soft">{item.walkthrough.example.explanation}</p>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="brutal-btn bg-brutal-green inline-flex items-center gap-2"
          >
            Next stem <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
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
  onAnswer: (correct: boolean) => void;
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

// Decoding Gauntlet: 3-step inline (keyword + translation + requirements checklist).
function DecodingGauntletRenderer({
  item,
  onAnswer,
  onNext,
}: {
  item: typeof ABSTRACT_CHOICES[number];
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  const { recordGauntletItem } = useApp();
  const tokens = useMemo(() => splitTokens(item.original), [item.original]);
  const correctLower = item.correctKeywords.map((k) => k.toLowerCase());
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [translation, setTranslation] = useState("");
  const [reqChecked, setReqChecked] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    setSubmitted(true);
    const pickedWords = Array.from(picked).map((i) => stripPunc(tokens[i]).toLowerCase());
    const matched = pickedWords.filter((w) =>
      correctLower.some((k) => k.split(/\s+/).includes(w)),
    );
    const correct = matched.length >= Math.ceil(correctLower.length / 2);
    onAnswer(correct);
    void recordGauntletItem({
      choiceId: item.id,
      keywordsPicked: Array.from(picked).map((i) => tokens[i]),
      translationText: translation,
      requirementsChecked: Array.from(reqChecked),
      correctCount: matched.length,
    });
  };

  return (
    <div className="bg-brutal-paper border-4 border-brutal-ink p-6 brutal-shadow">
      <p className="text-xs font-black uppercase tracking-widest mb-2">Item {item.id} of {ABSTRACT_CHOICES.length}</p>
      <div className="bg-brutal-paper border-4 border-brutal-ink p-5 mb-4">
        <p className="text-lg italic font-black leading-snug">
          {tokens.map((t, i) => {
            const isWord = /\w/.test(t);
            const isPicked = picked.has(i);
            const isCorrectWord = submitted && correctLower.some((k) => k.split(/\s+/).includes(stripPunc(t).toLowerCase()));
            const cls = cn(
              "transition-colors",
              isWord ? "cursor-pointer" : "",
              !submitted && isPicked ? "bg-brutal-yellow" : "",
              submitted && isCorrectWord ? "bg-brutal-green" : "",
              submitted && isPicked && !isCorrectWord ? "bg-brutal-red text-brutal-paper" : "",
            );
            return (
              <span
                key={i}
                onClick={() => isWord && !submitted && setPicked((p) => {
                  const next = new Set(p);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })}
                className={cls}
              >
                {t}
              </span>
            );
          })}
        </p>
      </div>
      <textarea
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
        disabled={submitted}
        placeholder="Plain English..."
        className="w-full min-h-[80px] border-2 border-brutal-ink p-3 font-bold bg-white mb-4"
      />
      {!submitted ? (
        <button
          type="button"
          disabled={picked.size === 0 || translation.trim().length < 10}
          onClick={submit}
          className="brutal-btn bg-brutal-yellow"
        >
          Submit
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-brutal-cyan/30 border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Plain English</p>
            <p className="font-bold italic">{item.plainEnglish}</p>
          </div>
          <div className="bg-white border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Stimulus must have</p>
            <ul className="list-disc pl-5 space-y-1">
              {item.stimulusRequirements.map((r, i) => (
                <li key={i} className="font-bold">{r}</li>
              ))}
            </ul>
          </div>
          <div className="bg-brutal-yellow border-2 border-brutal-ink p-4">
            <p className="text-xs font-black uppercase tracking-widest mb-2">Coach note</p>
            <p className="font-bold">{item.coachNote}</p>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="brutal-btn bg-brutal-green inline-flex items-center gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============ Drill ============

function ModuleDrill({ moduleId, onDone }: { moduleId: ModuleId; onDone: () => void }) {
  const { markDrillComplete, markModuleDrillComplete, addXp } = useApp();
  const mod = getModule(moduleId)!;
  const drills = useMemo(
    () => mod.drillIds.map((id) => DRILLS.find((d) => d.id === id)).filter(Boolean) as DrillItem[],
    [mod.drillIds],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const startedRef = useState(() => Date.now())[0];

  if (drills.length === 0) {
    return (
      <div className="text-center">
        <p className="font-bold mb-4">No drills configured for this module.</p>
        <button onClick={onDone} className="brutal-btn bg-brutal-green">Continue</button>
      </div>
    );
  }

  const current = drills[index];

  const submit = (i: number) => {
    setPicked(i);
    const correct = i === current.correctOptionIndex;
    if (correct) {
      setCorrectCount((c) => c + 1);
      addXp(5);
    }
    void markDrillComplete(
      current.id,
      current.type as DrillType,
      correct,
      i,
      "Pretty sure",
      current.trapTag,
      Date.now() - startedRef,
    );
  };

  const nextItem = async () => {
    if (index + 1 >= drills.length) {
      await markModuleDrillComplete(moduleId);
      onDone();
    } else {
      setPicked(null);
      setIndex(index + 1);
    }
  };

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest mb-3 text-brutal-ink-soft">
        Drill {index + 1} of {drills.length}
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
                  disabled={picked !== null}
                  onClick={() => submit(i)}
                  className={cn("w-full text-left p-4 border-2 border-brutal-ink font-bold", tone)}
                >
                  {opt.text}
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
            <button
              type="button"
              onClick={nextItem}
              className="mt-4 brutal-btn bg-brutal-yellow inline-flex items-center gap-2"
            >
              {index + 1 >= drills.length ? "Finish module" : "Next drill"}
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
  const { bootcampState, openModule } = useApp();
  const mod = getModule(moduleId)!;
  const aced = bootcampState.aceBadges.includes(moduleId);
  const nextModule = MODULES[MODULES.findIndex((m) => m.id === moduleId) + 1];
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="text-center py-8">
      {!prefersReducedMotion && (
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
      <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Done.</h2>
      {aced && (
        <p className="inline-flex items-center gap-2 font-black uppercase tracking-wider text-sm bg-brutal-yellow border-2 border-brutal-ink px-4 py-2 mb-4">
          <Star className="w-4 h-4" /> Aced It
        </p>
      )}
      <p className="font-bold mb-6">Nice. Next.</p>
      {nextModule ? (
        <button
          type="button"
          onClick={() => openModule(nextModule.id)}
          className="brutal-btn bg-brutal-green inline-flex items-center gap-2"
        >
          Module {nextModule.number}: {nextModule.name} <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onContinue}
          className="brutal-btn bg-brutal-green inline-flex items-center gap-2"
        >
          Back to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
