import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Eye, BookOpen, ArrowRight, CheckCircle2, Info, AlertTriangle, Search, KeyRound, Lightbulb, Loader2, MessageSquare } from 'lucide-react';
import { stemDrills, MODULE_1_INTRO } from './data';
import { supabase } from '@/integrations/supabase/client';

type DrillState = 'intro-1' | 'intro-2' | 'intro-3' | 'exercise' | 'keywords' | 'requirements' | 'translation' | 'done';

function HighlightedStem({ rawStem, keywords, showHighlights }: { rawStem: string; keywords: { word: string; definition: string }[]; showHighlights: boolean }) {
  if (!showHighlights) {
    return <span>{rawStem}</span>;
  }

  let result: React.ReactNode[] = [];
  let remaining = rawStem;
  let key = 0;

  const sortedKeywords = [...keywords].sort((a, b) => {
    const idxA = rawStem.toLowerCase().indexOf(a.word.toLowerCase());
    const idxB = rawStem.toLowerCase().indexOf(b.word.toLowerCase());
    return idxA - idxB;
  });

  for (const kw of sortedKeywords) {
    const idx = remaining.toLowerCase().indexOf(kw.word.toLowerCase());
    if (idx === -1) continue;
    if (idx > 0) result.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    result.push(
      <span key={key++} className="bg-primary/20 text-primary font-bold px-1 py-0.5 rounded">
        {remaining.slice(idx, idx + kw.word.length)}
      </span>
    );
    remaining = remaining.slice(idx + kw.word.length);
  }
  if (remaining) result.push(<span key={key++}>{remaining}</span>);

  return <>{result}</>;
}

const introStepIndex = (s: DrillState) => s === 'intro-1' ? 0 : s === 'intro-2' ? 1 : s === 'intro-3' ? 2 : -1;

const trainingSteps = [
  { icon: Search, label: 'Read the raw stem', desc: 'Try to decode what it means on your own first' },
  { icon: KeyRound, label: 'Reveal keyword definitions', desc: 'See what each abstract term actually means' },
  { icon: Lightbulb, label: "See the coach's translation", desc: 'Compare your interpretation to the breakdown' },
];

export default function InteractiveStemDrill({ onComplete }: { onComplete?: (count: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<DrillState>('intro-1');
  const [completedCount, setCompletedCount] = useState(0);
  const [studentResponse, setStudentResponse] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const drill = stemDrills[currentIndex];
  const isLast = currentIndex === stemDrills.length - 1;
  const hasRequirements = drill?.requirements && drill.requirements.length > 0;

  const analyzeResponse = async () => {
    if (!studentResponse.trim()) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-stem-response', {
        body: {
          stem: drill.rawStem,
          studentResponse: studentResponse.trim(),
          coachTranslation: drill.coachTranslation,
        },
      });
      if (error) throw error;
      setAiFeedback(data?.feedback || 'Unable to generate feedback.');
    } catch (e) {
      console.error('AI analysis error:', e);
      setAiFeedback('Could not analyze your response right now. Compare your interpretation with the coach\'s translation above.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const advance = () => {
    if (state === 'intro-1') setState('intro-2');
    else if (state === 'intro-2') setState('intro-3');
    else if (state === 'intro-3') setState('exercise');
    else if (state === 'exercise') setState('keywords');
    else if (state === 'keywords') {
      if (hasRequirements) setState('requirements');
      else setState('translation');
    } else if (state === 'requirements') setState('translation');
    else if (state === 'translation') {
      const newCount = completedCount + 1;
      setCompletedCount(newCount);
      onComplete?.(newCount);
      if (!isLast) {
        setCurrentIndex(prev => prev + 1);
        setState('exercise');
        setStudentResponse('');
        setAiFeedback(null);
      } else {
        setState('done');
      }
    }
  };

  // Trigger AI analysis when entering translation state if student typed something
  const advanceToTranslation = () => {
    advance();
  };

  // When state changes to translation, fire AI analysis
  React.useEffect(() => {
    if (state === 'translation' && studentResponse.trim()) {
      analyzeResponse();
    }
  }, [state]);

  const currentIntroStep = introStepIndex(state);
  const isIntro = currentIntroStep >= 0;

  // --- INTRO SCREENS ---
  if (isIntro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        {/* Step indicator dots */}
        <div className="flex gap-2 mb-10">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === currentIntroStep ? 'w-8 bg-primary' : i < currentIntroStep ? 'w-4 bg-primary/40' : 'w-4 bg-border'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Title Card */}
          {state === 'intro-1' && (
            <motion.div
              key="intro-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative flex flex-col items-center text-center max-w-lg w-full"
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[140px] font-black leading-none text-foreground/[0.03] select-none pointer-events-none">
                01
              </span>
              <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-3 relative z-10">
                Module 1
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight relative z-10 mb-3">
                The De-Abstraction Lab
              </h1>
              <div className="w-12 h-[2px] bg-primary/60 rounded-full mb-5" />
              <p className="text-sm text-muted-foreground">
                15 Exercises
              </p>
            </motion.div>
          )}

          {/* STEP 2: The Mission */}
          {state === 'intro-2' && (
            <motion.div
              key="intro-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="max-w-lg w-full space-y-6"
            >
              <div className="text-center mb-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-2">The Mission</p>
                <h2 className="text-xl lg:text-2xl font-bold text-foreground">Why This Matters</h2>
              </div>
              <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-4">
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }} className="text-sm text-muted-foreground leading-relaxed">
                  The ability to{' '}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs">
                    de-abstractify
                  </span>{' '}
                  , translating vague and abstract terms that appear in answer choices into their stimulus equivalents, is one of the most important skills the advanced student needs to master.
                </motion.p>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} className="text-sm text-muted-foreground leading-relaxed">
                  If you do not have this ability, often you will end up choosing a wrong answer choice even if you knew what you were looking for. You simply did not understand what the answer choice was trying to say.
                </motion.p>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }} className="text-sm text-foreground leading-relaxed font-medium">
                  In other words, advanced students can read through a list of abstract answer choices and know exactly what they are referring to.
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* STEP 3: The Briefing */}
          {state === 'intro-3' && (
            <motion.div
              key="intro-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="max-w-lg w-full space-y-6"
            >
              <div className="text-center mb-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-2">The Briefing</p>
                <h2 className="text-xl lg:text-2xl font-bold text-foreground">Your Training</h2>
              </div>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                For each of the 15 stems, you will follow this process:
              </p>
              <div className="space-y-3">
                {trainingSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.15, duration: 0.4 }}
                    className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          key={`cta-${state}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: state === 'intro-3' ? 0.6 : 0.3, duration: 0.3 }}
          onClick={advance}
          className="mt-10 px-8 py-3.5 rounded-xl text-sm font-bold transition-all bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
        >
          {state === 'intro-1' && <>Continue <ChevronRight className="h-4 w-4" /></>}
          {state === 'intro-2' && <>What You'll Do <ChevronRight className="h-4 w-4" /></>}
          {state === 'intro-3' && <>Begin Exercises <ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </div>
    );
  }

  // --- DONE SCREEN ---
  if (state === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-bold text-foreground">All 15 Stems Complete</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          You've worked through every abstract answer choice stem. These patterns will appear repeatedly in Role questions. You now know exactly what they mean.
        </p>
      </div>
    );
  }

  // --- EXERCISE FLOW ---
  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          Stem {currentIndex + 1} of {stemDrills.length}
        </span>
        <div className="flex gap-1">
          {stemDrills.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-4 rounded-full transition-colors ${
                i < completedCount ? 'bg-emerald-500' : i === currentIndex ? 'bg-primary' : 'bg-accent'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentIndex}-${state}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* The Stem */}
          <div className="rounded-xl border border-border bg-card p-6 lg:p-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">
              {state === 'exercise' ? 'Analyze This Stem' : state === 'keywords' ? 'Keywords Identified' : state === 'requirements' ? 'Requirements Checklist' : "Coach's Breakdown"}
            </p>
            <p className="text-lg lg:text-xl font-mono leading-relaxed text-foreground">
              <HighlightedStem rawStem={drill.rawStem} keywords={drill.keywords} showHighlights={state !== 'exercise'} />
            </p>
          </div>

          {/* Student Response Input (exercise state only) */}
          {state === 'exercise' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="rounded-xl border border-border bg-card p-6 space-y-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">What Do You Think This Means?</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Type your interpretation below. After revealing the translation, AI will compare your read to the coach's.
              </p>
              <textarea
                value={studentResponse}
                onChange={(e) => setStudentResponse(e.target.value)}
                placeholder="In plain language, this stem is saying..."
                className="w-full min-h-[80px] rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <p className="text-[10px] text-muted-foreground italic">Optional. You can skip this and go straight to keywords.</p>
            </motion.div>
          )}

          {/* Keywords Panel */}
          {(state === 'keywords' || state === 'requirements' || state === 'translation') && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Coach's Definitions</p>
              <div className="space-y-3">
                {drill.keywords.map((kw, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-sm font-bold text-primary font-mono whitespace-nowrap">{kw.word}</span>
                    <span className="text-sm text-muted-foreground leading-relaxed">= {kw.definition}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Requirements Panel */}
          {state === 'requirements' && hasRequirements && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-3"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-bold">Requirements Checklist</p>
              <p className="text-xs text-muted-foreground mb-2">In order for this answer choice to be correct, the stimulus must satisfy ALL of the following:</p>
              <div className="space-y-2">
                {drill.requirements!.map((req, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">{i + 1}.</span>
                    <span className="text-sm text-foreground leading-relaxed">{req}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Translation + Example + LSAT Note + AI Feedback */}
          {state === 'translation' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Coach's Translation</p>
                <p className="text-sm text-foreground leading-relaxed">{drill.coachTranslation}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Concrete Example</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{drill.concreteExample}</p>
              </div>
              {drill.lsatNote && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-blue-600 dark:text-blue-400 mb-1">LSAT Note</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{drill.lsatNote}</p>
                  </div>
                </div>
              )}

              {/* AI Feedback Panel */}
              {studentResponse.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Your Analysis</p>
                  <div className="rounded-lg bg-background/60 p-4 border border-border">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">Your Interpretation</p>
                    <p className="text-sm text-foreground leading-relaxed">{studentResponse}</p>
                  </div>
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Analyzing your response...
                    </div>
                  ) : aiFeedback ? (
                    <div className="rounded-lg bg-background/60 p-4 border border-border">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-medium mb-2">AI Feedback</p>
                      <p className="text-sm text-foreground leading-relaxed">{aiFeedback}</p>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Action Button */}
          <button
            onClick={advance}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
          >
            {state === 'exercise' && <><Eye className="h-4 w-4" /> Reveal Keywords</>}
            {state === 'keywords' && <><BookOpen className="h-4 w-4" /> {hasRequirements ? 'Show Requirements' : 'Show Translation & Example'}</>}
            {state === 'requirements' && <><BookOpen className="h-4 w-4" /> Show Translation & Example</>}
            {state === 'translation' && <><ArrowRight className="h-4 w-4" /> {isLast ? 'Finish' : 'Next Stem'}</>}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
