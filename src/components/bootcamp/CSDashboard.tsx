import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { MODULES, MOCK_DASHBOARD_STATS, Module } from '@/data/causationStation/constants';
import { useTheme } from '@/contexts/ThemeContext';
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
  const stats = MOCK_DASHBOARD_STATS;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [savedDrillModuleId, setSavedDrillModuleId] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedModuleForAction, setSelectedModuleForAction] = useState<Module | null>(null);

  // Theme-adaptive chart colors
  const gridStroke = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const axisStroke = isLight ? '#71717a' : '#a1a1aa';
  const tickFill = isLight ? '#3f3f46' : '#d4d4d8';
  const tooltipBg = isLight ? '#ffffff' : '#18181b';
  const tooltipBorder = isLight ? '#e4e4e7' : '#3f3f46';
  const tooltipColor = isLight ? '#18181b' : '#fafafa';

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
  }, []);

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
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="csBarGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.9} />
          </linearGradient>
        </defs>
      </svg>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Overall Accuracy', value: `${stats.overallAccuracy}%`, description: 'Across all modules' },
          { title: 'Avg. Response Time', value: `${stats.avgTimePerQuestion}s`, description: 'Per question' },
          { title: 'Current Streak', value: `${stats.currentStreak}`, description: 'Correct answers in a row' },
        ].map(kpi => (
          <div key={kpi.title} className="rounded-xl bg-card border border-border shadow-sm p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{kpi.title}</p>
            <p className="font-mono text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules */}
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Skill Drills</h3>
            <div className="space-y-6">
              {MODULES.map(mod => {
                const moduleStats = stats.moduleProgress[mod.id];
                const isResume = mod.id === savedDrillModuleId;

                return (
                  <div key={mod.id} className="rounded-xl bg-card border border-border shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-grow w-full flex flex-col">
                      <h4 className="text-sm font-semibold text-foreground">{mod.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-3">{mod.description}</p>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mastery</span>
                            <span className="font-mono text-xl font-bold text-foreground">{moduleStats.accuracy}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${moduleStats.accuracy}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-around text-center pt-3 border-t border-border">
                          <div>
                            <div className="font-mono text-base text-foreground">{`${moduleStats.avgTime}s`}</div>
                            <div className="text-xs text-muted-foreground">Avg. Time</div>
                          </div>
                          <div>
                            <div className="font-mono text-base text-foreground">{moduleStats.questionsAttempted}</div>
                            <div className="text-xs text-muted-foreground">Attempted</div>
                          </div>
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
        </div>

        {/* Analytics Column */}
        <div className="space-y-6">
          <div className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Accuracy Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.recentPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" stroke={axisStroke} fontSize={12} tick={{ fill: tickFill }} />
                  <YAxis unit="%" stroke={axisStroke} fontSize={12} domain={[0, 100]} tick={{ fill: tickFill }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      color: tooltipColor,
                    }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Performance by Concept</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.performanceByConcept} layout="vertical" margin={{ top: 5, right: 10, left: 25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" unit="%" domain={[0, 100]} stroke={axisStroke} fontSize={12} tick={{ fill: tickFill }} />
                  <YAxis type="category" dataKey="concept" stroke={axisStroke} fontSize={12} width={80} tick={{ fill: tickFill }} />
                  <Tooltip
                    cursor={{ fill: isLight ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.15)' }}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      color: tooltipColor,
                    }}
                  />
                  <Bar dataKey="accuracy" fill="#6366f1" barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Common Pitfalls</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.errorAnalysis}>
                  <PolarGrid stroke={gridStroke} />
                  <PolarAngleAxis dataKey="reason" stroke={axisStroke} fontSize={11} tick={{ fill: tickFill }} />
                  <PolarRadiusAxis angle={30} domain={[0, 40]} tick={false} axisLine={false} />
                  <Radar name="Errors" dataKey="percentage" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.6} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      color: tooltipColor,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
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
