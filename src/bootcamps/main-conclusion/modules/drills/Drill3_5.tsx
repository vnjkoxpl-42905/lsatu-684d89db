/**
 * Drill 3.5 · Chain Mapping — student maps a stimulus into premises / intermediate / main conclusion.
 */

import { useState } from 'react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { CakeOnBlocks } from '@/bootcamps/main-conclusion/components/argument-structure-map/CakeOnBlocks';
import { DRILL_3_5_QUESTIONS, type ChainMappingQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

type Role = 'main' | 'intermediate' | 'premise';
type Assignments = Record<number, Role | null>;

export function Drill3_5() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const q = DRILL_3_5_QUESTIONS[qIndex]!;

  function next() {
    if (qIndex + 1 < DRILL_3_5_QUESTIONS.length) {
      setQIndex(qIndex + 1);
    } else {
      markDrillComplete?.('MC-DRL-3.5');
    }
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-5">
      <PageHeader
        eyebrow="Drill 3.5"
        title="Chain Mapping"
        description="Decompose the stimulus. Premise(s) support the intermediate conclusion (when present); the intermediate supports the main. Cake on blocks: pull a block and the cake collapses."
      />

      <CakeOnBlocks />

      <Card variant="surface">
        <p className="font-mc-mono text-mono text-ink-faint">
          Question {qIndex + 1} of {DRILL_3_5_QUESTIONS.length} · {q.id}
        </p>
        <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">{q.stimulus}</p>
      </Card>

      <ChainMappingExercise q={q} onComplete={() => { setCompletedCount(completedCount + 1); next(); }} />
    </article>
  );
}

function ChainMappingExercise({ q, onComplete }: { q: ChainMappingQuestion; onComplete: () => void }) {
  // Split stimulus into sentences and let student tag each.
  const sentences = q.stimulus.split(/(?<=[.!?])\s+/).filter(Boolean);
  const [assignments, setAssignments] = useState<Assignments>(() => Object.fromEntries(sentences.map((_, i) => [i, null])));
  const [submitted, setSubmitted] = useState(false);

  function setRole(i: number, role: Role) {
    setAssignments((a) => ({ ...a, [i]: role }));
  }

  function correctRole(sentence: string): Role | null {
    const s = sentence.trim().replace(/[.!?]+$/, '').toLowerCase();
    if (s.includes(q.layers.main_conclusion.toLowerCase().replace(/[.!?]+$/, ''))) return 'main';
    if (q.layers.intermediate_conclusion && s.includes(q.layers.intermediate_conclusion.toLowerCase().replace(/[.!?]+$/, ''))) return 'intermediate';
    if (q.layers.premises.some((p) => s.includes(p.toLowerCase().replace(/[.!?]+$/, '')))) return 'premise';
    return null;
  }

  const allTagged = sentences.every((_, i) => assignments[i] !== null);
  const correctCount = submitted ? sentences.filter((sent, i) => assignments[i] === correctRole(sent)).length : 0;

  return (
    <Card variant="elev" className="space-y-3">
      <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Tag each sentence</p>
      <ul className="space-y-2">
        {sentences.map((s, i) => {
          const cur = assignments[i];
          const correct = submitted ? correctRole(s) : null;
          const right = submitted && cur === correct;
          return (
            <li key={i}>
              <div
                className={`rounded-3 border p-3 ${
                  submitted
                    ? right
                      ? 'border-[rgb(var(--success)/0.40)] bg-[rgb(var(--success)/0.06)]'
                      : 'border-[rgb(var(--error)/0.40)] bg-[rgb(var(--error)/0.06)]'
                    : 'border-[rgb(var(--border)/0.10)]'
                }`}
              >
                <p className="font-mc-serif text-body-prose text-ink">{s}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(['main', 'intermediate', 'premise'] as Role[]).map((r) => (
                    <Button
                      key={r}
                      variant={cur === r ? 'primary' : 'subtle'}
                      size="sm"
                      disabled={submitted}
                      onClick={() => setRole(i, r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                {submitted && !right ? (
                  <p className="mt-2 font-mc-mono text-mono text-ink-faint">
                    correct: <Chip tone="accent">{correct ?? 'n/a'}</Chip>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {!submitted ? (
        <div className="flex justify-end">
          <Button disabled={!allTagged} onClick={() => setSubmitted(true)}>
            Submit
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="font-mc-serif text-body-prose text-ink">
            {correctCount} / {sentences.length} correct
          </p>
          <Button onClick={onComplete}>Next →</Button>
        </div>
      )}
    </Card>
  );
}
