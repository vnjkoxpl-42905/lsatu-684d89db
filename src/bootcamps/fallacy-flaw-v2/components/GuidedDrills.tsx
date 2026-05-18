import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FLAW_CATALOG } from '../data/flaws';
import { DRILLS, Drill } from '../data/drills';

type Step = 'list' | 'start' | 'conclusion' | 'support' | 'identify' | 'gap' | 'answer' | 'finish';
type Difficulty = 'easy' | 'medium' | 'hard' | null;

function VideoExplanation({ stimulus, flawName, explanation }: { stimulus: string, flawName: string, explanation: string }) {
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
Focus: Visually highlight the relationship between the premises and the conclusion. 
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

export function GuidedDrills() {
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

  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const SAVE_KEY = 'lsat-flaw-drills-progress';

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
      }
    } catch (e) {
      console.error("Failed to resume session:", e);
      localStorage.removeItem(SAVE_KEY);
      setHasSavedProgress(false);
    }
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
  };

  const startMixedDrill = (difficulty: Difficulty) => {
    let shuffled = [...DRILLS].sort(() => 0.5 - Math.random());
    
    if (difficulty === 'easy') {
      shuffled = shuffled.slice(0, 2);
    } else if (difficulty === 'medium') {
      shuffled = shuffled.slice(0, 5);
    }
    
    setDrillQueue(shuffled);
    setCurrentQueueIndex(0);
    setActiveDrill(shuffled[0]);
    setStep('start');
    setSessionCorrectCount(0);
    setSessionTotalCount(0);
    setHasScoredCurrentQuestion(false);
    setActiveDifficulty(difficulty);
    setElapsedTime(0);
  };

  const handleNext = (nextStep: Step) => {
    setStep(nextStep);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setHasScoredCurrentQuestion(false);
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
    } else if (activeDifficulty === 'hard' && correctFlaw) {
      // Prioritize distractors from the same group for subtlety
      const sameGroup = availableDistractors.filter(f => f.group === correctFlaw.group).sort(() => 0.5 - Math.random());
      const otherGroup = availableDistractors.filter(f => f.group !== correctFlaw.group).sort(() => 0.5 - Math.random());
      availableDistractors = [...sameGroup, ...otherGroup];
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
    setSelectedAnswer(answer);
    setShowFeedback(true);
    if (!hasScoredCurrentQuestion) {
      setHasScoredCurrentQuestion(true);
      setSessionTotalCount(t => t + 1);
      if (isCorrect) {
        setSessionCorrectCount(c => c + 1);
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
      return (
        <div className="mt-3 text-green-900/80 text-xs border-t border-green-200/50 pt-3">
          <strong className="block text-green-900 mb-1">Why this fits the stimulus:</strong>
          This correctly isolates the <strong>{stepType}</strong> in the stimulus. Understanding this part of the argument is essential for diagnosing a <strong>{activeDrill.name}</strong> flaw, which happens when {definition?.charAt(0).toLowerCase()}{definition?.slice(1)}
          
          <VideoExplanation 
            stimulus={activeDrill.stimulus}
            flawName={activeDrill.name}
            explanation={`This correctly isolates the ${stepType} in the stimulus. A ${activeDrill.name} flaw happens when ${definition}.`}
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
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex justify-center items-center h-full overflow-hidden">
      <div className="w-full max-w-2xl bg-white border border-[#1a1a1a]/10 shadow-sm relative overflow-y-auto max-h-full custom-scrollbar flex flex-col">
        {step !== 'list' && drillQueue.length > 0 && (
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
                  onClick={() => setStep('list')}
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

        <div className="p-10 md:p-16 relative flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {step === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <h2 className="text-4xl font-serif tracking-tighter italic mb-8">Guided Drills</h2>
                
                <div className="space-y-4">
                  {/* Saved Session Resume */}
                  {hasSavedProgress && (
                    <div className="flex items-center justify-between p-4 border border-[#1a1a1a] bg-[#1a1a1a] text-white rounded-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-sm">▶</div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-white">Saved Session found</div>
                          <div className="text-[10px] text-white/60">Pick up right where you left off</div>
                        </div>
                      </div>
                      <button 
                        onClick={resumeSession}
                        className="px-4 py-2 bg-white text-[#1a1a1a] text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-white/90 transition-colors"
                      >
                        Resume
                      </button>
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
                  <div className="bg-[#1a1a1a] text-white p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">✦</div>
                    <h3 className="text-2xl font-serif mb-2 italic relative z-10">Mixed Practice Session</h3>
                    <p className="text-sm text-white/60 mb-6 relative z-10">Test your recognition skills with a randomized set of flaws.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                      <button
                        onClick={() => startMixedDrill('easy')}
                        className="p-4 border border-white/20 hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="font-bold text-sm uppercase tracking-widest mb-1">Easy</div>
                        <div className="text-xs text-white/60">2 Flaws • 2 Options</div>
                      </button>
                      <button
                        onClick={() => startMixedDrill('medium')}
                        className="p-4 border border-white/20 hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="font-bold text-sm uppercase tracking-widest mb-1">Medium</div>
                        <div className="text-xs text-white/60">5 Flaws • 3 Options</div>
                      </button>
                      <button
                        onClick={() => startMixedDrill('hard')}
                        className="p-4 border border-white/20 hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="font-bold text-sm uppercase tracking-widest mb-1">Hard</div>
                        <div className="text-xs text-white/60">All Flaws • 5 Options</div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 pb-2 border-b border-[#1a1a1a]/10">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Individual Flaw Focus</span>
                  </div>

                  {DRILLS.map((drill, index) => (
                    <button
                      key={drill.id}
                      onClick={() => startDrill(drill)}
                      className="w-full text-left p-6 border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/40 transition-colors group"
                    >
                      <h3 className="text-xl font-serif mb-2 group-hover:italic">Scenario {index + 1}</h3>
                      <p className="text-sm text-[#1a1a1a]/60 line-clamp-2">"{drill.stimulus}"</p>
                    </button>
                  ))}
                </div>
              </motion.div>
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
                  {drillQueue.length > 0 ? 'Mixed Session' : 'Guided Drill'}
                </h2>
                <h3 className="text-4xl font-serif tracking-tighter italic">
                  {drillQueue.length > 0 ? 'Logical Diagnosis' : 'Argument Analysis'}
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
                        
                        if (selectedFlaw && correctFlaw && selectedFlaw.group === correctFlaw.group) {
                          return `You're in the right ballpark! '${selectedAnswer}' is also a ${selectedFlaw.group} flaw, which means you've correctly identified the general category of logical breakdown occurring here.`;
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
                      explanation={`Correct diagnosis of the ${activeDrill.name} flaw. This flaw occurs because the argument fails to bridge the gap between its evidence and its conclusion.`}
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

