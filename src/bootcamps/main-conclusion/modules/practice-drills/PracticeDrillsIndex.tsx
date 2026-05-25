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
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent mb-3">
          PRACTICE DRILLS
        </div>
        <h1 className="font-mc-serif text-h1 font-semibold text-ink leading-tight">
          Main Conclusion Practice
        </h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-4 leading-relaxed max-w-prose">
          Guided Main Conclusion sets. Review the constraint first, then start the drill.
        </p>
      </header>

      <section className="grid gap-6">
        {CARDS.map((card) => {
          const Icon = card.Icon;
          const { pool } = card;
          return (
            <div
              key={pool.slug}
              className="group bg-white border border-[rgba(26,26,26,0.1)] p-8 transition-all hover:border-[rgba(26,26,26,0.3)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon className="h-4 w-4 text-[rgba(26,26,26,0.6)]" strokeWidth={2} />
                <span className="inline-flex items-center rounded-full bg-[rgba(26,26,26,0.05)] px-2.5 py-0.5 text-[10px] font-semibold text-[rgba(26,26,26,0.6)] uppercase tracking-wider">
                  {card.badge}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[rgba(26,26,26,0.4)]">
                  {card.featureLabel}
                </span>
              </div>
              <h3 className="font-mc-serif text-xl italic mb-3 text-[#1a1a1a]">{pool.title}</h3>
              <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)] mb-6">
                {card.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8 text-[11px] font-mc-mono uppercase tracking-[0.1em]">
                <div className="text-[rgba(26,26,26,0.4)]">
                  <span className="block text-[rgba(26,26,26,0.8)]">Count</span>
                  {pool.count} questions
                </div>
                <div className="text-[rgba(26,26,26,0.4)]">
                  <span className="block text-[rgba(26,26,26,0.8)]">Order</span>
                  Easiest first
                </div>
                <div className="text-[rgba(26,26,26,0.4)] col-span-2">
                  <span className="block text-[rgba(26,26,26,0.8)]">Filter</span>
                  qtype = {pool.qtypes.join(', ')} · feature = {pool.qfeatures.join(', ')}
                </div>
                <div className="text-[rgba(26,26,26,0.4)] col-span-2">
                  <span className="block text-[rgba(26,26,26,0.8)]">Constraint</span>
                  {card.constraint}
                </div>
              </div>

              <Button
                onClick={() => handleViewInstructions(pool)}
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
              >
                View Instructions
              </Button>
            </div>
          );
        })}
      </section>
    </article>
  );
}
