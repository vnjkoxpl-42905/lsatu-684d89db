/**
 * Drill 3.9 · Nested Claims — pick the main conclusion when intermediate conclusions are present.
 */

import { useState } from 'react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { DRILL_3_9_QUESTIONS } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function Drill3_9() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const q = DRILL_3_9_QUESTIONS[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_9_QUESTIONS.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-3.9');
      return;
    }
    setQIndex(qIndex + 1);
    setPicked(null);
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-5">
      <PageHeader
        eyebrow="Drill 3.9"
        title="Nested Claims"
        description="Multi-conclusion stimuli. Find the main one. Intermediate conclusions exist to support it."
      />

      <Card variant="surface">
        <p className="font-mc-mono text-mono text-ink-faint">
          Question {qIndex + 1} of {DRILL_3_9_QUESTIONS.length} · {q.id}
        </p>
        <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">{q.stimulus}</p>
        <p className="font-mc-serif text-body text-ink-soft italic mt-3">{q.prompt}</p>
        <ol className="mt-3 space-y-1.5">
          {q.candidates.map((c) => {
            const isPicked = picked === c.letter;
            const isMain = c.is_main;
            return (
              <li key={c.letter}>
                <Button
                  variant={isPicked ? 'primary' : 'subtle'}
                  className="w-full justify-start"
                  disabled={picked !== null}
                  onClick={() => setPicked(c.letter)}
                >
                  <span className="font-mc-mono text-mono text-ink-faint mr-2">{c.letter}</span>
                  <span className="font-mc-serif text-body text-ink flex-1 text-left">{c.text}</span>
                  {picked !== null ? (
                    <Chip tone={isMain ? 'conclusion' : c.role === 'intermediate' ? 'pivot' : 'premise'}>
                      {c.role}
                    </Chip>
                  ) : null}
                </Button>
              </li>
            );
          })}
        </ol>
        {picked !== null ? (
          <div className="mt-3">
            {q.candidates.find((c) => c.letter === picked)?.is_main ? (
              <Badge tone="success">✓ Main conclusion</Badge>
            ) : (
              <Badge tone="error">✗ {q.candidates.find((c) => c.letter === picked)?.role} — not the main</Badge>
            )}
            <p className="font-mc-serif text-body-prose text-ink mt-2">{q.rationale}</p>
            <div className="mt-3 flex justify-end">
              <Button onClick={next}>{isLast ? 'Finish drill' : 'Next →'}</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </article>
  );
}
