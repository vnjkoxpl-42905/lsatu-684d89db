import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { mirroredSetItem, mirroredRemoveItem } from '@/lib/cloudMirror';
import { logCsAttempt } from './csAttemptLogger';
import { Question, Attempt } from '@/types/causationStation';
import { Module } from '@/data/causationStation/constants';
import { ALL_QUESTIONS } from '@/data/causationStation/questions';
import CSQuestionCard from './CSQuestionCard';
import CSModuleIntro from './CSModuleIntro';
import CSTutorChat from './CSTutorChat';

interface CSDrillPlayerProps {
  module: Module;
  onEndDrill: () => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const ATTEMPT_HISTORY_KEY = 'causationCoachAttemptHistory';

// Modules the student has finished at least one full run through. Read by
// CausationStation to report classroom completion via useBootcampProgress.
export const MODULE_COMPLETION_KEY = 'causationCoachCompletedModules';

export function markCausationModuleComplete(moduleId: string): void {
  try {
    const raw = localStorage.getItem(MODULE_COMPLETION_KEY);
    const done: string[] = raw ? JSON.parse(raw) : [];
    if (!done.includes(moduleId)) {
      mirroredSetItem(MODULE_COMPLETION_KEY, JSON.stringify([...done, moduleId]));
      // Let same-tab listeners (CausationStation) refresh.
      window.dispatchEvent(new Event('causation-module-complete'));
    }
  } catch (error) {
    console.error('Failed to record causation module completion:', error);
  }
}

const CSDrillPlayer: React.FC<CSDrillPlayerProps> = ({ module, onEndDrill }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [bankExhausted, setBankExhausted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  // M4 stopwatch
  const [questionTime, setQuestionTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [highlights, setHighlights] = useState<Record<string, { start: number; end: number }[]>>({});

  const isModule4 = module.id === 'strengthen-weaken';
  const score = useMemo(() => attempts.filter(a => a.correct).length, [attempts]);

  const formattedQuestionTime = useMemo(() => {
    const mins = Math.floor(questionTime / 60);
    const secs = questionTime % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [questionTime]);

  const handleHighlightsChange = useCallback((questionId: string, newHighlights: { start: number; end: number }[]) => {
    setHighlights(prev => ({ ...prev, [questionId]: newHighlights }));
  }, []);

  useEffect(() => {
    if (!isModule4 || !questions.length || isRevealed) return;

    if (questionStartTime === 0) {
      setQuestionStartTime(Date.now());
    }

    const intervalId = setInterval(() => {
      setQuestionTime(Math.floor((Date.now() - questionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentQuestionIndex, isModule4, questions.length, questionStartTime, isRevealed]);

  const loadQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    setBankExhausted(false);

    const savedProgressRaw = localStorage.getItem('causationCoachDrillProgress');
    if (savedProgressRaw) {
      try {
        const savedProgress = JSON.parse(savedProgressRaw);
        if (savedProgress.moduleId === module.id) {
          setQuestions(savedProgress.questions);
          setCurrentQuestionIndex(savedProgress.currentQuestionIndex);
          setAttempts(savedProgress.attempts);
          setIsLoadingQuestions(false);
          setShowIntro(false);
          return;
        }
      } catch (e) {
        console.error('Failed to load saved progress', e);
      }
    }

    const moduleQuestionBank = ALL_QUESTIONS[module.id];

    if (module.id === 'strengthen-weaken') {
      setQuestions(shuffleArray(moduleQuestionBank));
    } else {
      try {
        const usedIdsKey = `causationCoachUsedIds_${module.id}`;
        const usedIdsRaw = localStorage.getItem(usedIdsKey);
        const usedIds = new Set(usedIdsRaw ? JSON.parse(usedIdsRaw) : []);

        let availableQuestions = moduleQuestionBank.filter(q => !usedIds.has(q.id));

        if (availableQuestions.length < 10 && moduleQuestionBank.length >= 10) {
          mirroredRemoveItem(usedIdsKey);
          availableQuestions = moduleQuestionBank;
        }

        if (availableQuestions.length === 0) {
          // Whole bank seen at least once: the module run is complete.
          markCausationModuleComplete(module.id);
          setBankExhausted(true);
        } else {
          const shuffledAvailable = shuffleArray(availableQuestions);
          const drillQuestions = shuffledAvailable.slice(0, 10);
          const drillQuestionIds = drillQuestions.map((q: Question) => q.id);

          const newUsedIds = new Set([...usedIds, ...drillQuestionIds]);
          mirroredSetItem(usedIdsKey, JSON.stringify(Array.from(newUsedIds)));

          setQuestions(drillQuestions);
        }
      } catch (error) {
        console.error('Error loading from question bank:', error);
        const shuffledBank = shuffleArray(moduleQuestionBank);
        setQuestions(shuffledBank.slice(0, 10));
      }
    }

    setIsLoadingQuestions(false);
  }, [module.id]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Autosave progress
  useEffect(() => {
    if (questions.length > 0 && !isLoadingQuestions) {
      const progress = {
        moduleId: module.id,
        questions,
        currentQuestionIndex,
        attempts,
        lastUpdated: Date.now(),
      };
      mirroredSetItem('causationCoachDrillProgress', JSON.stringify(progress));
    }
  }, [module.id, questions, currentQuestionIndex, attempts, isLoadingQuestions]);

  const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);

  const handleAnswer = (data: { choiceIndex?: number; thirdFactor?: string; reverseCausation?: string; causeWithoutEffect?: string; effectWithoutCause?: string }) => {
    if (isRevealed || !currentQuestion) return;

    if (
      (module.id === 'common-causes' && data.thirdFactor && data.reverseCausation) ||
      (module.id === 'reverse-causality' && data.causeWithoutEffect && data.effectWithoutCause)
    ) {
      setIsRevealed(true);
      setShowModelAnswer(true);

      // Module 2/3 are free-response: there is no right/wrong index, but the
      // work still happened. Record an ungraded attempt so the dashboard and
      // journal reflect M2/M3 activity instead of looking empty. Ungraded
      // attempts are excluded from accuracy (see CSDashboard).
      const responseTimeMs = questionStartTime ? Date.now() - questionStartTime : 0;
      setAttempts(prev => [
        ...prev,
        {
          questionId: currentQuestion.id,
          answerIndex: -1,
          correct: false,
          responseTimeMs,
          hintsUsed: 0,
          ungraded: true,
        },
      ]);

      try {
        const previous = JSON.parse(localStorage.getItem(ATTEMPT_HISTORY_KEY) ?? '[]');
        const ungradedAttempt = {
          questionId: currentQuestion.id,
          moduleId: module.id,
          answerIndex: -1,
          correct: false,
          responseTimeMs,
          completedAt: new Date().toISOString(),
          ungraded: true,
        };
        mirroredSetItem(ATTEMPT_HISTORY_KEY, JSON.stringify([...previous, ungradedAttempt].slice(-200)));
      } catch (error) {
        console.error('Failed to save causation free-response attempt history:', error);
      }
      // Durable per-question record for Drill History (survives the 200-entry
      // rolling cache above).
      logCsAttempt({
        moduleId: module.id,
        questionId: currentQuestion.id,
        selectedAnswer: null,
        correct: null,
        timeMs: responseTimeMs,
      });
    } else if (typeof data.choiceIndex !== 'undefined') {
      const answerIndex = data.choiceIndex;
      const responseTimeMs = Date.now() - questionStartTime;
      setSelectedAnswer(answerIndex);
      setIsRevealed(true);

      const isCorrect = answerIndex === currentQuestion.correctIndex;
      const attempt = {
        questionId: currentQuestion.id,
        moduleId: module.id,
        answerIndex,
        correct: isCorrect,
        responseTimeMs,
        completedAt: new Date().toISOString(),
      };

      setAttempts(prev => [
        ...prev,
        {
          questionId: attempt.questionId,
          answerIndex: attempt.answerIndex,
          correct: attempt.correct,
          responseTimeMs: attempt.responseTimeMs,
          hintsUsed: 0,
        },
      ]);

      try {
        const previous = JSON.parse(localStorage.getItem(ATTEMPT_HISTORY_KEY) ?? '[]');
        mirroredSetItem(ATTEMPT_HISTORY_KEY, JSON.stringify([...previous, attempt].slice(-200)));
      } catch (error) {
        console.error('Failed to save causation attempt history:', error);
      }
      logCsAttempt({
        moduleId: module.id,
        questionId: attempt.questionId,
        selectedAnswer: String(attempt.answerIndex),
        correct: attempt.correct,
        timeMs: attempt.responseTimeMs,
      });
    }
  };

  const goToQuestion = (index: number) => {
    if (index < 0) return;
    if (index >= questions.length) {
      // Finished a full run through this module's drill.
      markCausationModuleComplete(module.id);
      mirroredRemoveItem('causationCoachDrillProgress');
      onEndDrill();
      return;
    }

    setCurrentQuestionIndex(index);
    setShowModelAnswer(false);
    setQuestionStartTime(0);
    setQuestionTime(0);

    const questionToLoad = questions[index];
    const pastAttempt = attempts.find(a => a.questionId === questionToLoad.id);

    if (pastAttempt) {
      setSelectedAnswer(pastAttempt.answerIndex);
      setIsRevealed(true);
    } else {
      setSelectedAnswer(null);
      setIsRevealed(false);
    }
  };

  if (showIntro) {
    return <CSModuleIntro moduleId={module.id} onStart={() => setShowIntro(false)} />;
  }

  if (isLoadingQuestions) {
    return (
      <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-6 h-6 border border-t-punk-cyan/60 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-punk-cyan animate-pulse">Loading drill...</p>
      </div>
    );
  }

  if (bankExhausted) {
    return (
      <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-punk-lime mb-2">Module Complete!</h2>
        <p className="text-sm text-punk-sub mb-4">You have attempted all available questions in this module's bank. Your progress has been reset for your next attempt.</p>
        <button
          onClick={onEndDrill}
          className="inline-flex items-center rounded-full bg-punk-cyan text-punk-base text-sm font-semibold px-5 py-2 hover:bg-white hover:shadow-neon-cyan active:scale-95 transition-all duration-150"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-punk-magenta mb-2">Error</h2>
        <p className="text-sm text-punk-sub mb-4">Could not load questions for this module.</p>
        <button
          onClick={onEndDrill}
          className="inline-flex items-center rounded-full bg-punk-cyan text-punk-base text-sm font-semibold px-5 py-2 hover:bg-white hover:shadow-neon-cyan active:scale-95 transition-all duration-150"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-punk-text">{module.name}</h2>
        <div className="flex items-center gap-4">
          {isModule4 && (
            <div className="flex items-center gap-1.5 font-mono text-sm text-punk-cyan bg-punk-panel px-4 py-2 rounded-md border border-punk-sub/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {formattedQuestionTime}
            </div>
          )}
          <CSTutorChat />
          <button
            onClick={onEndDrill}
            className="text-sm text-punk-sub hover:text-punk-text transition-colors"
          >
            End Drill
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        {module.id === 'correlation-causation' && (
          <div className="bg-punk-panel/50 border border-punk-sub/20 rounded-lg py-2 px-4 flex justify-between items-center">
            <span className="text-[11px] uppercase tracking-[0.2em] text-punk-sub">Question {currentQuestionIndex + 1}</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-punk-sub">Score: {score}</span>
          </div>
        )}

        <CSQuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          selectedAnswer={selectedAnswer}
          isRevealed={isRevealed}
          timeElapsed={isModule4 ? questionTime : undefined}
          highlights={highlights[currentQuestion.id] || []}
          onHighlightsChange={handleHighlightsChange}
        />

        {isRevealed && showModelAnswer && (module.id === 'common-causes' || module.id === 'reverse-causality') && (
          <div className="animate-fade-in bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-punk-cyan mb-1">Model Answer</h3>
            <p className="text-sm text-punk-sub whitespace-pre-wrap">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            className="inline-flex items-center rounded-full border border-punk-sub text-punk-sub text-sm font-medium px-5 py-2 hover:text-punk-text hover:border-punk-text transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={!isRevealed}
            className="inline-flex items-center rounded-full bg-punk-cyan text-punk-base text-sm font-semibold px-5 py-2 hover:bg-white hover:shadow-neon-cyan active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish Drill' : 'Next Question'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSDrillPlayer;
