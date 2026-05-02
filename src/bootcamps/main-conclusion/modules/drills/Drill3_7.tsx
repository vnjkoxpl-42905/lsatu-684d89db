/**
 * Drill 3.7 · Pronoun Replacement.
 * Student rewrites a candidate conclusion replacing the pronoun with the antecedent.
 * Pass: replacement contains a recognizable antecedent (substring of any acceptable answer).
 */

import { useState } from 'react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Input } from '@/bootcamps/main-conclusion/components/primitives/Input';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { DRILL_3_7_QUESTIONS } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function Drill3_7() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const [input, setInput] = useState('');
  const [verdict, setVerdict] = useState<'pending' | 'pass' | 'fail'>('pending');

  const q = DRILL_3_7_QUESTIONS[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_7_QUESTIONS.length;

  function check() {
    const v = input.trim().toLowerCase();
    if (!v) return;
    const stillHasPronoun = v.includes(q.pronoun.toLowerCase());
    const hasAntecedent = q.acceptable_replacements.some((r) =>
      v.includes(r.toLowerCase().split(/\s+/).slice(0, 3).join(' ')),
    );
    setVerdict(!stillHasPronoun && hasAntecedent ? 'pass' : 'fail');
  }

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-3.7');
      return;
    }
    setQIndex(qIndex + 1);
    setInput('');
    setVerdict('pending');
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-5">
      <PageHeader
        eyebrow="Drill 3.7"
        title="Pronoun Replacement"
        description="Rewrite the candidate conclusion replacing the highlighted pronoun with its antecedent."
      />

      <Card variant="surface">
        <p className="font-mc-mono text-mono text-ink-faint">
          Question {qIndex + 1} of {DRILL_3_7_QUESTIONS.length} · {q.id}
        </p>
        <p className="font-mc-serif text-body-prose text-ink mt-3">
          Candidate: <em className="text-ink-soft">{q.candidate_conclusion}</em>
        </p>
        <p className="font-mc-mono text-mono text-ink-faint mt-2">
          Replace: <Chip tone="accent">{q.pronoun}</Chip>
        </p>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Rewrite without the pronoun…"
          className="mt-3"
          disabled={verdict !== 'pending'}
        />
        {verdict === 'pending' ? (
          <div className="mt-3 flex justify-end">
            <Button onClick={check} disabled={!input.trim()}>
              Check
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <div>
              {verdict === 'pass' ? (
                <p className="font-mc-serif text-body-prose text-[rgb(var(--success))]">✓ Antecedent in place. {q.rationale}</p>
              ) : (
                <p className="font-mc-serif text-body-prose text-[rgb(var(--error))]">
                  ✗ Either the pronoun is still there, or the antecedent isn’t recognizable. Acceptable: {q.acceptable_replacements.join(' · ')}.
                </p>
              )}
            </div>
            <Button onClick={next}>{isLast ? 'Finish drill' : 'Next →'}</Button>
          </div>
        )}
      </Card>
    </article>
  );
}
