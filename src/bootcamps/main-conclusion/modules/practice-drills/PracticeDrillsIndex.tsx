/**
 * Practice Drills — bootcamp-scoped Guided-Drill-style launchers.
 *
 * Two assigned question sets:
 *   • First-Sentence Main Conclusion  — structure_family "First-sentence"
 *   • Rebuttal Main Conclusion        — structure_family "Rebuttal"
 *
 * Flow: list → instruction card (title, count, constraint)
 *  → /guided-drills/:slug (instruction surface)
 *  → Start Drill launches bootcamp-native runner route at /bootcamp/intro-to-lr/practice-drills/:practiceSlug.
 */

import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  MessageSquareWarning,
} from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

type SetKey = 'first-sentence' | 'rebuttal';

interface PracticeSet {
  key: SetKey;
  title: string;
  badge: string;
  feature: string;
  description: string;
  constraint: string;
  instructionsSlug: string;
  count: number;
  Icon: typeof Sparkles;
}

const SETS: PracticeSet[] = [
  {
    key: 'first-sentence',
    title: 'First-Sentence Main Conclusion',
    badge: 'Main Conclusion',
    feature: 'First Sentence',
    description: 'Practice Main Conclusion questions where the author’s conclusion appears in the first sentence.',
    constraint: 'The conclusion appears in the first sentence, but you still must confirm it with support.',
    instructionsSlug: 'first-sentence-conclusions',
    count: 6,
    Icon: Sparkles,
  },
  {
    key: 'rebuttal',
    title: 'Rebuttal Main Conclusion',
    badge: 'Main Conclusion',
    feature: 'Rebuttal',
    description: 'Practice Main Conclusion questions where the author responds to or rejects another view.',
    constraint: 'Find the author’s own conclusion, not the view the author is rejecting.',
    instructionsSlug: 'rebuttal-conclusions',
    count: 4,
    Icon: MessageSquareWarning,
  },
];

export function PracticeDrillsIndex() {
  const navigate = useNavigate();

  const handleViewInstructions = (set: PracticeSet) => {
    const isRebuttal = set.key === 'rebuttal';
    navigate(`/guided-drills/${set.instructionsSlug}?returnTo=/bootcamp/intro-to-lr/practice-drills`, {
      state: {
        bootcampOverride: {
          qtypes: ['Main Conclusion'],
          questionFeatures: isRebuttal ? ['Rebuttals'] : ['First Sentence Conclusion'],
          count: set.count,
          title: set.title,
          returnTo: '/bootcamp/intro-to-lr/practice-drills',
          source: 'intro-to-lr-practice-drills',
        },
      },
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
        {SETS.map((set) => {
          const Icon = set.Icon;
          return (
            <div
              key={set.key}
              className="group bg-white border border-[rgba(26,26,26,0.1)] p-8 transition-all hover:border-[rgba(26,26,26,0.3)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center rounded-full bg-[rgba(26,26,26,0.05)] px-2.5 py-0.5 text-[10px] font-semibold text-[rgba(26,26,26,0.6)] uppercase tracking-wider">
                  {set.badge}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[rgba(26,26,26,0.4)]">
                  {set.feature}
                </span>
              </div>
              <h3 className="font-mc-serif text-xl italic mb-3 text-[#1a1a1a]">{set.title}</h3>
              <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)] mb-6">
                {set.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8 text-[11px] font-mc-mono uppercase tracking-[0.1em]">
                <div className="text-[rgba(26,26,26,0.4)]">
                  <span className="block text-[rgba(26,26,26,0.8)]">Count</span>
                  {set.count} questions
                </div>
                <div className="text-[rgba(26,26,26,0.4)]">
                  <span className="block text-[rgba(26,26,26,0.8)]">Level</span>
                  Introductory
                </div>
                <div className="text-[rgba(26,26,26,0.4)] col-span-2">
                  <span className="block text-[rgba(26,26,26,0.8)]">Order</span>
                  Curated source order
                </div>
                <div className="text-[rgba(26,26,26,0.4)] col-span-2">
                  <span className="block text-[rgba(26,26,26,0.8)]">Constraint</span>
                  {set.constraint}
                </div>
              </div>

              <Button
                onClick={() => handleViewInstructions(set)}
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
