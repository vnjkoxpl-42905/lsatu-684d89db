import React, { useState, useEffect, useMemo } from 'react';
import { mirroredRemoveItem } from '@/lib/cloudMirror';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
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
import { useAuth } from '@/contexts/AuthContext';
import { RotateCcw } from 'lucide-react';
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
  border: '1px solid rgba(155, 176, 200, 0.2)',
  borderRadius: 8,
  fontSize: 12,
  color: '#EAF2FF',
};

interface CSDashboardProps {
  onStartDrill: (module: Module) => void;
  onReplayIntro?: () => void;
}

const CSDashboard: React.FC<CSDashboardProps> = ({ onStartDrill, onReplayIntro }) => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'f.';

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
    const graded = attemptHistory.filter((attempt) => !attempt.ungraded);
    const correct = graded.filter((attempt) => attempt.correct).length;

    const overallAccuracy = graded.length > 0 ? Math.round((correct / graded.length) * 100) : null;
    const avgTime =
      total > 0
        ? Math.round(attemptHistory.reduce((sum, attempt) => sum + (attempt.responseTimeMs || 0), 0) / total / 1000)
        : null;

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
      const uniqueSeen = new Set(attempts.map((attempt) => attempt.questionId)).size;

      acc[module.id] = {
        accuracy: gradedAttempts.length > 0 ? Math.round((moduleCorrect / gradedAttempts.length) * 100) : null,
        avgTime: attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) / attempts.length / 1000) : null,
        seen: uniqueSeen,
        attempts: attempts.length,
        graded: gradedAttempts.length,
        available: ALL_QUESTIONS[module.id]?.length ?? 0,
      };
      return acc;
    }, {} as Record<QuestionModuleId, { accuracy: number | null; avgTime: number | null; seen: number; attempts: number; graded: number; available: number }>);

    return { total, overallAccuracy, avgTime, currentStreak, moduleProgress };
  }, [attemptHistory]);

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
      mirroredRemoveItem('causationCoachDrillProgress');
      setSavedDrillModuleId(null);
      onStartDrill(selectedModuleForAction);
    }
    setIsResumeModalOpen(false);
    setSelectedModuleForAction(null);
  };

  const handleConfirmOverwrite = () => {
    if (selectedModuleForAction) {
      mirroredRemoveItem('causationCoachDrillProgress');
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
      mirroredRemoveItem(usedIdsKey);

      if (savedDrillModuleId === selectedModuleForAction.id) {
        mirroredRemoveItem('causationCoachDrillProgress');
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

  const gradedHistory = useMemo(
    () => attemptHistory.filter((attempt) => !attempt.ungraded),
    [attemptHistory],
  );

  // Accuracy Trend — rolling accuracy over the student's graded attempts,
  // bucketed into up to 5 equal chunks.
  const recentPerformance = useMemo(() => {
    if (gradedHistory.length === 0) return [];
    const buckets = Math.min(5, gradedHistory.length);
    const size = Math.ceil(gradedHistory.length / buckets);
    const out: { name: string; accuracy: number }[] = [];
    for (let i = 0; i < gradedHistory.length; i += size) {
      const chunk = gradedHistory.slice(i, i + size);
      const correct = chunk.filter((a) => a.correct).length;
      out.push({
        name: `Set ${out.length + 1}`,
        accuracy: Math.round((correct / chunk.length) * 100),
      });
    }
    return out;
  }, [gradedHistory]);

  // Performance by Concept — real per-module accuracy (modules with attempts).
  const performanceByConcept = useMemo(
    () =>
      MODULES
        .filter((module) => (stats.moduleProgress[module.id]?.graded ?? 0) > 0)
        .map((module) => ({
          concept: module.name,
          accuracy: stats.moduleProgress[module.id].accuracy ?? 0,
        })),
    [stats],
  );

  // Common Pitfalls — where the student's misses actually come from.
  const errorAnalysis = useMemo(() => {
    const misses = gradedHistory.filter((a) => !a.correct);
    if (misses.length === 0) return [];
    return MODULES.map((module) => ({
      reason: module.name,
      percentage: Math.round(
        (misses.filter((a) => a.moduleId === module.id).length / misses.length) * 100,
      ),
    })).filter((entry) => entry.percentage > 0);
  }, [gradedHistory]);

  return (
    <div className="space-y-8">
      {/* Top Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-punk-text tracking-tight">
            Let's get to work, <span className="text-punk-magenta">{userName}</span>.
          </h1>
        </div>
        {onReplayIntro && (
          <button
            onClick={onReplayIntro}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-full border border-punk-sub/30 bg-punk-panel/50 text-punk-sub hover:text-punk-text hover:border-punk-cyan transition-all text-xs font-medium backdrop-blur-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Intro</span>
          </button>
        )}
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg p-6 shadow-lg">
          <div className="text-xs uppercase tracking-wider text-punk-sub font-medium mb-1">Overall Accuracy</div>
          <div className="text-4xl font-extrabold text-punk-cyan drop-shadow-neon-cyan mb-1">
            {stats.overallAccuracy === null ? '—' : `${stats.overallAccuracy}%`}
          </div>
          <div className="text-xs text-punk-sub">{stats.overallAccuracy === null ? 'No attempts yet' : 'Across all modules'}</div>
        </div>

        <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg p-6 shadow-lg">
          <div className="text-xs uppercase tracking-wider text-punk-sub font-medium mb-1">Avg. Response Time</div>
          <div className="text-4xl font-extrabold text-punk-cyan drop-shadow-neon-cyan mb-1">
            {stats.avgTime === null ? '—' : `${stats.avgTime}s`}
          </div>
          <div className="text-xs text-punk-sub">Per question</div>
        </div>

        <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg p-6 shadow-lg">
          <div className="text-xs uppercase tracking-wider text-punk-sub font-medium mb-1">Current Streak</div>
          <div className="text-4xl font-extrabold text-punk-cyan drop-shadow-neon-cyan mb-1">{stats.currentStreak}</div>
          <div className="text-xs text-punk-sub">Correct answers in a row</div>
        </div>
      </div>

      {/* Main 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Skill Drills */}
        <div className="lg:col-span-8">
          <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold text-punk-text mb-6">Skill Drills</h2>
            <div className="space-y-8">
              {MODULES.map((module) => {
                const isResume = module.id === savedDrillModuleId;
                const moduleStats = stats.moduleProgress[module.id];

                return (
                  <div key={module.id} className="pb-6 border-b border-punk-sub/10 last:border-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-punk-text mb-1">{module.name}</h3>
                        <p className="text-xs text-punk-sub mb-4">{module.description}</p>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="font-semibold text-punk-sub uppercase tracking-wider text-[10px]">Mastery</span>
                              <span className="font-mono text-2xl font-bold text-punk-cyan drop-shadow-neon-cyan">
                                {moduleStats.accuracy === null ? '—' : `${moduleStats.accuracy}%`}
                              </span>
                            </div>
                            <div className="w-full bg-punk-base rounded-full h-3 border border-punk-sub/20 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-punk-magenta to-punk-cyan h-full rounded-full transition-all duration-500 shadow-neon-cyan"
                                style={{ width: `${moduleStats.accuracy ?? 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-around text-center pt-2">
                            <div>
                              <div className="font-mono text-lg font-bold text-punk-text">{moduleStats.avgTime === null ? '—' : `${moduleStats.avgTime}s`}</div>
                              <div className="text-[11px] text-punk-sub">Avg. Time</div>
                            </div>
                            <div>
                              <div className="font-mono text-lg font-bold text-punk-text">{moduleStats.attempts}</div>
                              <div className="text-[11px] text-punk-sub">Attempted</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="sm:ml-4 flex-shrink-0 self-center sm:self-start flex flex-col gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleDrillButtonClick(module)}
                          className={`w-full sm:w-auto rounded-full text-xs font-semibold px-6 py-2.5 transition-all duration-150 shadow-md ${
                            isResume
                              ? 'bg-punk-magenta text-punk-base hover:shadow-neon-magenta'
                              : 'bg-punk-cyan text-punk-base hover:bg-white hover:shadow-neon-cyan'
                          }`}
                        >
                          {isResume ? 'Resume Drill' : 'Start Drill'}
                        </button>
                        <button
                          onClick={() => handleResetClick(module)}
                          className="text-xs text-punk-sub hover:text-punk-red transition-colors py-1 text-center"
                        >
                          Reset Module
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Analytics Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Accuracy Trend */}
          <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-bold text-punk-text mb-4">Accuracy Trend</h3>
            <div className="h-60">
              {recentPerformance.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-punk-sub text-center px-4">
                  Run a drill to start tracking your accuracy over time.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(155, 176, 200, 0.2)" />
                  <XAxis dataKey="name" stroke="#9BB0C8" fontSize={11} />
                  <YAxis unit="%" stroke="#9BB0C8" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={PUNK_TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#00FFF0"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8, style: { filter: 'drop-shadow(0 0 8px #00FFF0)' } }}
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Performance by Concept */}
          <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-bold text-punk-text mb-4">Performance by Concept</h3>
            <div className="h-60">
              {performanceByConcept.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-punk-sub text-center px-4">
                  No graded attempts yet — your per-module accuracy will appear here.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceByConcept} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF1AFF" />
                      <stop offset="100%" stopColor="#00FFF0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(155, 176, 200, 0.1)" />
                  <XAxis type="number" unit="%" domain={[0, 100]} stroke="#9BB0C8" fontSize={11} />
                  <YAxis type="category" dataKey="concept" stroke="#9BB0C8" fontSize={11} width={85} tick={{ fill: '#EAF2FF' }} />
                  <Tooltip cursor={{ fill: 'rgba(0, 255, 240, 0.1)' }} contentStyle={PUNK_TOOLTIP_STYLE} />
                  <Bar dataKey="accuracy" fill="url(#barGradient)" barSize={14} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Common Pitfalls */}
          <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-bold text-punk-text mb-4">Where Your Misses Come From</h3>
            <div className="h-60">
              {errorAnalysis.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-punk-sub text-center px-4">
                  No missed questions logged yet.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={errorAnalysis}>
                  <PolarGrid stroke="rgba(155, 176, 200, 0.2)" />
                  <PolarAngleAxis dataKey="reason" stroke="#EAF2FF" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Misses" dataKey="percentage" stroke="#FF1AFF" fill="#FF1AFF" fillOpacity={0.6} />
                  <Tooltip contentStyle={PUNK_TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
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

