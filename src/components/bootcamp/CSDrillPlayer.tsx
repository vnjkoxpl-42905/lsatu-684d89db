import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Question, Attempt } from '@/types/causationStation';
import { Module } from '@/data/causationStation/constants';
import { ALL_QUESTIONS } from '@/data/causationStation/questions';
import CSQuestionCard from './CSQuestionCard';
import CSModuleIntro from './CSModuleIntro';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

  // Modal states
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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
          localStorage.removeItem(usedIdsKey);
          availableQuestions = moduleQuestionBank;
        }

        if (availableQuestions.length === 0) {
          setBankExhausted(true);
        } else {
          const shuffledAvailable = shuffleArray(availableQuestions);
          const drillQuestions = shuffledAvailable.slice(0, 10);
          const drillQuestionIds = drillQuestions.map((q: Question) => q.id);

          const newUsedIds = new Set([...usedIds, ...drillQuestionIds]);
          localStorage.setItem(usedIdsKey, JSON.stringify(Array.from(newUsedIds)));

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
      localStorage.setItem('causationCoachDrillProgress', JSON.stringify(progress));
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
    } else if (typeof data.choiceIndex !== 'undefined') {
      const answerIndex = data.choiceIndex;
      const responseTimeMs = Date.now() - questionStartTime;
      setSelectedAnswer(answerIndex);
      setIsRevealed(true);

      const isCorrect = answerIndex === currentQuestion.correctIndex;

      setAttempts(prev => [
        ...prev,
        {
          questionId: currentQuestion.id,
          answerIndex: answerIndex,
          correct: isCorrect,
          responseTimeMs: responseTimeMs,
          hintsUsed: 0,
        },
      ]);
    }
  };

  const goToQuestion = (index: number) => {
    if (index < 0) return;
    if (index >= questions.length) {
      localStorage.removeItem('causationCoachDrillProgress');
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
      <div className="rounded-xl bg-card border border-border shadow-sm p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-6 h-6 border border-t-foreground/30 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading drill...</p>
      </div>
    );
  }

  if (bankExhausted) {
    return (
      <div className="rounded-xl bg-card border border-border shadow-sm p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Module Complete!</h2>
        <p className="text-sm text-muted-foreground mb-4">You have attempted all available questions in this module's bank. Your progress has been reset for your next attempt.</p>
        <button
          onClick={onEndDrill}
          className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="rounded-xl bg-card border border-border shadow-sm p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Error</h2>
        <p className="text-sm text-muted-foreground mb-4">Could not load questions for this module.</p>
        <button
          onClick={onEndDrill}
          className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
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
        <h2 className="text-lg font-semibold text-foreground">{module.name}</h2>
        <div className="flex items-center gap-4">
          {isModule4 && (
            <div className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {formattedQuestionTime}
            </div>
          )}
          <button
            onClick={onEndDrill}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            End Drill
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        {module.id === 'correlation-causation' && (
          <div className="bg-card border border-border rounded-lg py-2 px-4 flex justify-between items-center">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Question {currentQuestionIndex + 1}</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Score: {score}</span>
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
          <div className="rounded-xl bg-card border border-border shadow-sm p-6">
            <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1">Model Answer</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            className="inline-flex items-center rounded-lg border border-border text-foreground text-sm font-medium px-4 py-2 hover:bg-accent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={!isRevealed}
            className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish Drill' : 'Next Question'}
          </button>
        </div>
      </div>

      {/* Resume Modal */}
      <AlertDialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drill in Progress</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unfinished drill for this module. Would you like to resume where you left off or start a new one? Starting a new drill will erase your previous progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              localStorage.removeItem('causationCoachDrillProgress');
              loadQuestions();
              setIsResumeModalOpen(false);
            }}>Start New</AlertDialogCancel>
            <AlertDialogAction onClick={() => setIsResumeModalOpen(false)}>Resume Drill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overwrite Modal */}
      <AlertDialog open={isOverwriteModalOpen} onOpenChange={setIsOverwriteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Existing Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              Starting a new drill will erase your previous progress. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsOverwriteModalOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              localStorage.removeItem('causationCoachDrillProgress');
              loadQuestions();
              setIsOverwriteModalOpen(false);
            }}>Discard & Start</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Modal */}
      <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Module Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the question bank for this module. You will start seeing questions you've already answered again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsResetModalOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const usedIdsKey = `causationCoachUsedIds_${module.id}`;
              localStorage.removeItem(usedIdsKey);
              localStorage.removeItem('causationCoachDrillProgress');
              loadQuestions();
              setIsResetModalOpen(false);
            }}>Reset Module</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CSDrillPlayer;
