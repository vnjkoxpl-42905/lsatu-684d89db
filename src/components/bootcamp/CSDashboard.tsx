import React, { useState, useEffect, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MODULES, Module } from '@/data/causationStation/constants';
import { ALL_QUESTIONS } from '@/data/causationStation/questions';
import { QuestionModuleId } from '@/types/causationStation';
import CSKpiCard from '@/components/bootcamp/CSKpiCard';
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

const PUNK_TOOLTIP_STYLE = {
  backgroundColor: '#0B1118',
  border: '1px solid rgba(155,176,200,0.2)',
  borderRadius: 8,
  fontSize: 12,
  color: '#EAF2FF',
};

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

  const chartData = useMemo(
    () =>
      MODULES.map((module) => ({
        name: module.name.replace(/^Module \d+: /, ''),
        accuracy: stats.moduleProgress[module.id].accuracy,
        graded: stats.moduleProgress[module.id].graded,
      })),
    [stats.moduleProgress],
  );

  // Accuracy Trend: running accuracy over graded attempts, in the order they
  // happened. Real data, not the source prototype's mock series — just the
  // same chart shape/visual treatment.
  const trendData = useMemo(() => {
    const graded = attemptHistory
      .filter((attempt) => !attempt.ungraded)
      .slice()
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
    let correctSoFar = 0;
    return graded.map((attempt, index) => {
      if (attempt.correct) correctSoFar += 1;
      return {
        index: index + 1,
        accuracy: Math.round((correctSoFar / (index + 1)) * 100),
      };
    });
  }, [attemptHistory]);

  // Common Pitfalls: real per-module error rate (100 - accuracy), one axis
  // per module. Same radar shape as the source prototype's mock "pitfalls"
  // series, driven by actual attempt data instead of static categories.
  const pitfallData = useMemo(
    () =>
      MODULES.map((module) => ({
        name: module.name.replace(/^Module \d+: /, ''),
        errorRate: stats.moduleProgress[module.id].graded > 0 ? 100 - stats.moduleProgress[module.id].accuracy : 0,
      })),
    [stats.moduleProgress],
  );

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <CSKpiCard label="Accuracy" value={`${stats.overallAccuracy}%`} />
        <CSKpiCard label="Attempted" value={`${stats.total}`} />
        <CSKpiCard label="Avg. time" value={`${stats.avgTime}s`} />
        <CSKpiCard label="Streak" value={`${stats.currentStreak}`} />
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-punk-text mb-4">Accuracy by module</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="csPunkBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF1AFF" />
                      <stop offset="100%" stopColor="#00FFF0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,176,200,0.15)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9BB0C8' }} interval={0} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#9BB0C8' }}
                    tickFormatter={(v) => `${v}%`}
                    width={36}
                  />
                  <Tooltip
                    formatter={(value: number, _name, entry) => [
                      `${value}% (${entry.payload.graded} graded)`,
                      'Accuracy',
                    ]}
                    contentStyle={PUNK_TOOLTIP_STYLE}
                  />
                  <Bar dataKey="accuracy" fill="url(#csPunkBarGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-5">
            <h3 className="text-sm font-semibold text-punk-text mb-4">Accuracy trend</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,176,200,0.15)" vertical={false} />
                  <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#9BB0C8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9BB0C8' }} tickFormatter={(v) => `${v}%`} width={36} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Accuracy']} contentStyle={PUNK_TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#00FFF0"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, style: { filter: 'drop-shadow(0 0 8px #00FFF0)' } }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-5">
            <h3 className="text-sm font-semibold text-punk-text mb-4">Common pitfalls</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={pitfallData}>
                  <PolarGrid stroke="rgba(155,176,200,0.2)" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#9BB0C8' }} />
                  <Radar dataKey="errorRate" stroke="#FF1AFF" fill="#FF1AFF" fillOpacity={0.3} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Error rate']} contentStyle={PUNK_TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-punk-sub">Recommended next</p>
          <h3 className="text-sm font-semibold text-punk-text mt-1">
            {savedDrillModuleId && recommendedModule ? `Resume ${recommendedModule.name}` : recommendedModule?.name}
          </h3>
          <p className="text-xs text-punk-sub mt-1 max-w-xl">
            {stats.total === 0
              ? 'Start a module to populate accuracy, journal entries, and next-action guidance.'
              : 'Continue with the least-worked module or resume the active drill.'}
          </p>
        </div>
        {recommendedModule ? (
          <button
            onClick={() => handleDrillButtonClick(recommendedModule)}
            className="rounded-full bg-punk-cyan text-punk-base text-sm font-semibold px-6 py-2 hover:bg-white hover:shadow-neon-cyan active:scale-95 transition-all duration-150"
          >
            {savedDrillModuleId ? 'Resume Drill' : 'Start Drill'}
          </button>
        ) : null}
      </div>

      <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-5">
        <h3 className="text-sm font-semibold text-punk-text mb-4">Skill Drills</h3>
        <div className="space-y-6">
          {MODULES.map(mod => {
            const isResume = mod.id === savedDrillModuleId;
            const moduleStats = stats.moduleProgress[mod.id];
            const masteryPct = moduleStats.graded > 0 ? moduleStats.accuracy : 0;

            return (
              <div key={mod.id} className="bg-punk-base/50 border border-punk-sub/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex-grow w-full flex flex-col">
                  <h4 className="font-semibold text-punk-text">{mod.name}</h4>
                  <p className="text-sm text-punk-sub mb-2">{mod.description}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-punk-sub uppercase tracking-wider text-xs">Mastery</span>
                      <span className="font-mono text-2xl text-punk-cyan drop-shadow-neon-cyan">
                        {moduleStats.graded > 0 ? `${moduleStats.accuracy}%` : '—'}
                      </span>
                    </div>
                    <div className="w-full bg-punk-panel rounded-full h-3 border border-punk-sub/20">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-punk-magenta to-punk-cyan shadow-neon-cyan transition-all duration-500"
                        style={{ width: `${masteryPct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3 max-w-md">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-punk-sub">Seen</p>
                        <p className="text-sm font-semibold text-punk-text">
                          {moduleStats.seen}/{moduleStats.available}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-punk-sub">Avg.</p>
                        <p className="text-sm font-semibold text-punk-text">{moduleStats.avgTime}s</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0 self-center">
                  {isResume ? (
                    <button
                      onClick={() => handleDrillButtonClick(mod)}
                      className="rounded-full border border-punk-sub text-punk-sub text-sm font-medium px-5 py-2 hover:text-punk-text hover:border-punk-text transition-colors duration-150"
                    >
                      Resume Drill
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDrillButtonClick(mod)}
                      className="rounded-full bg-punk-cyan text-punk-base text-sm font-semibold px-5 py-2 hover:bg-white hover:shadow-neon-cyan active:scale-95 transition-all duration-150"
                    >
                      Start Drill
                    </button>
                  )}
                  <button
                    onClick={() => handleResetClick(mod)}
                    className="text-xs text-punk-sub hover:text-punk-red transition-colors"
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
        <AlertDialogContent className="bg-punk-panel border-punk-sub/20 shadow-neon-magenta text-punk-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-punk-cyan">Drill in Progress</AlertDialogTitle>
            <AlertDialogDescription className="text-punk-sub">
              You have an unfinished drill for "{selectedModuleForAction?.name}". Would you like to resume where you left off or start a new one? Starting a new drill will erase your previous progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartNew} className="bg-transparent border border-punk-sub text-punk-sub hover:text-punk-text hover:bg-punk-base">Start New</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume} className="bg-punk-cyan text-punk-base hover:bg-white hover:shadow-neon-cyan">Resume Drill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overwrite Modal */}
      <AlertDialog open={isOverwriteModalOpen} onOpenChange={setIsOverwriteModalOpen}>
        <AlertDialogContent className="bg-punk-panel border-punk-sub/20 shadow-neon-magenta text-punk-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-punk-cyan">Discard Existing Progress?</AlertDialogTitle>
            <AlertDialogDescription className="text-punk-sub">
              You have an unfinished drill for "{savedModuleInProgress?.name}". Starting a new drill for "{selectedModuleForAction?.name}" will erase your previous progress. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverwrite} className="bg-transparent border border-punk-sub text-punk-sub hover:text-punk-text hover:bg-punk-base">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverwrite} className="bg-punk-magenta text-punk-base hover:shadow-neon-magenta">Discard & Start</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Modal */}
      <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <AlertDialogContent className="bg-punk-panel border-punk-sub/20 shadow-neon-magenta text-punk-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-punk-cyan">Reset Module Progress?</AlertDialogTitle>
            <AlertDialogDescription className="text-punk-sub">
              This will reset the question bank for "{selectedModuleForAction?.name}". You will start seeing questions you've already answered again. If you have an active drill for this module, it will also be erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseResetModal} className="bg-transparent border border-punk-sub text-punk-sub hover:text-punk-text hover:bg-punk-base">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-punk-red text-punk-text hover:shadow-neon-red"
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
