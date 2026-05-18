import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell, PieChart, Pie } from 'recharts';
import { FLAW_CATALOG } from '../data/flaws';
import { DRILLS, Drill } from '../data/drills';

type Step = 'list' | 'dashboard' | 'start' | 'conclusion' | 'support' | 'identify' | 'gap' | 'answer' | 'finish';
type Difficulty = 'easy' | 'medium' | 'hard' | null;

function VideoExplanation({ stimulus, flawName, explanation, correctAnswer, incorrectAnswer }: { stimulus: string, flawName: string, explanation: string, correctAnswer?: string, incorrectAnswer?: string }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const pollInterval = useRef<any>(null);

  const startGeneration = async () => {
    setLoading(true);
    setError(null);
    setStatus('Crafting visual explanation...');
    try {
      const prompt = `A clean, educational motion graphics animation explaining an LSAT logical flaw. 
Stimulus: "${stimulus}"
Flaw: ${flawName}
${correctAnswer ? `Correct Answer: "${correctAnswer}"` : ''}
${incorrectAnswer ? `Incorrect Answer Chosen: "${incorrectAnswer}"` : ''}
Focus: ${incorrectAnswer ? 'Visually highlight why the chosen answer is incorrect, specifically contrasting it with the actual logical gap, and then demonstrate why the correct answer is superior.' : correctAnswer ? 'Visually demonstrate exactly how the correct answer maps textually back to specific parts of the stimulus, explicitly contrasting the flawed reasoning.' : 'Visually highlight the relationship between the premises and the conclusion.'} 
The animation should use elegant, minimalist icons and text overlays in a high-end academic style. 
Explain: ${explanation}`;

      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      pollStatus(data.operationName);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollStatus = (operationName: string) => {
    setStatus('Generating video (Veo is thinking)...');
    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch('/api/video/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const data = await res.json();
        if (data.error) {
          clearInterval(pollInterval.current);
          throw new Error(data.error.message || "Generation failed");
        }
        if (data.done) {
          clearInterval(pollInterval.current);
          downloadVideo(operationName);
        }
      } catch (err: any) {
        clearInterval(pollInterval.current);
        setError(err.message);
        setLoading(false);
      }
    }, 5000);
  };

  const downloadVideo = async (operationName: string) => {
    setStatus('Finalizing video...');
    try {
      const res = await fetch('/api/video/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });
      if (!res.ok) throw new Error("Failed to download video");
      const blob = await res.blob();
      setVideoUrl(URL.createObjectURL(blob));
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    startGeneration();
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  if (videoUrl) {
    return (
      <div className="mt-4 border border-[#1a1a1a]/10 rounded-sm overflow-hidden bg-black aspect-video relative group">
        <video 
          src={videoUrl} 
          controls 
          autoPlay 
          loop 
          className="w-full h-full object-contain"
        />
        <div className="absolute top-2 left-2 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          Veo Visual Explanation
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {error ? (
        <div className="text-[10px] text-red-500 bg-red-50 p-2 border border-red-100 rounded-sm">
          Failed to load visual explanation: {error}
          <button onClick={startGeneration} className="ml-2 underline font-bold uppercase">Retry</button>
        </div>
      ) : (
        <div className="bg-[#1a1a1a]/5 p-6 rounded-sm border border-dashed border-[#1a1a1a]/20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 relative">
            <motion.div 
              className="absolute inset-0 border-2 border-t-[#1a1a1a] border-r-transparent border-b-transparent border-l-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-widest font-bold block mb-1">Veo AI Visualizing...</span>
            <span className="text-xs italic text-[#1a1a1a]/60">{status || 'Starting engine...'}</span>
          </div>
          <p className="text-[9px] text-[#1a1a1a]/40 max-w-[200px] text-center">
            Veo is generating a custom video explanation. This takes about 60 seconds.
          </p>
        </div>
      )}
    </div>
  );
}

function PerformanceDashboard({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    try {
      const savedStats = JSON.parse(localStorage.getItem('lsat_flaw_performance') || '{}');
      const data = Object.entries(savedStats).map(([name, val]: [string, any]) => ({
        name,
        accuracy: Math.round((val.correct / val.attempts) * 100),
        avgTime: Math.round(val.totalTime / val.attempts),
        attempts: val.attempts
      })).sort((a, b) => b.accuracy - a.accuracy);
      setStats(data);
    } catch (e) {
      setStats([]);
    }
  }, []);

  if (!stats || stats.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-[#1a1a1a]/5 rounded-full flex items-center justify-center text-3xl">📊</div>
        <div className="space-y-2">
          <h3 className="text-2xl font-serif italic">No performance data yet</h3>
          <p className="text-sm text-[#1a1a1a]/50 max-w-sm">Complete a few drills to see your strengths and weaknesses visualized here.</p>
        </div>
        <button 
          onClick={onBack}
          className="px-8 py-3 border border-[#1a1a1a] text-xs font-bold uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-white transition-all rounded-sm"
        >
          Back to Drills
        </button>
      </motion.div>
    );
  }

  const chartData = stats.map((s: any) => ({
    subject: s.name.length > 15 ? s.name.substring(0, 12) + '...' : s.name,
    A: s.accuracy,
    fullMark: 100,
  }));

  const bestFlaw = stats[0];
  const worstFlaw = stats[stats.length - 1];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-10"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <button 
            onClick={onBack}
            className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors mb-2 block"
          >
            ← Back to drills
          </button>
          <h2 className="text-4xl font-serif tracking-tighter italic">Performance Dashboard</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar Chart for Strengths */}
        <div className="p-6 border border-[#1a1a1a]/10 bg-[#f5f2ed]/30 rounded-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a]/60">Mastery Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="#1a1a1a" strokeOpacity={0.1} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#1a1a1a', fillOpacity: 0.5 }} />
                <Radar
                  name="Accuracy %"
                  dataKey="A"
                  stroke="#1a1a1a"
                  fill="#1a1a1a"
                  fillOpacity={0.1}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracy Bar Chart */}
        <div className="p-6 border border-[#1a1a1a]/10 bg-white rounded-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a]/60">Accuracy per Flaw Type</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 9, fill: '#1a1a1a', fillOpacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: '#f5f2ed' }} />
                <Bar dataKey="accuracy" radius={[0, 2, 2, 0]}>
                  {stats.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.accuracy >= 80 ? '#1a1a1a' : entry.accuracy >= 50 ? '#1a1a1a' : '#1a1a1a'} 
                      fillOpacity={entry.accuracy >= 80 ? 1 : entry.accuracy >= 50 ? 0.6 : 0.3} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-[#1a1a1a] text-white rounded-sm space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Top Strength</span>
          <div className="text-xl font-serif italic">{bestFlaw.name}</div>
          <div className="text-2xl font-bold">{bestFlaw.accuracy}%</div>
        </div>
        <div className="p-6 border border-[#1a1a1a]/10 rounded-sm space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-[#1a1a1a]/40 font-bold">Growth Area</span>
          <div className="text-xl font-serif italic text-red-800">{worstFlaw.name}</div>
          <div className="text-2xl font-bold">{worstFlaw.accuracy}%</div>
        </div>
        <div className="p-6 border border-[#1a1a1a]/10 rounded-sm space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-[#1a1a1a]/40 font-bold">Avg Response Time</span>
          <div className="text-xl font-serif italic">{Math.round(stats.reduce((acc: number, curr: any) => acc + curr.avgTime, 0) / stats.length)}s</div>
          <p className="text-[10px] text-[#1a1a1a]/40">Cumulative average across all flaw types</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a]/60">Detailed Metrics</h3>
        <div className="w-full border border-[#1a1a1a]/10 overflow-hidden rounded-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5f2ed] border-b border-[#1a1a1a]/10">
              <tr>
                <th className="p-3 font-bold uppercase tracking-widest text-[9px] text-[#1a1a1a]/50">Flaw Type</th>
                <th className="p-3 font-bold uppercase tracking-widest text-[9px] text-[#1a1a1a]/50">Accuracy</th>
                <th className="p-3 font-bold uppercase tracking-widest text-[9px] text-[#1a1a1a]/50">Avg Time</th>
                <th className="p-3 font-bold uppercase tracking-widest text-[9px] text-[#1a1a1a]/50">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]/5">
              {stats.map((s: any) => (
                <tr key={s.name} className="hover:bg-[#f5f2ed]/20 transition-colors">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-[#1a1a1a]/5 overflow-hidden rounded-full">
                        <div className="h-full bg-[#1a1a1a]" style={{ width: `${s.accuracy}%` }} />
                      </div>
                      {s.accuracy}%
                    </div>
                  </td>
                  <td className="p-3">{s.avgTime}s</td>
                  <td className="p-3 text-[#1a1a1a]/40">{s.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

export function GuidedDrills({ initialDrillId, onClearInitialDrill }: { initialDrillId?: string, onClearInitialDrill?: () => void }) {
  const [step, setStep] = useState<Step>('list');
  const [activeDrill, setActiveDrill] = useState<Drill | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [drillQueue, setDrillQueue] = useState<Drill[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [sessionTotalCount, setSessionTotalCount] = useState(0);
  const [hasScoredCurrentQuestion, setHasScoredCurrentQuestion] = useState(false);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>(null);
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);

  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const SAVE_KEY = 'lsat-fallacy-drills-progress';

  // Check for initial drill selection from parent
  useEffect(() => {
    if (initialDrillId) {
      const drill = DRILLS.find(d => d.id === initialDrillId);
      if (drill) {
        startDrill(drill);
        if (onClearInitialDrill) onClearInitialDrill();
      }
    }
  }, [initialDrillId, onClearInitialDrill]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      setHasSavedProgress(true);
    }
  }, []);

  useEffect(() => {
    if (step === 'list') {
      return;
    }
    if (step === 'finish') {
      localStorage.removeItem(SAVE_KEY);
      setHasSavedProgress(false);
      return;
    }
    const stateToSave = {
      step,
      activeDrillId: activeDrill?.id,
      drillQueueIds: drillQueue.map(d => d.id),
      currentQueueIndex,
      selectedAnswer,
      showFeedback,
      sessionCorrectCount,
      sessionTotalCount,
      hasScoredCurrentQuestion,
      activeDifficulty,
      isTimerEnabled,
      elapsedTime
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
    setHasSavedProgress(true);
  }, [step, activeDrill, drillQueue, currentQueueIndex, selectedAnswer, showFeedback, sessionCorrectCount, sessionTotalCount, hasScoredCurrentQuestion, activeDifficulty, isTimerEnabled, elapsedTime]);

  const resumeSession = () => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setStep(state.step);
        setActiveDrill(DRILLS.find(d => d.id === state.activeDrillId) || null);
        setDrillQueue(state.drillQueueIds.map((id: string) => DRILLS.find(d => d.id === id)).filter(Boolean) as Drill[]);
        setCurrentQueueIndex(state.currentQueueIndex);
        setSelectedAnswer(state.selectedAnswer);
        setShowFeedback(state.showFeedback);
        setSessionCorrectCount(state.sessionCorrectCount);
        setSessionTotalCount(state.sessionTotalCount);
        setHasScoredCurrentQuestion(state.hasScoredCurrentQuestion);
        setActiveDifficulty(state.activeDifficulty);
        setIsTimerEnabled(state.isTimerEnabled);
        setElapsedTime(state.elapsedTime);
        setQuestionStartTime(Date.now());
      }
    } catch (e) {
      console.error("Failed to resume session:", e);
      localStorage.removeItem(SAVE_KEY);
      setHasSavedProgress(false);
    }
  };

  const saveAndExit = () => {
    const stateToSave = {
      step,
      activeDrillId: activeDrill?.id,
      drillQueueIds: drillQueue.map(d => d.id),
      currentQueueIndex,
      selectedAnswer,
      showFeedback,
      sessionCorrectCount,
      sessionTotalCount,
      hasScoredCurrentQuestion,
      activeDifficulty,
      isTimerEnabled,
      elapsedTime
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
    setHasSavedProgress(true);
    setStep('list');
  };

  useEffect(() => {
    let interval: any;
    if (isTimerEnabled && step !== 'list' && step !== 'start' && step !== 'finish') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerEnabled, step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startDrill = (drill: Drill) => {
    setActiveDrill(drill);
    setDrillQueue([drill]);
    setCurrentQueueIndex(0);
    setStep('start');
    setSessionCorrectCount(0);
    setSessionTotalCount(0);
    setHasScoredCurrentQuestion(false);
    setActiveDifficulty(null);
    setElapsedTime(0);
    setQuestionStartTime(Date.now());
  };

  const startMixedDrill = (difficulty: Difficulty) => {
    let rawStats: Record<string, { attempts: number; correct: number }> = {};
    try {
      rawStats = JSON.parse(localStorage.getItem('lsat_flaw_performance') || '{}');
    } catch(e) {}
    
    // Calculate weakness score: higher score = weaker
    // Default score for unattempted is 0.7 (slightly prioritized over 50/50 but less than totally wrong)
    const scoredDrills = DRILLS.map(drill => {
      const stats = rawStats[drill.name];
      let weakness = 0.7; // Unattempted priority
      if (stats && stats.attempts > 0) {
        weakness = 1 - (stats.correct / stats.attempts);
      }
      return { drill, weakness, r: Math.random() };
    });

    // Sort by weakness descending, then random as tie-breaker
    const shuffled = scoredDrills.sort((a, b) => b.weakness - a.weakness || b.r - a.r).map(s => s.drill);

    let selectedDrills = shuffled;
    if (difficulty === 'easy') {
      selectedDrills = shuffled.slice(0, 2);
    } else if (difficulty === 'medium') {
      selectedDrills = shuffled.slice(0, 5);
    } // 'hard' takes all
    
    // Sort selected back to random order so they don't immediately know the first is their absolute weakest
    selectedDrills = selectedDrills.sort(() => 0.5 - Math.random());

    setDrillQueue(selectedDrills);
    setCurrentQueueIndex(0);
    setActiveDrill(selectedDrills[0]);
    setStep('start');
    setSessionCorrectCount(0);
    setSessionTotalCount(0);
    setHasScoredCurrentQuestion(false);
    setActiveDifficulty(difficulty);
    setElapsedTime(0);
    setQuestionStartTime(Date.now());
  };

  const handleNext = (nextStep: Step) => {
    setStep(nextStep);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setHasScoredCurrentQuestion(false);
    setQuestionStartTime(Date.now());
  };

  const identifyOptions = useMemo(() => {
    if (!activeDrill) return [];
    const correctName = activeDrill.name;
    const correctFlaw = FLAW_CATALOG.find(f => f.name === correctName);
    
    let distractorCount = 3;
    if (activeDifficulty === 'easy') distractorCount = 1;
    if (activeDifficulty === 'medium') distractorCount = 2;
    if (activeDifficulty === 'hard') distractorCount = 4;

    let availableDistractors = [...FLAW_CATALOG].filter(f => f.name !== correctName);
    
    if (activeDifficulty === 'easy' && drillQueue.length > 0) {
      const queueNames = drillQueue.map(d => d.name);
      availableDistractors = availableDistractors.filter(f => queueNames.includes(f.name));
      // if not enough, fallback to others
      if (availableDistractors.length < distractorCount) {
        const others = [...FLAW_CATALOG].filter(f => f.name !== correctName && !queueNames.includes(f.name));
        availableDistractors = [...availableDistractors, ...others];
      }
    } else {
      availableDistractors = availableDistractors.sort(() => 0.5 - Math.random());
    }

    const distractors = availableDistractors
      .slice(0, distractorCount)
      .map(f => f.name);
      
    return [correctName, ...distractors].sort(() => 0.5 - Math.random());
  }, [activeDrill?.id, activeDifficulty]);

  const proceedToNextInQueue = () => {
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex < drillQueue.length) {
      setCurrentQueueIndex(nextIndex);
      setActiveDrill(drillQueue[nextIndex]);
      setStep('start');
    } else {
      setStep('list');
    }
  };

  const checkAnswer = (answer: string, isCorrect: boolean) => {
    if (showFeedback) return;
    const timeSpent = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 0;
    setSelectedAnswer(answer);
    setShowFeedback(true);
    if (!hasScoredCurrentQuestion) {
      setHasScoredCurrentQuestion(true);
      setSessionTotalCount(t => t + 1);
      if (isCorrect) {
        setSessionCorrectCount(c => c + 1);
      }
      
      if (activeDrill) {
        try {
          const stats = JSON.parse(localStorage.getItem('lsat_flaw_performance') || '{}');
          if (!stats[activeDrill.name]) {
            stats[activeDrill.name] = { correct: 0, attempts: 0, totalTime: 0 };
          }
          stats[activeDrill.name].attempts += 1;
          stats[activeDrill.name].totalTime = (stats[activeDrill.name].totalTime || 0) + timeSpent;
          if (isCorrect) {
            stats[activeDrill.name].correct += 1;
          }
          localStorage.setItem('lsat_flaw_performance', JSON.stringify(stats));
        } catch (e) {}
      }
    }
  };

  const getQuestionOptions = useCallback((questionType: 'conclusion' | 'support' | 'gap' | 'answer') => {
    if (!activeDrill) return [];
    
    const originalOptions = activeDrill.questions[questionType].options;
    const correct = activeDrill.questions[questionType].correctAnswer;
    
    let pool = [...originalOptions].filter(o => o !== correct);
    
    let targetCount = 3;
    if (activeDifficulty === 'easy') targetCount = 2;
    if (activeDifficulty === 'medium') targetCount = 3;
    if (activeDifficulty === 'hard') targetCount = 4;
    
    let distractors: string[] = [];
    
    if (targetCount <= originalOptions.length) {
       distractors = pool.sort(() => 0.5 - Math.random()).slice(0, targetCount - 1);
    } else {
       distractors = [...pool];
       const remainingCount = targetCount - 1 - pool.length;
       
       const otherOptions = DRILLS
         .filter(d => d.id !== activeDrill.id)
         .flatMap(d => d.questions[questionType].options)
         .filter(o => o !== correct && !distractors.includes(o))
         .sort(() => 0.5 - Math.random());
         
       distractors = [...distractors, ...otherOptions.slice(0, remainingCount)];
    }
    
    return [correct, ...distractors].sort(() => 0.5 - Math.random());
  }, [activeDrill, activeDifficulty]);

  const conclusionOptions = useMemo(() => activeDrill ? getQuestionOptions('conclusion') : [], [activeDrill, getQuestionOptions]);
  const supportOptions = useMemo(() => activeDrill ? getQuestionOptions('support') : [], [activeDrill, getQuestionOptions]);
  const gapOptions = useMemo(() => activeDrill ? getQuestionOptions('gap') : [], [activeDrill, getQuestionOptions]);
  const answerOptions = useMemo(() => activeDrill ? getQuestionOptions('answer') : [], [activeDrill, getQuestionOptions]);

  const renderExtendedFeedback = (stepType: string, selected: string, correct: string) => {
    if (!activeDrill) return null;
    const isCorrect = selected === correct;
    const definition = FLAW_CATALOG.find(f => f.name === activeDrill.name)?.definition;
    
    if (isCorrect) {
      const isAnswerStep = stepType === 'answer choice description';
      const textExplanation = isAnswerStep
        ? `This correctly maps the abstract language in the answer choice back to the specific parts of the stimulus. It perfectly describes a ${activeDrill.name} flaw.`
        : `This correctly isolates the ${stepType} in the stimulus. Understanding this part of the argument is essential for diagnosing a ${activeDrill.name} flaw, which happens when ${definition?.charAt(0).toLowerCase()}${definition?.slice(1)}`;
      
      const videoExplanationText = isAnswerStep
        ? `Explain how the correct answer "${correct}" functionally maps to the stimulus text and exposes the ${activeDrill.name} flaw.`
        : `This correctly isolates the ${stepType} ("${correct}") in the stimulus. Visually demonstrate how this maps textually back to specific parts of the stimulus and explicitly contrasts the flawed reasoning. A ${activeDrill.name} flaw happens when ${definition}.`;

      return (
        <div className="mt-3 text-green-900/80 text-xs border-t border-green-200/50 pt-3">
          <strong className="block text-green-900 mb-1">Why this fits the stimulus:</strong>
          {textExplanation}
          
          <VideoExplanation 
            stimulus={activeDrill.stimulus}
            flawName={activeDrill.name}
            correctAnswer={correct}
            explanation={videoExplanationText}
          />
        </div>
      );
    } else {
      let empathyText = "It's easy to see why this option was tempting—it often highlights a real concept from the text or sounds plausible.";
      
      const isActuallySupport = selected === activeDrill.supportText;
      const isActuallyConclusion = selected === activeDrill.conclusionText;

      if (stepType === 'conclusion') {
        if (isActuallySupport) {
          empathyText = "You've identified a key piece of evidence! It's easy to mistake a strong premise for a conclusion because the author spends so much time explaining it, but remember to ask: 'What is this evidence ultimately trying to PROVE?'";
        } else {
          empathyText = "It's easy to see why you might have picked that—this option might be a strong claim or a background fact that feels central to the 'vibe' of the argument, even if it's not the final takeaway.";
        }
      }
      
      if (stepType === 'supporting evidence') {
        if (isActuallyConclusion) {
          empathyText = "You've pinpointed the main point! It's common to grab the conclusion when asked for support because it's the most memorable part of the argument. However, we need to find the specific 'reasons why' that conclusion was reached.";
        } else {
          empathyText = "It's easy to see why you might have picked that—this option might be a true statement from the text or a real-world fact that makes the argument sound more believable, even if the author didn't explicitly use it as a premise.";
        }
      }

      if (stepType === 'logical gap') empathyText = "It's easy to see why you might have picked that—this option likely describes a real logical concern or a common-sense 'what if,' even if it isn't the specific structural flaw that this particular argument hinges on.";
      
      if (stepType === 'answer choice description') empathyText = "It's easy to see why you might have picked that—LSAT trap answers often use 'powerful' words or phrases from the stimulus to make a flawed description sound like a perfect match.";

      return (
        <div className="mt-3 text-red-900/80 text-xs border-t border-red-200/50 pt-3 space-y-3">
          <div>
            <strong className="block text-red-900 mb-1">Why you might have picked that:</strong>
            {empathyText}
          </div>
          <div>
            <strong className="block text-red-900 mb-1">Why the correct answer is the best fit:</strong>
            The best fit for the {stepType} is actually: <span className="italic font-medium">"{correct}"</span>.
          </div>
          <div>
            Your choice misses the mark because it doesn't accurately reflect the stimulus. A <strong>{activeDrill.name}</strong> flaw occurs when {definition?.charAt(0).toLowerCase()}{definition?.slice(1)}. The correct answer precisely highlights the {stepType} that demonstrates this breakdown in logic.
          </div>
          
          <VideoExplanation 
            stimulus={activeDrill.stimulus}
            flawName={activeDrill.name}
            correctAnswer={correct}
            incorrectAnswer={selected}
            explanation={`Visually highlight why the chosen answer "${selected}" is incorrect, specifically contrasting it with the actual logical gap. Then demonstrate why the correct answer "${correct}" is superior and accurately describes the ${activeDrill.name} flaw in the stimulus.`}
          />
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex justify-center items-center h-full overflow-hidden">
      <div className="w-full max-w-2xl bg-white border border-[#1a1a1a]/10 shadow-sm relative overflow-y-auto max-h-full custom-scrollbar flex flex-col">
        {step !== 'list' && step !== 'dashboard' && drillQueue.length > 0 && (
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-[#1a1a1a]/10 shadow-sm">
            <div className="h-1.5 w-full bg-[#1a1a1a]/5">
              <motion.div 
                className="h-full bg-[#1a1a1a]"
                initial={{ width: `${((step === 'finish' ? currentQueueIndex + 1 : currentQueueIndex) / drillQueue.length) * 100}%` }}
                animate={{ width: `${((step === 'finish' ? currentQueueIndex + 1 : currentQueueIndex) / drillQueue.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
            <div className="px-6 md:px-10 py-3 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
                {step === 'finish' ? currentQueueIndex + 1 : currentQueueIndex} Completed
              </span>
              <div className="flex items-center gap-4">
                {isTimerEnabled && (
                  <span className="flex items-center gap-2 text-[#1a1a1a]">
                     <span className="opacity-40">TIME:</span> {formatTime(elapsedTime)}
                  </span>
                )}
                <button 
                  onClick={saveAndExit}
                  className="px-2 py-1 border border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/5 transition-colors text-[#1a1a1a]/60 flex gap-1 items-center rounded-sm"
                >
                  <span className="text-[8px]">⏸</span> Save & Exit
                </button>
              </div>
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]/20" />
                {drillQueue.length - (step === 'finish' ? currentQueueIndex + 1 : currentQueueIndex)} Remaining
              </span>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-10 md:p-16 relative flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {step === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-start">
                  <h2 className="text-4xl font-serif tracking-tighter italic">Practice Drills</h2>
                  <button 
                    onClick={() => setStep('dashboard')}
                    className="flex flex-col items-end group"
                  >
                    <span className="text-[9px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 group-hover:text-[#1a1a1a] transition-colors">Progress</span>
                    <span className="text-xl">📊</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Saved Session Resume */}
                  {hasSavedProgress && (
                    <div className="flex flex-col p-6 border-2 border-[#1a1a1a] bg-white rounded-sm shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl font-serif italic">Resume</div>
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white text-sm shadow-[4px_4px_0px_0px_rgba(26,26,26,0.2)]">▶</div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/40">Active Session Detected</div>
                            <h4 className="text-xl font-serif italic text-[#1a1a1a]">
                              {(() => {
                                const saved = localStorage.getItem(SAVE_KEY);
                                if (saved) {
                                  const state = JSON.parse(saved);
                                  const drill = DRILLS.find(d => d.id === state.activeDrillId);
                                  if (drill) {
                                    if (state.drillQueueIds.length > 1) {
                                      return `Mixed Practice: ${drill.name} (+${state.drillQueueIds.length - 1} more)`;
                                    }
                                    return `Drill: ${drill.name}`;
                                  }
                                }
                                return 'In-progress Drill Session';
                              })()}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold">
                          <div className="flex gap-4">
                            <span className="text-[#1a1a1a]/40">Progress: <span className="text-[#1a1a1a]">{(() => {
                              const saved = localStorage.getItem(SAVE_KEY);
                              if (saved) {
                                const state = JSON.parse(saved);
                                return `${state.currentQueueIndex + 1} / ${state.drillQueueIds.length}`;
                              }
                              return '0/0';
                            })()} Drills</span></span>
                            <span className="text-[#1a1a1a]/40">Accuracy: <span className="text-[#1a1a1a]">{(() => {
                              const saved = localStorage.getItem(SAVE_KEY);
                              if (saved) {
                                const state = JSON.parse(saved);
                                return state.sessionTotalCount > 0 ? Math.round((state.sessionCorrectCount / state.sessionTotalCount) * 100) : 0;
                              }
                              return 0;
                            })()}%</span></span>
                          </div>
                   
                          <div className="flex gap-2">
                             <button 
                              onClick={() => {
                                localStorage.removeItem(SAVE_KEY);
                                setHasSavedProgress(false);
                              }}
                              className="px-3 py-2 text-[#1a1a1a]/40 hover:text-red-600 transition-colors"
                            >
                              Discard
                            </button>
                            <button 
                              onClick={resumeSession}
                              className="px-6 py-2 bg-[#1a1a1a] text-white rounded-sm hover:bg-[#1a1a1a]/90 transition-colors shadow-lg"
                            >
                              Resume →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timer Settings */}
                  <div className="flex items-center justify-between p-4 border border-[#1a1a1a]/10 bg-[#f5f2ed]/30 rounded-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-[#1a1a1a]/20 flex items-center justify-center text-sm">⏱</div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a]">Drill Timer</div>
                        <div className="text-[10px] text-[#1a1a1a]/50">Track your speed as you solve</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsTimerEnabled(!isTimerEnabled)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${isTimerEnabled ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]/10'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isTimerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Difficulty Selection for Mixed Drills */}
                  <div className="bg-[#1a1a1a] text-white p-6 relative overflow-hidden rounded-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">✦</div>
                    <h3 className="text-2xl font-serif mb-2 italic relative z-10">Mixed Practice Session</h3>
                    <p className="text-sm text-white/60 mb-6 relative z-10">Adaptive practice targeting your weak spots. Choose your intensity.</p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full mt-4">
                      <button
                        onClick={() => startMixedDrill('hard')}
                        className="flex-1 p-4 border border-white/20 hover:bg-white/10 transition-colors text-center font-bold text-sm uppercase tracking-widest whitespace-nowrap rounded-sm"
                      >
                        Hard
                      </button>
                      <button
                        onClick={() => startMixedDrill('medium')}
                        className="flex-1 p-4 border border-white/20 hover:bg-white/10 transition-colors text-center font-bold text-sm uppercase tracking-widest whitespace-nowrap rounded-sm"
                      >
                        Medium
                      </button>
                      <button
                        onClick={() => startMixedDrill('easy')}
                        className="flex-1 p-4 border border-white/20 hover:bg-white/10 transition-colors text-center font-bold text-sm uppercase tracking-widest whitespace-nowrap rounded-sm"
                      >
                        Easy
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'dashboard' && (
              <PerformanceDashboard onBack={() => setStep('list')} />
            )}

            {step === 'start' && activeDrill && (
              <motion.div
                key="start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 text-center"
              >
              
              <div className="flex flex-col items-center">
                <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/50 pt-4">
                  {drillQueue.length > 1 ? 'Mixed Session' : 'Coached Drill'}
                </h2>
                <h3 className="text-4xl font-serif tracking-tighter italic">
                  Analyze the Fallacy
                </h3>
              </div>

              <p className="text-lg text-[#1a1a1a]/70 font-light leading-relaxed">
                Work through this argument step-by-step using the core method.
              </p>
              
              <div className="bg-[#f5f2ed] p-6 border-l-2 border-[#1a1a1a] text-left mt-8">
                <p className="font-serif text-lg italic text-[#1a1a1a]">
                  "{activeDrill.stimulus}"
                </p>
              </div>
              <button
                onClick={() => handleNext('conclusion')}
                className="mt-8 px-8 py-3 bg-[#1a1a1a] text-white text-sm uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
              >
                Start Drill →
              </button>
            </motion.div>
          )}

          {step === 'conclusion' && activeDrill && (
            <motion.div
              key="conclusion"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/50">Step 1</span>
                  <h3 className="text-3xl font-serif tracking-tighter">Find the Conclusion</h3>
                </div>
                
              </div>
              
              <div className="bg-[#f5f2ed] p-6 border-l-2 border-[#1a1a1a]">
                <p className="font-serif italic text-[#1a1a1a]/80">"{activeDrill.stimulus}"</p>
              </div>

              <p className="text-[#1a1a1a]/80">{activeDrill.questions.conclusion.prompt}</p>

              <div className="space-y-3">
                {conclusionOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => checkAnswer(opt, opt === activeDrill.questions.conclusion.correctAnswer)}
                    className={`w-full text-left p-4 border transition-colors ${
                      selectedAnswer === opt
                        ? opt === activeDrill.questions.conclusion.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-[#1a1a1a]/10 hover:border-[#1a1a1a]/40'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              
              {showFeedback && selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 mt-6 text-sm ${
                    selectedAnswer === activeDrill.questions.conclusion.correctAnswer 
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p>{activeDrill.questions.conclusion.feedback?.[selectedAnswer]}</p>
                  {renderExtendedFeedback('conclusion', selectedAnswer, activeDrill.questions.conclusion.correctAnswer)}
                </motion.div>
              )}

              {showFeedback && selectedAnswer === activeDrill.questions.conclusion.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('support')}
                    className="px-8 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
                  >
                    Continue →
                  </button>
                </div>
              )}

              {showFeedback && selectedAnswer && selectedAnswer !== activeDrill.questions.conclusion.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('support')}
                    className="text-xs uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
                  >
                    Skip Question →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'support' && activeDrill && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
               <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/50">Step 2</span>
                  <h3 className="text-3xl font-serif tracking-tighter">Identify the Support</h3>
                </div>
                
              </div>
              
              <div className="bg-[#f5f2ed] p-6 border-l-2 border-green-500">
                <p className="font-serif italic text-[#1a1a1a]/60 pb-2 border-b border-[#1a1a1a]/10 mb-2">Conclusion: "{activeDrill.conclusionText}"</p>
                <p className="font-serif italic text-lg text-[#1a1a1a]/80">"{activeDrill.stimulus}"</p>
              </div>

              <p className="text-[#1a1a1a]/80">{activeDrill.questions.support.prompt}</p>

              <div className="space-y-3">
                {supportOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => checkAnswer(opt, opt === activeDrill.questions.support.correctAnswer)}
                    className={`w-full text-left p-4 border transition-colors ${
                      selectedAnswer === opt
                        ? opt === activeDrill.questions.support.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-[#1a1a1a]/10 hover:border-[#1a1a1a]/40'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              
              {showFeedback && selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 mt-6 text-sm ${
                    selectedAnswer === activeDrill.questions.support.correctAnswer 
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p>{activeDrill.questions.support.feedback?.[selectedAnswer]}</p>
                  {renderExtendedFeedback('supporting evidence', selectedAnswer, activeDrill.questions.support.correctAnswer)}
                </motion.div>
              )}

              {showFeedback && selectedAnswer === activeDrill.questions.support.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('identify')}
                    className="px-8 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
                  >
                    Continue →
                  </button>
                </div>
              )}

              {showFeedback && selectedAnswer && selectedAnswer !== activeDrill.questions.support.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('identify')}
                    className="text-xs uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
                  >
                    Skip Question →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'identify' && activeDrill && (
            <motion.div
              key="identify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
               <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/50">Step 3</span>
                  <h3 className="text-3xl font-serif tracking-tighter">Diagnose the Flaw</h3>
                </div>
                
              </div>

              <div className="bg-[#1a1a1a] text-white p-6 space-y-4 rounded shadow-xl">
                <div>
                  <span className="text-white/40 text-[9px] uppercase tracking-[0.2em] font-bold block mb-1">Conclusion Found:</span>
                  <p className="font-serif italic text-lg leading-relaxed">"{activeDrill.conclusionText}"</p>
                </div>
                <div>
                  <span className="text-white/40 text-[9px] uppercase tracking-[0.2em] font-bold block mb-1">Support Found:</span>
                  <p className="font-serif italic text-lg leading-relaxed">"{activeDrill.supportText}"</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-[#1a1a1a]/70">Based on how this evidence fails to prove that conclusion, what is the name of this logical fallacy?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {identifyOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => checkAnswer(opt, opt === activeDrill.name)}
                      className={`w-full text-left p-4 border transition-colors flex justify-between items-center ${
                        selectedAnswer === opt
                          ? opt === activeDrill.name
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-[#1a1a1a]/10 hover:border-[#1a1a1a]/40 bg-white shadow-sm'
                      }`}
                    >
                      <span className="font-serif italic text-lg">{opt}</span>
                      {selectedAnswer === opt && (
                        <span>{opt === activeDrill.name ? '✓' : '✗'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {showFeedback && selectedAnswer && selectedAnswer !== activeDrill.name && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-800 border border-red-200 p-4 mt-6 text-sm space-y-3"
                  >
                    <div>
                      <strong className="block text-red-900 mb-1">Why you might have picked that:</strong>
                      {(() => {
                        const selectedFlaw = FLAW_CATALOG.find(f => f.name === selectedAnswer);
                        const correctFlaw = FLAW_CATALOG.find(f => f.name === activeDrill.name);
                        
                        if (selectedFlaw && correctFlaw) {
                          return `While '${selectedAnswer}' might sound plausible, it doesn't quite match the specific mechanism in this stimulus.`;
                        }
                        
                        return `It's easy to see why '${selectedAnswer}' was tempting—LSAT arguments are designed to mix elements of different flaws, often using background details to trick you into picking a familiar-sounding fallacy.`;
                      })()}
                    </div>
                    <div>
                      <strong className="block text-red-900 mb-1">Why the correct diagnosis is different:</strong>
                      This argument actually matches the pattern of a <strong>{activeDrill.name}</strong> flaw. Try to focus on the exact relationship between the support and the conclusion!
                    </div>
                  </motion.div>
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => handleNext('gap')}
                      className="text-xs uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
                    >
                      Skip Question →
                    </button>
                  </div>
                </>
              )}

              {selectedAnswer === activeDrill.name && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-4"
                >
                  <div className="bg-green-50 border border-green-200 p-4 mb-6 rounded-sm">
                    <p className="text-sm text-green-800">
                      <strong>Correct diagnosis.</strong> This is indeed a <strong>{activeDrill.name}</strong> flaw: {FLAW_CATALOG.find(f => f.name === activeDrill.name)?.definition} Now let's find the exact "What-if" question that exposes the gap.
                    </p>
                    <VideoExplanation 
                      stimulus={activeDrill.stimulus}
                      flawName={activeDrill.name}
                      explanation={`Correct diagnosis of the ${activeDrill.name} flaw. Visually show how the evidence fails to prove the conclusion, leaving an exposed logical gap.`}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleNext('gap')}
                      className="px-8 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
                    >
                      Continue →
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'gap' && activeDrill && (
             <motion.div
             key="gap"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-8"
           >
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/50">Step 4</span>
                  <h3 className="text-3xl font-serif tracking-tighter">Find the Gap & Counter-Question</h3>
                </div>
                
              </div>
             
             <div className="bg-[#1a1a1a] text-white p-6 space-y-4">
               <div><span className="text-white/50 text-sm uppercase tracking-widest">Support:</span> {activeDrill.supportText}</div>
               <div className="text-center font-bold text-red-400">↓ THE GAP ↓</div>
               <div><span className="text-white/50 text-sm uppercase tracking-widest">Conclusion:</span> {activeDrill.conclusionText}</div>
             </div>

             <p className="text-[#1a1a1a]/80">{activeDrill.questions.gap.prompt}</p>

             <div className="space-y-3">
               {gapOptions.map((opt) => (
                 <button
                   key={opt}
                   onClick={() => checkAnswer(opt, opt === activeDrill.questions.gap.correctAnswer)}
                   className={`w-full text-left p-4 border transition-colors ${
                     selectedAnswer === opt
                       ? opt === activeDrill.questions.gap.correctAnswer
                         ? 'border-green-500 bg-green-50'
                         : 'border-red-500 bg-red-50'
                       : 'border-[#1a1a1a]/10 hover:border-[#1a1a1a]/40'
                   }`}
                 >
                   {opt}
                 </button>
               ))}
             </div>
             
             {showFeedback && selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 mt-6 text-sm ${
                    selectedAnswer === activeDrill.questions.gap.correctAnswer 
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p>{activeDrill.questions.gap.feedback?.[selectedAnswer]}</p>
                  {renderExtendedFeedback('logical gap', selectedAnswer, activeDrill.questions.gap.correctAnswer)}
                </motion.div>
              )}

              {showFeedback && selectedAnswer === activeDrill.questions.gap.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('answer')}
                    className="px-8 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
                  >
                    Continue →
                  </button>
                </div>
              )}

              {showFeedback && selectedAnswer && selectedAnswer !== activeDrill.questions.gap.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('answer')}
                    className="text-xs uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
                  >
                    Skip Question →
                  </button>
                </div>
              )}
           </motion.div>
          )}

          {step === 'answer' && activeDrill && (
             <motion.div
             key="answer"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-8"
           >
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/50">Step 5</span>
                  <h3 className="text-3xl font-serif tracking-tighter">Match the LSAT Wording</h3>
                </div>
                
              </div>

              <p className="text-[#1a1a1a]/80">{activeDrill.questions.answer.prompt}</p>

              <div className="space-y-3">
                {answerOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => checkAnswer(opt, opt === activeDrill.questions.answer.correctAnswer)}
                    className={`w-full text-left p-4 border transition-colors ${
                      selectedAnswer === opt
                        ? opt === activeDrill.questions.answer.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-[#1a1a1a]/10 hover:border-[#1a1a1a]/40'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              
              {showFeedback && selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 mt-6 text-sm ${
                    selectedAnswer === activeDrill.questions.answer.correctAnswer 
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p>{activeDrill.questions.answer.feedback?.[selectedAnswer]}</p>
                  {renderExtendedFeedback('answer choice description', selectedAnswer, activeDrill.questions.answer.correctAnswer)}
                </motion.div>
              )}

              {showFeedback && selectedAnswer === activeDrill.questions.answer.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('finish')}
                    className="px-8 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
                  >
                    Complete Sequence →
                  </button>
                </div>
              )}

              {showFeedback && selectedAnswer && selectedAnswer !== activeDrill.questions.answer.correctAnswer && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleNext('finish')}
                    className="text-xs uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
                  >
                    Skip to Completion →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'finish' && activeDrill && (
            <motion.div
              key="finish"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 text-center py-8"
            >
              <div className="w-16 h-16 mx-auto rounded-full border border-[#1a1a1a] flex items-center justify-center text-3xl font-serif italic text-[#1a1a1a]">
                {drillQueue.length > 0 && currentQueueIndex === drillQueue.length - 1 ? '🏆' : '✦'}
              </div>
              
              <h2 className="text-4xl font-serif tracking-tighter italic">
                {drillQueue.length > 0 && currentQueueIndex === drillQueue.length - 1 
                  ? 'Mixed Session Complete' 
                  : 'Drill Complete'}
              </h2>
              
              <p className="text-lg text-[#1a1a1a]/70 font-light leading-relaxed max-w-md mx-auto">
                {drillQueue.length > 0 && currentQueueIndex === drillQueue.length - 1 
                  ? `Incredible! You just completed ${drillQueue.length} LSAT flaw drills.`
                  : `Excellent work! You successfully identified the conclusion, support, and the gap for a classic ${activeDrill.name}.`}
              </p>

              <div className="flex justify-center my-8">
                <div className="bg-[#f5f2ed] border border-[#1a1a1a]/10 p-8 min-w-[280px] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#1a1a1a]" />
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/50 mb-4">
                    {drillQueue.length > 0 && currentQueueIndex < drillQueue.length - 1 ? 'Current Score' : 'Final Score'}
                  </div>
                  <div className="text-6xl font-serif italic text-[#1a1a1a] mb-2">
                    {sessionCorrectCount} <span className="text-2xl text-[#1a1a1a]/30 not-italic font-sans">/ {sessionTotalCount}</span>
                  </div>
                  {sessionTotalCount > 0 && (
                    <div className="text-sm font-bold text-[#1a1a1a] uppercase tracking-widest mt-4">
                      {sessionCorrectCount / sessionTotalCount >= 0.8 ? 'Outstanding Performance 🔥' : 
                       sessionCorrectCount / sessionTotalCount >= 0.5 ? 'Solid Effort 👍' : 
                       'Keep Practicing 💪'}
                    </div>
                  )}
                  {isTimerEnabled && (
                    <div className="text-sm font-serif italic text-[#1a1a1a]/60 mt-4 border-t border-[#1a1a1a]/10 pt-4">
                      Session Time: {formatTime(elapsedTime)}
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-widest text-[#1a1a1a]/40 mt-3">
                    First-Attempt Accuracy
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center mt-8">
                {drillQueue.length > 0 && currentQueueIndex < drillQueue.length - 1 ? (
                  <button
                    onClick={proceedToNextInQueue}
                    className="px-8 py-3 bg-[#1a1a1a] text-white text-sm uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
                  >
                    Next Drill →
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => drillQueue.length > 0 ? startMixedDrill(activeDifficulty) : handleNext('start')}
                      className="px-6 py-3 border border-[#1a1a1a] text-[#1a1a1a] text-sm uppercase tracking-widest hover:bg-[#1a1a1a]/5 transition-colors"
                    >
                      {drillQueue.length > 0 ? 'Try Another Mixed Pack' : 'Restart Drill'}
                    </button>
                    <button
                      onClick={() => setStep('list')}
                      className="px-6 py-3 bg-[#1a1a1a] text-white text-sm uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors"
                    >
                      All Drills
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

