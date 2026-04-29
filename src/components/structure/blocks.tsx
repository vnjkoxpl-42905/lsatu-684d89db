/* =========================================================================
   Structure Bootcamp · Reusable building blocks
   - Card             content wrapper with eyebrow label + title
   - XRayBlock/XText  click-to-color-code argument roles on a stimulus
   - CoachQuiz        embedded multi-question checkpoint with feedback
   - CompletionButton gates module advance
   - HoverRevealGrid  expandable grid for FABS-style reveals
   - ScenarioStepper  walk through scenarios one at a time
   ========================================================================= */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Card ──────────────────────────────────────────────────────────────── */
export function Card({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{label}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

/* ─── XRayBlock / XText ────────────────────────────────────────────────── */
export type XRole = 'premise' | 'conclusion' | 'opposing' | 'pivot' | 'background' | 'indicator';

export function XRayBlock({ children, label = 'Stimulus' }: { children: (xray: boolean) => React.ReactNode; label?: string }) {
  const [xray, setXray] = useState(false);
  return (
    <div className="relative rounded-xl border border-border bg-card/50 p-6 mt-4">
      <button
        onClick={() => setXray(!xray)}
        className={cn(
          'absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border',
          xray
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            : 'bg-card text-muted-foreground border-border hover:bg-accent',
        )}
      >
        {xray ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {xray ? 'Hide structure' : 'X-Ray structure'}
      </button>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium block mb-3">{label}</span>
      <div className="text-sm leading-relaxed italic text-muted-foreground">{children(xray)}</div>
      <AnimatePresence>
        {xray && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 pt-4 border-t border-border flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-wider"
          >
            <Legend color="emerald" label="Conclusion" />
            <Legend color="blue" label="Premise" />
            <Legend color="purple" label="Opposing" />
            <Legend color="orange" label="Pivot" />
            <Legend color="slate" label="Background" />
            <Legend color="amber" label="Indicator" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const LEGEND_DOTS: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue:    'bg-blue-500',
  purple:  'bg-purple-500',
  orange:  'bg-orange-500',
  slate:   'bg-slate-500',
  amber:   'bg-amber-500',
};
function Legend({ color, label }: { color: keyof typeof LEGEND_DOTS; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn('w-2 h-2 rounded-full', LEGEND_DOTS[color])} /> {label}
    </span>
  );
}

export function XText({ type, xray, children }: { type: XRole; xray: boolean; children: React.ReactNode }) {
  const styles: Record<XRole, string> = {
    premise:    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-400 rounded px-1 not-italic',
    conclusion: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-400 rounded px-1 not-italic',
    opposing:   'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-b-2 border-purple-400 rounded px-1 not-italic',
    pivot:      'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-b-2 border-orange-400 rounded px-1 not-italic font-semibold',
    background: 'text-slate-500 not-italic',
    indicator:  'text-amber-500 dark:text-amber-400 font-extrabold not-italic',
  };
  return <span className={cn('transition-all duration-300', xray && styles[type])}>{children}</span>;
}

/* ─── CoachQuiz ──────────────────────────────────────────────────────── */
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}
export function CoachQuiz({ questions, onComplete }: { questions: QuizQuestion[]; onComplete?: () => void }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [show, setShow] = useState(false);
  const q = questions[idx];

  function handlePick(i: number) {
    if (show) return;
    setPicked(i);
    setShow(true);
  }
  function next() {
    if (idx === questions.length - 1) { onComplete?.(); return; }
    setIdx(i => i + 1);
    setPicked(null);
    setShow(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80 font-bold">? Check-in</span>
        <span className="text-[10px] font-mono text-muted-foreground">{idx + 1} / {questions.length}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{q.question}</h3>
      <div className="space-y-2">
        {q.options.map((option, i) => {
          const isPicked = picked === i;
          const isCorrect = i === q.correctAnswerIndex;
          return (
            <button
              key={i}
              onClick={() => handlePick(i)}
              disabled={show}
              className={cn(
                'w-full p-3 rounded-lg border text-left text-sm transition-all font-medium',
                show && isCorrect && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
                show && isPicked && !isCorrect && 'bg-destructive/10 border-destructive/30 text-destructive',
                (!show || (!isPicked && !isCorrect)) && 'bg-card border-border hover:border-amber-500/30 text-foreground',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 pt-2"
          >
            <p className="text-sm font-semibold text-foreground">
              {picked === q.correctAnswerIndex ? '✓ Spot on.' : '✗ Not quite — read why.'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
            <button onClick={next} className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors">
              {idx === questions.length - 1 ? 'Finish check-in →' : 'Next →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── CompletionButton ──────────────────────────────────────────────── */
export function CompletionButton({ isCompleted, onClick, label = 'Finalize Module' }: { isCompleted: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={isCompleted}
      className={cn(
        'w-full py-3 rounded-xl text-sm font-bold transition-colors mt-4',
        isCompleted
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
          : 'bg-foreground text-background hover:bg-foreground/90',
      )}
    >
      {isCompleted ? <span className="inline-flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> MODULE COMPLETED</span> : label}
    </button>
  );
}

/* ─── HoverRevealGrid ──────────────────────────────────────────────── */
export interface RevealItem { key: string; head: string; sub?: string; body: React.ReactNode; }
export function HoverRevealGrid({ items, columns = 4 }: { items: RevealItem[]; columns?: 2 | 4 }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className={cn('grid gap-3 mt-4', columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
      {items.map(item => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onMouseEnter={() => setActive(item.key)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(isActive ? null : item.key)}
            className={cn(
              'group relative rounded-xl border p-4 text-left transition-all overflow-hidden',
              isActive ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_24px_rgba(245,158,11,0.1)]' : 'border-border bg-card hover:border-amber-500/20',
            )}
          >
            <div className={cn('text-2xl font-black tracking-tight transition-colors', isActive ? 'text-amber-400' : 'text-foreground')}>
              {item.head}
            </div>
            {item.sub && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{item.sub}</div>}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-muted-foreground mt-3 leading-relaxed"
                >
                  {item.body}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}

/* ─── ScenarioStepper ─────────────────────────────────────────────── */
export interface Scenario { key: string; label: string; result: 'pass' | 'fail'; verdict: string; explanation: string; }
export function ScenarioStepper({ scenarios }: { scenarios: Scenario[] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = scenarios.find(s => s.key === activeKey);

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 mt-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Try a scenario</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {scenarios.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveKey(activeKey === s.key ? null : s.key)}
            className={cn(
              'rounded-lg border p-3 text-left text-xs transition-all',
              activeKey === s.key
                ? s.result === 'pass'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-card border-border hover:border-amber-500/20 text-foreground',
            )}
          >
            <span className="font-semibold">{s.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'rounded-lg border p-4 space-y-2',
              active.result === 'pass' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5',
            )}
          >
            <div className={cn('text-[10px] uppercase tracking-widest font-bold', active.result === 'pass' ? 'text-emerald-400' : 'text-destructive')}>
              {active.verdict}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{active.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
