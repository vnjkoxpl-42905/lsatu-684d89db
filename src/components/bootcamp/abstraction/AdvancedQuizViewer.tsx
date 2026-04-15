import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw, Info, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { roleQuestions, MODULE_2_INTRO } from './data';

type QuizState = 'intro' | 'test' | 'teardown';

const LABEL_COLORS: Record<string, string> = {
  'Conclusion': 'border-l-blue-500 bg-blue-500/5',
  'Main Conclusion': 'border-l-blue-500 bg-blue-500/5',
  'Intermediate Conclusion': 'border-l-amber-500 bg-amber-500/5',
  'Intermediate Conclusion 1': 'border-l-amber-500 bg-amber-500/5',
  'Intermediate Conclusion 2': 'border-l-amber-500 bg-amber-500/5',
  "Consumer Advocate's Attack (Intermediate Conclusion)": 'border-l-amber-500 bg-amber-500/5',
  'Premise': 'border-l-muted-foreground/50 bg-muted/30',
  'Premise 1': 'border-l-muted-foreground/50 bg-muted/30',
  'Premise 2': 'border-l-muted-foreground/50 bg-muted/30',
  'Premise 3': 'border-l-muted-foreground/50 bg-muted/30',
  'Premise (Support)': 'border-l-muted-foreground/50 bg-muted/30',
  'Premise (Support for IC)': 'border-l-muted-foreground/50 bg-muted/30',
  'Background': 'border-l-muted-foreground/30 bg-muted/20',
  'Opposing Argument (Economists)': 'border-l-red-500/50 bg-red-500/5',
  'Opposing View (Cause)': 'border-l-red-500/50 bg-red-500/5',
  'Phenomenon / Observation': 'border-l-purple-500/50 bg-purple-500/5',
  "Author's Conclusion": 'border-l-blue-500 bg-blue-500/5',
};

function getLabelColor(label: string) {
  return LABEL_COLORS[label] || 'border-l-muted-foreground/30 bg-muted/20';
}

export default function AdvancedQuizViewer({ onComplete }: { onComplete?: (count: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<QuizState>('intro');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showPreTeaching, setShowPreTeaching] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const question = roleQuestions[currentIndex];
  const isLast = currentIndex === roleQuestions.length - 1;

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    setState('teardown');
    const newCount = completedCount + 1;
    setCompletedCount(newCount);
    onComplete?.(newCount);
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setState('test');
    setSelectedAnswer(null);
    setShowPreTeaching(false);
    setShowWalkthrough(false);
  };

  if (state === 'intro') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 lg:p-8 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Module 2 — Advanced Application</p>
          <h2 className="text-lg font-bold text-foreground">A Selection of the Hardest Role Questions</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
            {MODULE_2_INTRO.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
        <button
          onClick={() => setState('test')}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
        >
          <ArrowRight className="h-4 w-4" /> Begin Questions
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-bold text-foreground">All {roleQuestions.length} Questions Complete</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          You've worked through the hardest Role questions with full structural breakdowns. Review any question you'd like to revisit.
        </p>
        <button
          onClick={() => { setCurrentIndex(0); setState('test'); setSelectedAnswer(null); setFinished(false); setCompletedCount(0); setShowPreTeaching(false); setShowWalkthrough(false); }}
          className="flex items-center gap-2 text-sm text-primary hover:underline mt-4"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          Question {currentIndex + 1} of {roleQuestions.length} — {question.id}
        </span>
        <div className="flex gap-1">
          {roleQuestions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < completedCount ? 'bg-emerald-500' : i === currentIndex ? 'bg-primary' : 'bg-accent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Difficult Trait Callout */}
      {question.difficultTrait && state === 'test' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Difficult Trait #{question.difficultTrait.number}: {question.difficultTrait.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{question.difficultTrait.text}</p>
          </div>
        </div>
      )}

      {/* Transition Note */}
      {question.transitionNote && state === 'test' && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{question.transitionNote}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentIndex}-${state}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Stimulus */}
          <div className="rounded-xl border border-border bg-card p-6 lg:p-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">Stimulus</p>
            <p className="text-sm lg:text-base text-foreground leading-relaxed">{question.stimulus}</p>
          </div>

          {/* Question */}
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm font-medium text-foreground leading-relaxed">{question.questionStem}</p>
          </div>

          {/* Options */}
          {state === 'test' && (
            <div className="space-y-2">
              {question.options.map(opt => (
                <button
                  key={opt.letter}
                  onClick={() => setSelectedAnswer(opt.letter)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-sm ${
                    selectedAnswer === opt.letter
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="font-bold mr-2">{opt.letter}.</span>
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {/* Submit */}
          {state === 'test' && (
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                selectedAnswer
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-accent text-muted-foreground cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          )}

          {/* Teardown */}
          {state === 'teardown' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Result Badge */}
              <div className={`rounded-xl border p-4 flex items-center gap-3 ${
                selectedAnswer === question.correctAnswer
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                {selectedAnswer === question.correctAnswer
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                }
                <span className="text-sm font-bold text-foreground">
                  {selectedAnswer === question.correctAnswer ? 'Correct!' : `Incorrect — the answer is ${question.correctAnswer}`}
                </span>
              </div>

              {/* Pre-Teaching (for causality lesson) */}
              {question.preTeaching && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setShowPreTeaching(!showPreTeaching)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="text-xs uppercase tracking-[0.15em] font-bold text-primary">Key Lesson: Causality vs. Argument Structure</p>
                    </div>
                    {showPreTeaching ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {showPreTeaching && (
                    <div className="px-5 pb-5 border-t border-border pt-4">
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{question.preTeaching}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Causal Trap Warning */}
              {question.causalTrapWarning && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400">Causal Trap</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{question.causalTrapWarning}</p>
                </div>
              )}

              {/* Walkthrough */}
              {question.walkthrough && question.walkthrough.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setShowWalkthrough(!showWalkthrough)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="text-xs uppercase tracking-[0.15em] font-bold text-primary">Step-by-Step Walkthrough</p>
                    </div>
                    {showWalkthrough ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {showWalkthrough && (
                    <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                      {question.walkthrough.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{step}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Structural Map */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-4">Structural Map</p>
                <div className="space-y-2">
                  {question.structuralMap.map((entry, i) => (
                    <div key={i} className={`border-l-4 rounded-r-lg p-3 ${getLabelColor(entry.label)}`}>
                      <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground mb-1">{entry.label}</p>
                      <p className="text-sm text-foreground leading-relaxed">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer Breakdowns */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Answer Choice Analysis</p>
                {question.answerBreakdowns.map(ab => (
                  <div
                    key={ab.letter}
                    className={`rounded-lg border p-4 space-y-2 ${
                      ab.isCorrect
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : selectedAnswer === ab.letter
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {ab.isCorrect
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        : <XCircle className="h-4 w-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                      }
                      <p className="text-sm text-foreground">
                        <span className="font-bold">{ab.letter}.</span> {ab.text}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6 whitespace-pre-line">{ab.explanation}</p>
                  </div>
                ))}
              </div>

              {/* Takeaway */}
              {question.takeaway && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-emerald-600 dark:text-emerald-400 mb-1">Takeaway</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{question.takeaway}</p>
                  </div>
                </div>
              )}

              {/* Next Button */}
              <button
                onClick={handleNext}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2"
              >
                <ArrowRight className="h-4 w-4" /> {isLast ? 'Finish' : 'Next Question'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
