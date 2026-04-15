import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Eye, BookOpen, ArrowRight, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { stemDrills, MODULE_1_INTRO } from './data';

type DrillState = 'intro' | 'exercise' | 'keywords' | 'requirements' | 'translation' | 'done';

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

export default function InteractiveStemDrill({ onComplete }: { onComplete?: (count: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<DrillState>('intro');
  const [completedCount, setCompletedCount] = useState(0);

  const drill = stemDrills[currentIndex];
  const isLast = currentIndex === stemDrills.length - 1;
  const hasRequirements = drill?.requirements && drill.requirements.length > 0;

  const advance = () => {
    if (state === 'intro') {
      setState('exercise');
    } else if (state === 'exercise') {
      setState('keywords');
    } else if (state === 'keywords') {
      if (hasRequirements) {
        setState('requirements');
      } else {
        setState('translation');
      }
    } else if (state === 'requirements') {
      setState('translation');
    } else if (state === 'translation') {
      const newCount = completedCount + 1;
      setCompletedCount(newCount);
      onComplete?.(newCount);
      if (!isLast) {
        setCurrentIndex(prev => prev + 1);
        setState('exercise');
      } else {
        setState('done');
      }
    }
  };

  if (state === 'intro') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 lg:p-8 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Module 1 — The De-Abstraction Lab</p>
          <h2 className="text-lg font-bold text-foreground">Why This Matters</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{MODULE_1_INTRO}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Take a look at the following 15 answer choice stems. For each one, try to figure out what it means before revealing the coach's breakdown. This is the skill you need to master.
          </p>
        </div>
        <button
          onClick={advance}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
        >
          <ArrowRight className="h-4 w-4" /> Begin Exercises
        </button>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-bold text-foreground">All 15 Stems Complete</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          You've worked through every abstract answer choice stem. These patterns will appear repeatedly in Role questions — you now know exactly what they mean.
        </p>
      </div>
    );
  }

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
              {state === 'exercise' ? 'Analyze this stem' : state === 'keywords' ? 'Keywords identified' : state === 'requirements' ? 'Requirements checklist' : 'Coach\'s breakdown'}
            </p>
            <p className="text-lg lg:text-xl font-mono leading-relaxed text-foreground">
              "<HighlightedStem rawStem={drill.rawStem} keywords={drill.keywords} showHighlights={state !== 'exercise'} />"
            </p>
          </div>

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

          {/* Translation + Example + LSAT Note */}
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
