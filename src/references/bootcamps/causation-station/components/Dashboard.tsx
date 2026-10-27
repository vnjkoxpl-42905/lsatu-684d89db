
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, Line, 
  BarChart, Bar,
  RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import Card from './common/Card';
import Button from './common/Button';
import KpiCard from './KpiCard';
import Modal from '../assets/Modal';
import { MODULES } from '../constants';
import { Module } from '../constants';
import { ALL_QUESTIONS } from '../data/questions';
import type { QuestionModuleId } from '../types';

interface DashboardProps {
  studentName: string;
  onStartDrill: (module: Module) => void;
  onShowGuide: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ studentName, onStartDrill, onShowGuide }) => {
  const [attemptHistory, setAttemptHistory] = useState<Array<{
    questionId: string;
    moduleId: QuestionModuleId;
    correct: boolean;
    responseTimeMs: number;
    completedAt: string;
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
      console.error("Failed to parse saved drill progress:", error);
      localStorage.removeItem('causationCoachDrillProgress');
      setSavedDrillModuleId(null);
    }
  };

  useEffect(() => {
    checkSavedProgress();
    try {
      setAttemptHistory(JSON.parse(localStorage.getItem('causationCoachAttemptHistory') ?? '[]'));
    } catch (error) {
      console.error("Failed to parse causation attempt history:", error);
      localStorage.removeItem('causationCoachAttemptHistory');
      setAttemptHistory([]);
    }
  }, []);

  const stats = useMemo(() => {
    const total = attemptHistory.length;
    const correct = attemptHistory.filter((a) => a.correct).length;
    const overallAccuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgTimePerQuestion =
      total > 0 ? Math.round(attemptHistory.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) / total / 1000) : 0;
    let currentStreak = 0;
    for (let i = attemptHistory.length - 1; i >= 0; i -= 1) {
      if (!attemptHistory[i].correct) break;
      currentStreak += 1;
    }
    const moduleProgress = MODULES.reduce((acc, module) => {
      const attempts = attemptHistory.filter((a) => a.moduleId === module.id);
      const moduleCorrect = attempts.filter((a) => a.correct).length;
      acc[module.id] = {
        accuracy: attempts.length > 0 ? Math.round((moduleCorrect / attempts.length) * 100) : 0,
        avgTime:
          attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) / attempts.length / 1000)
            : 0,
        questionsAttempted: attempts.length,
      };
      return acc;
    }, {} as Record<QuestionModuleId, { accuracy: number; avgTime: number; questionsAttempted: number }>);
    const recentPerformance = attemptHistory.slice(-20).reduce((chunks, attempt, index) => {
      const bucket = Math.floor(index / 5);
      chunks[bucket] = chunks[bucket] ?? [];
      chunks[bucket].push(attempt);
      return chunks;
    }, [] as typeof attemptHistory[]).map((chunk, index) => ({
      name: `Set ${index + 1}`,
      accuracy: chunk.length > 0 ? Math.round((chunk.filter((a) => a.correct).length / chunk.length) * 100) : 0,
    }));
    const performanceByConcept = MODULES.map((module) => ({
      concept: module.name.replace('Module ', '').slice(0, 18),
      accuracy: moduleProgress[module.id].accuracy,
    }));
    const errorAnalysis = MODULES.map((module) => {
      const attempts = attemptHistory.filter((a) => a.moduleId === module.id);
      const misses = attempts.filter((a) => !a.correct).length;
      return {
        reason: module.name.replace('Module ', '').slice(0, 14),
        percentage: total > 0 ? Math.round((misses / total) * 100) : 0,
      };
    });
    return { overallAccuracy, avgTimePerQuestion, currentStreak, moduleProgress, recentPerformance, performanceByConcept, errorAnalysis };
  }, [attemptHistory]);

  const handleDrillButtonClick = (module: Module) => {
    setSelectedModuleForAction(module);
    if (savedDrillModuleId) {
        if (module.id === savedDrillModuleId) {
            // Case A: Starting the same module with progress
            setIsResumeModalOpen(true);
        } else {
            // Case B: Starting a different module when progress exists for another
            setIsOverwriteModalOpen(true);
        }
    } else {
        // Case C: No saved progress, just start
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
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="5%" stopColor="#FF1AFF" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#00FFF0" stopOpacity={0.8}/>
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-punk-text">
          Let's get to work, <span className="text-punk-magenta">{studentName}</span>.
        </h2>
        <Button variant="ghost" onClick={onShowGuide} className="self-start sm:self-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Replay Intro
        </Button>
      </div>

      {attemptHistory.length === 0 && !savedDrillModuleId ? (
        <Card className="mb-8">
          <h3 className="text-xl font-bold text-punk-text mb-2">No drill data yet</h3>
          <p className="text-punk-sub">
            Start any module to populate accuracy, timing, journal entries, and next-action guidance.
          </p>
        </Card>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard title="Overall Accuracy" value={`${stats.overallAccuracy}%`} description="Across all modules" />
        <KpiCard title="Avg. Response Time" value={`${stats.avgTimePerQuestion}s`} description="Per question" />
        <KpiCard title="Current Streak" value={`${stats.currentStreak}`} description="Correct answers in a row" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules */}
        <div className="lg:col-span-2">
            <Card>
            <h3 className="text-xl font-bold text-punk-text mb-4">Skill Drills</h3>
            <div className="space-y-6">
                {MODULES.map(module => {
                const moduleStats = stats.moduleProgress[module.id];
                const isResume = module.id === savedDrillModuleId;
                const availableCount = ALL_QUESTIONS[module.id]?.length ?? 0;
                
                return (
                <div key={module.id} className="bg-punk-base/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex-grow w-full flex flex-col">
                    <h4 className="font-semibold text-punk-text">{module.name}</h4>
                    <p className="text-sm text-punk-sub mb-2">{module.description}</p>
                    <p className="text-xs text-punk-sub/80 mb-2">{availableCount} questions in the local bank</p>
                    
                    <div className="mt-2 space-y-4">
                        <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-punk-sub uppercase tracking-wider text-xs">Mastery</span>
                            <span className="font-mono text-2xl text-punk-cyan drop-shadow-neon-cyan">{moduleStats.accuracy}%</span>
                        </div>
                        <div className="w-full bg-punk-panel rounded-full h-3 border border-punk-sub/20">
                            <div
                            className="bg-gradient-to-r from-punk-magenta to-punk-cyan h-full rounded-full transition-all duration-500 ease-out shadow-neon-cyan"
                            style={{ width: `${moduleStats.accuracy}%` }}
                            ></div>
                        </div>
                        </div>
                        <div className="flex justify-around text-center pt-3 border-t border-punk-sub/10">
                        <div>
                            <div className="font-mono text-xl text-punk-text">{`${moduleStats.avgTime}s`}</div>
                            <div className="text-xs text-punk-sub">Avg. Time</div>
                        </div>
                        <div>
                            <div className="font-mono text-xl text-punk-text">{moduleStats.questionsAttempted}</div>
                            <div className="text-xs text-punk-sub">Attempted</div>
                        </div>
                        </div>
                    </div>

                    </div>
                    <div className="sm:ml-4 flex-shrink-0 self-center flex flex-col gap-2">
                    <Button onClick={() => handleDrillButtonClick(module)} variant={isResume ? 'secondary' : 'primary'}>
                        {isResume ? 'Resume Drill' : 'Start Drill'}
                    </Button>
                    <Button onClick={() => handleResetClick(module)} variant="ghost" className="text-xs py-1">
                        Reset Module
                    </Button>
                    </div>
                </div>
                )})}
            </div>
            </Card>
        </div>
        
        {/* Analytics Column */}
        <div className="space-y-6">
            <Card>
                <h3 className="text-xl font-bold text-punk-text mb-4">Accuracy Trend</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.recentPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(155, 176, 200, 0.2)" />
                        <XAxis dataKey="name" stroke="#9BB0C8" fontSize={12} />
                        <YAxis unit="%" stroke="#9BB0C8" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                        contentStyle={{ 
                            backgroundColor: '#0B1118', 
                            border: '1px solid rgba(155, 176, 200, 0.2)',
                            color: '#EAF2FF' 
                        }}
                        />
                        <Line type="monotone" dataKey="accuracy" stroke="#00FFF0" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8, filter: 'drop-shadow(0 0 8px #00FFF0)' }} />
                    </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card>
                <h3 className="text-xl font-bold text-punk-text mb-4">Performance by Concept</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.performanceByConcept} layout="vertical" margin={{ top: 5, right: 10, left: 25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(155, 176, 200, 0.1)" />
                        <XAxis type="number" unit="%" domain={[0, 100]} stroke="#9BB0C8" fontSize={12} />
                        <YAxis type="category" dataKey="concept" stroke="#9BB0C8" fontSize={12} width={80} tick={{ fill: '#EAF2FF' }} />
                        <Tooltip
                            cursor={{ fill: 'rgba(0, 255, 240, 0.1)' }}
                            contentStyle={{ 
                                backgroundColor: '#0B1118', 
                                border: '1px solid rgba(155, 176, 200, 0.2)',
                                color: '#EAF2FF' 
                            }}
                        />
                        <Bar dataKey="accuracy" fill="url(#barGradient)" barSize={15} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card>
                <h3 className="text-xl font-bold text-punk-text mb-4">Common Pitfalls</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.errorAnalysis}>
                        <PolarGrid stroke="rgba(155, 176, 200, 0.2)" />
                        <PolarAngleAxis dataKey="reason" stroke="#EAF2FF" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 40]} tick={false} axisLine={false} />
                        <Radar name="Errors" dataKey="percentage" stroke="#FF1AFF" fill="#FF1AFF" fillOpacity={0.6} />
                        <Tooltip
                            contentStyle={{ 
                                backgroundColor: '#0B1118', 
                                border: '1px solid rgba(155, 176, 200, 0.2)',
                                color: '#EAF2FF' 
                            }}
                        />
                    </RadarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
      </div>

      <Modal 
        isOpen={isResumeModalOpen} 
        onClose={handleCloseResumeModal}
        title="Drill in Progress"
      >
        <p className="text-punk-sub mb-6">
          You have an unfinished drill for "{selectedModuleForAction?.name}". Would you like to resume where you left off or start a new one? Starting a new drill will erase your previous progress.
        </p>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={handleStartNew}>Start New</Button>
          <Button variant="secondary" onClick={handleResume}>Resume Drill</Button>
        </div>
      </Modal>

      <Modal 
        isOpen={isOverwriteModalOpen} 
        onClose={handleCancelOverwrite}
        title="Discard Existing Progress?"
      >
        <p className="text-punk-sub mb-6">
          You have an unfinished drill for "{savedModuleInProgress?.name}". Starting a new drill for "{selectedModuleForAction?.name}" will erase your previous progress. Are you sure you want to continue?
        </p>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={handleCancelOverwrite}>Cancel</Button>
          <Button variant="secondary" onClick={handleConfirmOverwrite}>Discard & Start</Button>
        </div>
      </Modal>

      <Modal 
        isOpen={isResetModalOpen} 
        onClose={handleCloseResetModal}
        title="Reset Module Progress?"
      >
        <p className="text-punk-sub mb-6">
          This will reset the question bank for "{selectedModuleForAction?.name}". You will start seeing questions you've already answered again. If you have an active drill for this module, it will also be erased.
        </p>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={handleCloseResetModal}>Cancel</Button>
          <Button variant="red" onClick={handleConfirmReset}>Reset Module</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
