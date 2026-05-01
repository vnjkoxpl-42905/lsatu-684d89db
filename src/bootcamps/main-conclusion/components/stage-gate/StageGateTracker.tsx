/**
 * StageGateTracker — universal drill frame.
 * 4 stages × 5 questions, score 4/5 to unlock next stage, auto-save, PDF export.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, RefreshCcw, ArrowRight, FileDown } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

export interface StageQuestion<TPayload = unknown> {
  id: string;
  prompt: string;
  payload: TPayload;
}

export interface Stage<TPayload = unknown> {
  number: 1 | 2 | 3 | 4;
  title: string;
  hint?: string;
  questions: StageQuestion<TPayload>[];
}

interface Props<TPayload> {
  drillId: string;
  stages: Stage<TPayload>[];
  renderQuestion: (
    q: StageQuestion<TPayload>,
    onAnswer: (correct: boolean) => void,
    state: { answered: boolean; correct: boolean | null },
  ) => ReactNode;
  onStageComplete?: (stage: number, score: number, passed: boolean) => void;
  onDrillComplete?: () => void;
  onPdfExport?: () => void;
}

const PASS_SCORE = 4;

interface StageState {
  responses: Array<boolean | null>;
  completed: boolean;
  passed: boolean;
}

function blankStage(qCount: number): StageState {
  return { responses: Array(qCount).fill(null), completed: false, passed: false };
}

export function StageGateTracker<TPayload>({
  drillId,
  stages,
  renderQuestion,
  onStageComplete,
  onDrillComplete,
  onPdfExport,
}: Props<TPayload>) {
  const [stageStates, setStageStates] = useState<StageState[]>(() =>
    stages.map((s) => blankStage(s.questions.length)),
  );
  const [activeStage, setActiveStage] = useState(0);

  const unlocked = useMemo(() => {
    const u = stages.map(() => false);
    u[0] = true;
    for (let i = 0; i < stages.length - 1; i++) {
      if (stageStates[i]?.passed) u[i + 1] = true;
    }
    return u;
  }, [stages, stageStates]);

  const stage = stages[activeStage]!;
  const state = stageStates[activeStage]!;
  const allCleared = stageStates.every((s) => s.passed);

  function answerQuestion(qIndex: number, correct: boolean) {
    setStageStates((prev) => {
      const next = prev.map((s) => ({ ...s, responses: [...s.responses] }));
      const cur = next[activeStage]!;
      cur.responses[qIndex] = correct;
      const allAnswered = cur.responses.every((r) => r !== null);
      if (allAnswered) {
        const score = cur.responses.filter(Boolean).length;
        cur.completed = true;
        cur.passed = score >= PASS_SCORE;
        onStageComplete?.(activeStage + 1, score, cur.passed);
        if (activeStage === stages.length - 1 && cur.passed) {
          onDrillComplete?.();
        }
      }
      return next;
    });
  }

  function resetStage() {
    setStageStates((prev) => {
      const next = [...prev];
      next[activeStage] = blankStage(stage.questions.length);
      return next;
    });
  }

  return (
    <div className="space-y-6" data-drill-id={drillId}>
      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
            />
            Stage-Gate Tracker
          </div>
          <h1 className="font-mc-serif text-h1 font-semibold mt-2 text-ink">{drillId}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="success" dot pulse>
            auto-save on
          </Badge>
          {onPdfExport ? (
            <Button
              variant="subtle"
              size="sm"
              leftIcon={<FileDown className="h-3.5 w-3.5" strokeWidth={2.2} />}
              onClick={onPdfExport}
            >
              Export PDF
            </Button>
          ) : null}
        </div>
      </header>

      <nav role="tablist" aria-label="Stages" className="grid gap-2 sm:grid-cols-4">
        {stages.map((s, i) => {
          const st = stageStates[i]!;
          const isActive = i === activeStage;
          const isUnlocked = unlocked[i];
          const score = st.responses.filter(Boolean).length;
          return (
            <button
              key={s.number}
              role="tab"
              aria-selected={isActive}
              disabled={!isUnlocked}
              onClick={() => setActiveStage(i)}
              className={cn(
                'group/stage relative rounded-3 border px-3 py-3 text-left',
                'transition-[background,border-color,box-shadow,transform] duration-180 ease-eased',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                'disabled:cursor-not-allowed',
                isActive
                  ? 'bg-[image:var(--grad-accent-soft)] border-[color:var(--border-accent-mid)] shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.06)]'
                  : isUnlocked
                  ? 'bg-[image:var(--grad-surface-soft)] border-[rgb(var(--border)/0.08)] hover:-translate-y-[1px] hover:border-[color:var(--border-accent-soft)] hover:shadow-[var(--shadow-2)]'
                  : 'bg-[rgb(var(--surface)/0.4)] border-[rgb(var(--border)/0.06)] opacity-60',
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full',
                    'font-mc-mono text-mono font-semibold',
                    isActive
                      ? 'bg-[rgb(var(--accent))] text-[rgb(var(--bg))] shadow-[0_0_8px_rgb(232_208_139/0.6)]'
                      : st.passed
                      ? 'bg-[rgb(var(--success)/0.18)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.40)]'
                      : isUnlocked
                      ? 'bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.10)]'
                      : 'bg-[rgb(var(--surface-elev))] text-ink-faint border border-[rgb(var(--border)/0.10)]',
                  )}
                >
                  {st.passed ? (
                    <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                  ) : !isUnlocked ? (
                    <Lock className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                  ) : (
                    s.number
                  )}
                </div>
                {st.completed ? (
                  <Badge tone={st.passed ? 'success' : 'warn'} className="ml-auto shrink-0">
                    {score}/{s.questions.length}
                  </Badge>
                ) : null}
              </div>
              <div
                className={cn(
                  'font-mc-serif text-body font-semibold mt-2.5 leading-tight',
                  isActive ? 'text-ink' : 'text-ink-soft',
                )}
              >
                {s.title}
              </div>
              <div className="mt-2.5 flex items-center gap-1">
                {st.responses.map((r, ri) => (
                  <span
                    key={ri}
                    className={cn(
                      'h-1 flex-1 rounded-full',
                      r === null
                        ? 'bg-[rgb(var(--border)/0.18)]'
                        : r
                        ? 'bg-[rgb(var(--success))]'
                        : 'bg-[rgb(var(--error))]',
                    )}
                  />
                ))}
              </div>
              {isActive ? (
                <motion.span
                  layoutId="mc-stage-active-bar"
                  aria-hidden="true"
                  transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.6 }}
                  className="absolute left-0 right-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[color:var(--border-accent-strong)] to-transparent"
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <section aria-labelledby={`stage-${stage.number}-title`} className="space-y-4">
        <div>
          <h2 id={`stage-${stage.number}-title`} className="font-mc-serif text-h2 font-semibold text-ink">
            Stage {stage.number}: {stage.title}
          </h2>
          {stage.hint ? (
            <p className="font-mc-serif text-body-prose text-ink-soft mt-1.5 leading-relaxed">{stage.hint}</p>
          ) : null}
        </div>
        <ol className="space-y-3">
          {stage.questions.map((q, i) => (
            <li key={q.id}>
              {renderQuestion(q, (correct) => answerQuestion(i, correct), {
                answered: state.responses[i] !== null,
                correct: state.responses[i] ?? null,
              })}
            </li>
          ))}
        </ol>
        {state.completed ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'flex items-center justify-between gap-4 rounded-3 px-4 py-3',
              state.passed
                ? 'bg-[rgb(var(--success)/0.08)] border border-[rgb(var(--success)/0.30)]'
                : 'bg-[rgb(var(--warn)/0.08)] border border-[rgb(var(--warn)/0.30)]',
            )}
          >
            <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
              {state.passed
                ? `Stage ${stage.number} cleared — pass threshold ${PASS_SCORE}/${stage.questions.length}.`
                : `Stage ${stage.number} below threshold (${PASS_SCORE}/${stage.questions.length}). Retry to unlock the next stage.`}
            </p>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="subtle"
                size="sm"
                leftIcon={<RefreshCcw className="h-3.5 w-3.5" strokeWidth={2.2} />}
                onClick={resetStage}
              >
                Retry
              </Button>
              {state.passed && activeStage < stages.length - 1 ? (
                <Button
                  size="sm"
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}
                  onClick={() => setActiveStage(activeStage + 1)}
                >
                  Next stage
                </Button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
        {allCleared ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'rounded-4 p-5',
              'bg-[image:var(--grad-accent-soft)]',
              'border border-[color:var(--border-accent-mid)]',
              'shadow-[var(--glow-accent-soft)]',
            )}
          >
            <Badge tone="accent" dot pulse>
              drill cleared
            </Badge>
            <h3 className="font-mc-serif text-h2 font-semibold mt-2 text-ink">All four stages passed.</h3>
          </motion.div>
        ) : null}
      </section>
    </div>
  );
}
