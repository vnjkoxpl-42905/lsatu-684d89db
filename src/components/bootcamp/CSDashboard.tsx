import React, { useState, useEffect, useMemo } from 'react';
import { MODULES, Module } from '@/data/causationStation/constants';
import { ALL_QUESTIONS } from '@/data/causationStation/questions';
import { QuestionModuleId } from '@/types/causationStation';
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

interface CSDashboardProps {
  onStartDrill: (module: Module) => void;
}

const CSDashboard: React.FC<CSDashboardProps> = ({ onStartDrill }) => {
  const [attemptHistory, setAttemptHistory] = useState<Array<{
    questionId: string;
    moduleId: QuestionModuleId;
    correct: boolean;
    responseTimeMs: number;
    completedAt: string;
    ungraded?: boolean;
  }>>([]);
  const [savedDrillModuleId, setSavedDrillModuleId] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedModuleForAction, setSelectedModuleForAction] = useState<Module | null>(null);

  const checkSavedProgress = () => {
    try {
      const savedProgressRaw = localStorage.getItem('causationCoachDrillProgress');
      if (savedProgressRaw) {
        const savedProgress = JSON.parse(savedProgressRaw);
        if (savedProgress.moduleId) {
          setSavedDrillModuleId(savedProgress.moduleId);
        } else {
          setSavedDrillModuleId(null);
        }
      } else {
        setSavedDrillModuleId(null);
      }
    } catch (error) {
      console.error('Failed to parse saved drill progress:', error);
      localStorage.removeItem('causationCoachDrillProgress');
      setSavedDrillModuleId(null);
    }
  };

  useEffect(() => {
    checkSavedProgress();
    try {
      setAttemptHistory(JSON.parse(localStorage.getItem('causationCoachAttemptHistory') ?? '[]'));
    } catch (error) {
      console.error('Failed to parse causation attempt history:', error);
      localStorage.removeItem('causationCoachAttemptHistory');
      setAttemptHistory([]);
    }
  }, []);

  const stats = useMemo(() => {
    const total = attemptHistory.length;
    // Accuracy is computed only over graded attempts. Module 2/3 free-response
    // attempts are ungraded and would otherwise drag accuracy to zero.
    const graded = attemptHistory.filter((attempt) => !attempt.ungraded);
    const correct = graded.filter((attempt) => attempt.correct).length;
    const overallAccuracy = graded.length > 0 ? Math.round((correct / graded.length) * 100) : 0;
    const avgTime =
      total > 0
        ? Math.round(attemptHistory.reduce((sum, attempt) => sum + (attempt.responseTimeMs || 0), 0) / total / 1000)
        : 0;
    // Streak counts consecutive graded-correct answers; ungraded attempts are
    // skipped rather than breaking the streak.
    let currentStreak = 0;
    for (let i = attemptHistory.length - 1; i >= 0; i -= 1) {
      if (attemptHistory[i].ungraded) continue;
      if (!attemptHistory[i].correct) break;
      currentStreak += 1;
    }
    const moduleProgress = MODULES.reduce((acc, module) => {
      const attempts = attemptHistory.filter((attempt) => attempt.moduleId === module.id);
      const gradedAttempts = attempts.filter((attempt) => !attempt.ungraded);
      const moduleCorrect = gradedAttempts.filter((attempt) => attempt.correct).length;
      // "Seen" = unique questions touched, not raw attempt count, so reattempts
      // do not inflate progress.
      const uniqueSeen = new Set(attempts.map((attempt) => attempt.questionId)).size;
      acc[module.id] = {
        accuracy: gradedAttempts.length > 0 ? Math.round((moduleCorrect / gradedAttempts.length) * 100) : 0,
        avgTime:
          attempts.length > 0
            ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.responseTimeMs || 0), 0) / attempts.length / 1000)
            : 0,
        seen: uniqueSeen,
        attempts: attempts.length,
        graded: gradedAttempts.length,
        available: ALL_QUESTIONS[module.id]?.length ?? 0,
      };
      return acc;
    }, {} as Record<QuestionModuleId, { accuracy: number; avgTime: number; seen: number; attempts: number; graded: number; available: number }>);
    return { total, overallAccuracy, avgTime, currentStreak, moduleProgress };
  }, [attemptHistory]);

  const recommendedModule = useMemo(() => {
    if (savedDrillModuleId) {
      return MODULES.find((module) => module.id === savedDrillModuleId) ?? MODULES[0];
    }
    return MODULES.find((module) => stats.moduleProgress[module.id].seen === 0) ?? MODULES[0];
  }, [savedDrillModuleId, stats.moduleProgress]);

  const handleDrillButtonClick = (module: Module) => {
    setSelectedModuleForAction(module);
    if (savedDrillModuleId) {
      if (module.id === savedDrillModuleId) {
        setIsResumeModalOpen(true);
      } else {
        setIsOverwriteModalOpen(true);
      }
    } else {
      onStartDrill(module);
    }
  };

  const handleResume = () => {
    if (selectedModuleForAction) {
      onStartDrill(selectedModuleForAction);
    }
    setIsResumeModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleStartNew = () => {
    if (selectedModuleForAction) {
      localStorage.removeItem('causationCoachDrillProgress');
      setSavedDrillModuleId(null);
      onStartDrill(selectedModuleForAction);
    }
    setIsResumeModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleCloseResumeModal = () => {
    setIsResumeModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleConfirmOverwrite = () => {
    if (selectedModuleForAction) {
      localStorage.removeItem('causationCoachDrillProgress');
      setSavedDrillModuleId(null);
      onStartDrill(selectedModuleForAction);
    }
    setIsOverwriteModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleCancelOverwrite = () => {
    setIsOverwriteModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleResetClick = (module: Module) => {
    setSelectedModuleForAction(module);
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    if (selectedModuleForAction) {
      const usedIdsKey = `causationCoachUsedIds_${selectedModuleForAction.id}`;
      localStorage.removeItem(usedIdsKey);

      if (savedDrillModuleId === selectedModuleForAction.id) {
        localStorage.removeItem('causationCoachDrillProgress');
        setSavedDrillModuleId(null);
      }
    }
    setIsResetModalOpen(false);
    setSelectedModuleForAction(null);
    checkSavedProgress();
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const savedModuleInProgress = useMemo(() => {
    if (!savedDrillModuleId) return null;
    return MODULES.find(m => m.id === savedDrillModuleId);
  }, [savedDrillModuleId]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        {[
          ['Accuracy', `${stats.overallAccuracy}%`],
          ['Attempted', `${stats.total}`],
          ['Avg. time', `${stats.avgTime}s`],
          ['Streak', `${stats.currentStreak}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-card border border-border shadow-sm p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recommended next</p>
          <h3 className="text-sm font-semibold text-foreground mt-1">
            {savedDrillModuleId && recommendedModule ? `Resume ${recommendedModule.name}` : recommendedModule?.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {stats.total === 0
              ? 'Start a module to populate accuracy, journal entries, and next-action guidance.'
              : 'Continue with the least-worked module or resume the active drill.'}
          </p>
        </div>
        {recommendedModule ? (
          <button
            onClick={() => handleDrillButtonClick(recommendedModule)}
            className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
          >
            {savedDrillModuleId ? 'Resume Drill' : 'Start Drill'}
          </button>
        ) : null}
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Skill Drills</h3>
        <div className="space-y-6">
          {MODULES.map(mod => {
            const isResume = mod.id === savedDrillModuleId;
            const moduleStats = stats.moduleProgress[mod.id];

            return (
              <div key={mod.id} className="rounded-xl bg-card border border-border shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-grow w-full flex flex-col">
                  <h4 className="text-sm font-semibold text-foreground">{mod.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                  <div className="grid grid-cols-3 gap-3 mt-4 max-w-md">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Accuracy</p>
                      <p className="text-sm font-semibold text-foreground">
                        {moduleStats.graded > 0 ? `${moduleStats.accuracy}%` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Seen</p>
                      <p className="text-sm font-semibold text-foreground">
                        {moduleStats.seen}/{moduleStats.available}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Avg.</p>
                      <p className="text-sm font-semibold text-foreground">{moduleStats.avgTime}s</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0 self-center">
                  {isResume ? (
                    <button
                      onClick={() => handleDrillButtonClick(mod)}
                      className="rounded-lg border border-border text-foreground text-sm font-medium px-4 py-2 hover:bg-accent transition-colors duration-150"
                    >
                      Resume Drill
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDrillButtonClick(mod)}
                      className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
                    >
                      Start Drill
                    </button>
                  )}
                  <button
                    onClick={() => handleResetClick(mod)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Reset Module
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resume Modal */}
      <AlertDialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drill in Progress</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unfinished drill for "{selectedModuleForAction?.name}". Would you like to resume where you left off or start a new one? Starting a new drill will erase your previous progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartNew}>Start New</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume}>Resume Drill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overwrite Modal */}
      <AlertDialog open={isOverwriteModalOpen} onOpenChange={setIsOverwriteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Existing Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unfinished drill for "{savedModuleInProgress?.name}". Starting a new drill for "{selectedModuleForAction?.name}" will erase your previous progress. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverwrite}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverwrite}>Discard & Start</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Modal */}
      <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Module Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the question bank for "{selectedModuleForAction?.name}". You will start seeing questions you've already answered again. If you have an active drill for this module, it will also be erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseResetModal}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CSDashboard;
