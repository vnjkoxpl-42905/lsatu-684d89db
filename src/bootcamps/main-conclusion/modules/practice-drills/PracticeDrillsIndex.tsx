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
  Sparkles,
  MessageSquareWarning,
} from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import {
  MAIN_CONCLUSION_PRACTICE_POOLS,
  type PracticePool,
} from '@/bootcamps/main-conclusion/data/practiceDrillPools';

interface PracticeCard {
  pool: PracticePool;
  description: string;
  constraint: string;
  badge: string;
  featureLabel: string;
  Icon: typeof Sparkles;
}

const CARDS: PracticeCard[] = [
  {
    pool: MAIN_CONCLUSION_PRACTICE_POOLS['first-sentence-conclusions'],
    description:
      'Practice Main Conclusion questions where the author’s conclusion appears in the first sentence.',
    constraint:
      'The conclusion appears in the first sentence, but you still must confirm it with support.',
    badge: 'Main Conclusion',
    featureLabel: 'First Sentence',
    Icon: Sparkles,
  },
  {
    pool: MAIN_CONCLUSION_PRACTICE_POOLS['rebuttal-conclusions'],
    description:
      'Practice Main Conclusion questions where the author responds to or rejects another view.',
    constraint:
      'Find the author’s own conclusion, not the view the author is rejecting.',
    badge: 'Main Conclusion',
    featureLabel: 'Rebuttal',
    Icon: MessageSquareWarning,
  },
];

export function PracticeDrillsIndex() {
  const navigate = useNavigate();

  const handleViewInstructions = (pool: PracticePool) => {
    navigate(`/guided-drills/${pool.slug}?returnTo=${encodeURIComponent(pool.returnTo)}`, {
      state: { bootcampOverride: pool },
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
        {CARDS.map((card) => {
          const Icon = card.Icon;
          const { pool } = card;
          return (
            <Card
              key={pool.slug}
              variant="surface"
              interactive={true}
              className="flex flex-col h-full"
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

              <h3 className="font-mc-serif text-2xl italic mb-3 text-ink">{pool.title}</h3>
              <p className="font-mc-sans text-body-small text-ink-soft mb-8 flex-grow">
                {card.description}
              </p>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                <div className="space-y-1">
                  <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Question Type</span>
                  <span className="block font-mc-sans text-sm font-medium text-ink">Main Conclusion</span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Question Feature</span>
                  <span className="block font-mc-sans text-sm font-medium text-ink">{pool.qfeatures.join(', ')}</span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Starting Level</span>
                  <span className="block font-mc-sans text-sm font-medium text-ink">Lower difficulty first</span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-ink-soft opacity-60">Count</span>
                  <span className="block font-mc-sans text-sm font-medium text-ink">{pool.count} questions</span>
                </div>
              </div>

              <div className="mb-8 p-4 bg-mc-surface-elev border border-ink/5 rounded-lg space-y-2">
                <span className="block font-mc-mono text-[10px] uppercase tracking-wider text-mc-accent font-semibold">Constraint</span>
                <p className="font-mc-sans text-sm text-ink leading-relaxed">
                  {card.constraint}
                </p>
              </div>

              <Button
                onClick={() => handleViewInstructions(pool)}
                variant="primary"
                size="lg"
                className="w-full justify-center"
                rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
              >
                View Instructions
              </Button>
            </Card>
          );
        })}
      </section>
    </article>
  );
}
