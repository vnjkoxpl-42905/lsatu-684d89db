/**
 * Practice Drills — bootcamp-scoped launchers that drop the student straight
 * into the LR Smart Drill (/drill, type-drill mode) with a pre-filtered
 * questionFeatures set. No new drill engine; we just build a selectedQids
 * list from the live question bank and reuse the existing drill template.
 *
 * Two sets:
 *   • First Sentence Conclusion  — questionFeatures includes "First Sentence Conclusion"
 *   • Rebuttal Main Conclusion   — qtype === "Main Conclusion" AND questionFeatures includes "Rebuttals"
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { questionBank } from '@/lib/questionLoader';
import type { TypeDrillConfig } from '@/types/drill';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type SetKey = 'first-sentence' | 'rebuttal-main-conclusion';

interface PracticeSet {
  key: SetKey;
  title: string;
  blurb: string;
  qtypes: string[];
  qfeatures: string[];
  Icon: typeof Sparkles;
}

const SETS: PracticeSet[] = [
  {
    key: 'first-sentence',
    title: 'First Sentence Conclusion',
    blurb:
      'Every question where the conclusion is the very first sentence — drill the read-and-restate reflex.',
    qtypes: [],
    qfeatures: ['First Sentence Conclusion'],
    Icon: Sparkles,
  },
  {
    key: 'rebuttal-main-conclusion',
    title: 'Rebuttal Main Conclusion',
    blurb:
      'Main Conclusion questions built around rebuttals — find the author’s claim inside the back-and-forth.',
    qtypes: ['Main Conclusion'],
    qfeatures: ['Rebuttals'],
    Icon: MessageSquareWarning,
  },
];

export function PracticeDrillsIndex() {
  const navigate = useNavigate();
  const { isLoading } = useQuestionBank();

  const launch = (set: PracticeSet) => {
    if (isLoading) {
      toast.info('Loading question bank…');
      return;
    }

    const all = questionBank.getAllQuestions();
    const matches = all.filter((q) => {
      if (set.qtypes.length > 0 && !set.qtypes.includes(q.qtype)) return false;
      const features = q.questionFeatures ?? [];
      for (const f of set.qfeatures) {
        if (!features.includes(f)) return false;
      }
      return true;
    });

    if (matches.length === 0) {
      toast.error('No questions match this set yet.');
      return;
    }

    const selectedQids = matches.map((q) => q.qid);
    const config: TypeDrillConfig = {
      qtypes: set.qtypes,
      qfeatures: set.qfeatures,
      difficulties: [],
      pts: [],
      count: selectedQids.length,
      selectedQids,
      unseen_only: false,
    };

    navigate(`/drill?returnTo=/bootcamp/intro-to-lr/practice-drills`, {
      state: { mode: 'type-drill', config },
    });
  };

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-8 pb-32">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-mc-accent" />
          Practice Drills
        </div>
        <h1 className="font-mc-serif text-h1 italic text-ink leading-[1.05]">
          Assigned question sets
        </h1>
        <p className="font-mc-sans text-body text-ink-soft max-w-xl">
          Curated LR sets that launch directly into the Smart Drill template. Pick a focus and go.
        </p>
      </header>

      <ul className="space-y-4">
        {SETS.map((set) => (
          <li key={set.key}>
            <Card className={cn('p-6 flex items-start gap-5')}>
              <div
                aria-hidden
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px]',
                  'bg-[rgb(var(--surface)/0.86)] border border-[rgb(var(--border)/0.10)]',
                )}
              >
                <set.Icon className="h-5 w-5 text-mc-accent" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-mc-serif text-h3 italic text-ink">{set.title}</h2>
                  <Badge>LR</Badge>
                </div>
                <p className="font-mc-sans text-body text-ink-soft mb-4">{set.blurb}</p>
                <Button onClick={() => launch(set)} disabled={isLoading}>
                  Start drill
                  <ArrowRight className="h-4 w-4 ml-1.5" strokeWidth={2} />
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </article>
  );
}
