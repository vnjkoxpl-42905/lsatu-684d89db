/**
 * Practice Drills — bootcamp-scoped Guided-Drill-style launchers.
 *
 * Metadata (titles, qtypes, qfeatures, counts, qids) lives in the
 * single source of truth at
 *   src/bootcamps/main-conclusion/data/practiceDrillPools.ts
 * This file is purely the list UI; it does not filter the question
 * bank itself.
 */

import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import {
  MAIN_CONCLUSION_PRACTICE_CARDS,
  buildPracticeDrillHref,
  buildPracticeDrillLinkState,
} from '@/bootcamps/main-conclusion/data/practiceDrillCards';
import {
  usePracticeDrillStatus,
  type PracticeDrillStatus,
} from '@/bootcamps/main-conclusion/hooks/usePracticeDrillStatus';

/**
 * Per-question markers. The student should be able to tell at a glance which
 * questions in a set they have already done, without opening the drill.
 */
function QuestionMarkers({ status }: { status: PracticeDrillStatus }) {
  return (
    <div className="space-y-2">
      <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">
        Questions
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {status.questionOutcomes.map((outcome, index) => {
          const isResumePoint =
            status.state === 'in-progress' && index === status.resumeIndex;
          const label =
            outcome === 'unanswered'
              ? `Question ${index + 1}: not done yet`
              : `Question ${index + 1}: done, answered ${outcome}ly`;
          return (
            <span
              key={index}
              title={label}
              aria-label={label}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full',
                'font-mc-mono text-[10px] tabular-nums transition-colors duration-150',
                outcome === 'correct' &&
                  'bg-[rgb(var(--success)/0.16)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.32)]',
                outcome === 'incorrect' &&
                  'bg-[rgb(var(--error)/0.14)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.30)]',
                outcome === 'unanswered' &&
                  'border border-[rgb(var(--border)/0.20)] text-ink-faint',
                isResumePoint && 'ring-2 ring-mc-accent/40 ring-offset-1 ring-offset-transparent',
              )}
            >
              {outcome === 'unanswered' ? index + 1 : <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function PracticeDrillsIndex() {
  const navigate = useNavigate();
  const { statuses, loading } = usePracticeDrillStatus();

  const handleViewInstructions = (card: (typeof MAIN_CONCLUSION_PRACTICE_CARDS)[number]) => {
    navigate(buildPracticeDrillHref(card.pool), {
      state: buildPracticeDrillLinkState(card.pool),
    });
  };

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-6xl mx-auto space-y-12">
      <header>
        <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent mb-3">
          PRACTICE DRILLS
        </div>
        <h1 className="font-mc-serif text-h1 font-semibold text-ink leading-tight">
          Main Conclusion Practice
        </h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-4 leading-relaxed max-w-prose">
          Choose a focused Main Conclusion set, review the pattern, then start the drill.
        </p>
      </header>

      <section className="grid grid-cols-1 desktop:grid-cols-2 gap-8">
        {MAIN_CONCLUSION_PRACTICE_CARDS.map((card) => {
          const Icon = card.Icon;
          const { pool } = card;
          const status = statuses[pool.slug];
          const isCompleted = status?.state === 'completed';
          const isInProgress = status?.state === 'in-progress';
          return (
            <Card
              key={pool.slug}
              variant="surface"
              interactive={true}
              className={cn(
                'flex flex-col h-full',
                isCompleted && 'border-[rgb(var(--success)/0.28)]',
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Badge tone="accent">{card.badge}</Badge>
                  <span className="font-mc-mono text-[10px] uppercase tracking-widest text-ink-soft opacity-70">
                    {card.featureLabel}
                  </span>
                </div>
                <Icon className="h-5 w-5 text-mc-accent/40" />
              </div>

              {/* Status line — the answer to "did I already do this?" */}
              {!loading && status ? (
                <div className="mb-5">
                  {isCompleted ? (
                    <Badge tone="success" dot>
                      Completed
                    </Badge>
                  ) : isInProgress ? (
                    <Badge tone="warn" dot pulse>
                      In progress · {status.answered} of {status.total} done
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Not started</Badge>
                  )}
                </div>
              ) : null}

              <h3 className="font-mc-serif text-2xl italic mb-3 text-ink">{pool.title}</h3>
              <p className="font-mc-sans text-body-small text-ink-soft mb-8 flex-grow">
                {card.description}
              </p>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                <div className="space-y-1">
                  <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Question Type</span>
                  <span className="block font-mc-sans text-sm font-medium text-ink">{card.questionTypeLabel}</span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Question Feature</span>
                  <span className="block font-mc-sans text-sm font-medium text-ink">{pool.qfeatures.join(', ')}</span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Count</span>
                  <span className="block font-mc-sans text-sm font-medium text-ink">{pool.count} questions</span>
                </div>
                {!loading && status && status.answered > 0 ? (
                  <div className="space-y-1">
                    <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Your Score</span>
                    <span className="block font-mc-sans text-sm font-medium text-ink">
                      {status.correct} of {status.answered} correct
                    </span>
                  </div>
                ) : null}
              </div>

              {!loading && status && status.answered > 0 ? (
                <div className="mb-8">
                  <QuestionMarkers status={status} />
                </div>
              ) : null}

              <div className="mb-8 p-4 bg-mc-surface-elev border border-ink/5 rounded-lg space-y-2">
                <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-mc-accent font-semibold">Constraint</span>
                <p className="font-mc-sans text-sm text-ink leading-relaxed">
                  {card.constraint}
                </p>
              </div>

              <Button
                onClick={() => handleViewInstructions(card)}
                variant="primary"
                size="lg"
                className="w-full justify-center"
                rightIcon={
                  isCompleted ? (
                    <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
                  ) : (
                    <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                  )
                }
              >
                {isInProgress
                  ? `Resume · Question ${status.resumeIndex + 1}`
                  : isCompleted
                  ? 'Practice Again'
                  : 'View Instructions'}
              </Button>
            </Card>
          );
        })}
      </section>
    </article>
  );
}
