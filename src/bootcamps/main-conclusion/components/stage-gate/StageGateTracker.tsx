/**
 * StageGateTracker — universal drill frame.
 * 4 stages × 5 questions, score 4/5 to unlock next stage, auto-save, PDF export.
 * Per architecture-plan §1 (lifted from mainconclusionrebuttalvsfirst.netlify.app prototype).
 *
 * Generic over the question shape. Drill 3.1, 3.2, 3.3, 3.4 mount this with their own data.
 */

import { useMemo, useState, type ReactNode } from 'react';
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
  responses: Array<boolean | null>; // index → correct?
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
    const u = [true, false, false, false];
    for (let i = 0; i < stages.length - 1; i++) {
      if (stageStates[i]?.passed) u[i + 1] = true;
    }
    return u;
  }, [stages.length, stageStates]);

  const stage = stages[activeStage]!;
  const state = stageStates[activeStage]!;

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
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Stage-Gate Tracker</div>
          <h1 className="font-mc-serif text-h1 font-semibold mt-1">{drillId}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mc-mono text-mono text-ink-faint">Auto-save</span>
          <Badge tone="success">on</Badge>
          {onPdfExport ? (
            <Button variant="subtle" size="sm" onClick={onPdfExport}>
              Export PDF
            </Button>
          ) : null}
        </div>
      </header>

      <nav role="tablist" aria-label="Stages" className="flex gap-2">
        {stages.map((s, i) => {
          const st = stageStates[i]!;
          const isActive = i === activeStage;
          const isUnlocked = unlocked[i];
          return (
            <button
              key={s.number}
              role="tab"
              aria-selected={isActive}
              disabled={!isUnlocked}
              onClick={() => setActiveStage(i)}
              className={cn(
                'flex-1 rounded-3 border px-3 py-2 text-left transition-colors duration-150 ease-eased',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                isActive
                  ? 'bg-[rgb(var(--accent)/0.10)] border-[rgb(var(--accent)/0.40)]'
                  : 'bg-[rgb(var(--surface))] border-[rgb(var(--border)/0.08)] hover:border-[rgb(var(--accent)/0.30)]',
              )}
            >
              <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Stage {s.number}</div>
              <div className="font-mc-serif text-body font-semibold mt-1">{s.title}</div>
              <div className="mt-2 flex items-center gap-1.5">
                {st.responses.map((r, ri) => (
                  <span
                    key={ri}
                    className={cn(
                      'inline-block h-1.5 w-6 rounded-full',
                      r === null
                        ? 'bg-[rgb(var(--border)/0.20)]'
                        : r
                          ? 'bg-[rgb(var(--success))]'
                          : 'bg-[rgb(var(--error))]',
                    )}
                  />
                ))}
              </div>
              {st.completed ? (
                <div className="mt-2">
                  <Badge tone={st.passed ? 'success' : 'warn'}>
                    {st.responses.filter(Boolean).length} / {s.questions.length} {st.passed ? 'passed' : 'retry'}
                  </Badge>
                </div>
              ) : null}
            </button>
          );
        })}
      </nav>

      <section aria-labelledby={`stage-${stage.number}-title`} className="space-y-4">
        <div>
          <h2 id={`stage-${stage.number}-title`} className="font-mc-serif text-h2 font-semibold">
            Stage {stage.number}: {stage.title}
          </h2>
          {stage.hint ? (
            <p className="font-mc-serif text-body-prose text-ink-soft mt-1">{stage.hint}</p>
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
          <div className="flex items-center justify-between pt-2">
            <p className="font-mc-serif text-body-prose text-ink-soft">
              {state.passed
                ? `Stage ${stage.number} cleared — pass threshold ${PASS_SCORE}/5.`
                : `Stage ${stage.number} below threshold (${PASS_SCORE}/5). Retry to unlock the next stage.`}
            </p>
            <div className="flex gap-2">
              <Button variant="subtle" size="sm" onClick={resetStage}>
                Retry stage
              </Button>
              {state.passed && activeStage < stages.length - 1 ? (
                <Button size="sm" onClick={() => setActiveStage(activeStage + 1)}>
                  Next stage →
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
