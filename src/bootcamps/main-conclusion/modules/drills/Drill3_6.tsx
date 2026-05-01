/**
 * Drill 3.6 · Design the Conclusion — whimsical premise pair → student writes a valid + invalid conclusion.
 *
 * Evaluator pipeline (architecture-plan §7):
 *   Step 1 — premise-keyword overlap (cheap, deterministic)
 *   Step 2 — meaning similarity (transformers.js MiniLM, lazy-loaded only on this route)
 *
 * v1 ships with the keyword-overlap step always-on. The MiniLM step is opt-in via the
 * "Run semantic check" button — keeps the bundle lean and the model load deferred.
 */

import { useState } from 'react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Textarea } from '@/bootcamps/main-conclusion/components/primitives/Input';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { DRILL_3_6_QUESTIONS, type DesignConclusionQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { evaluateDesignedConclusion, type Classification } from '@/bootcamps/main-conclusion/lib/ai-templates/whimsical-evaluator';

export function Drill3_6() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);

  const q = DRILL_3_6_QUESTIONS[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_6_QUESTIONS.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-3.6');
    } else {
      setQIndex(qIndex + 1);
    }
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-5">
      <PageHeader
        eyebrow="MC-DRL-3.6"
        title="Design the Conclusion"
        description="A premise pair from the dragon-and-broom universe. Write one valid conclusion and one invalid-but-tempting one. Stay inside the universe — the evaluator catches outside-knowledge imports."
      />

      <Card variant="elev">
        <p className="font-mc-mono text-mono text-ink-faint">
          Question {qIndex + 1} of {DRILL_3_6_QUESTIONS.length} · {q.id}
        </p>
        <div className="mt-3 space-y-1">
          <p className="font-mc-serif text-body-prose text-ink">
            <span className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--role-premise))] mr-2">P1</span>
            {q.premise_pair.p1}
          </p>
          <p className="font-mc-serif text-body-prose text-ink">
            <span className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--role-premise))] mr-2">P2</span>
            {q.premise_pair.p2}
          </p>
        </div>
      </Card>

      <ConclusionInputs q={q} onSubmit={next} isLast={isLast} />
    </article>
  );
}

function ConclusionInputs({ q, onSubmit, isLast }: { q: DesignConclusionQuestion; onSubmit: () => void; isLast: boolean }) {
  const [validInput, setValidInput] = useState('');
  const [invalidInput, setInvalidInput] = useState('');
  const [validClass, setValidClass] = useState<Classification | null>(null);
  const [invalidClass, setInvalidClass] = useState<Classification | null>(null);
  const [running, setRunning] = useState(false);

  async function evaluate() {
    setRunning(true);
    const a = evaluateDesignedConclusion({
      premise_pair: q.premise_pair,
      student_text: validInput,
      valid_model: q.valid_model,
      invalid_model: q.invalid_model,
    });
    const b = evaluateDesignedConclusion({
      premise_pair: q.premise_pair,
      student_text: invalidInput,
      valid_model: q.valid_model,
      invalid_model: q.invalid_model,
    });
    setValidClass(a.classification);
    setInvalidClass(b.classification);
    setRunning(false);
  }

  function diagnostic(c: Classification | null): string {
    if (!c) return '';
    if (c === 'Valid') return q.diagnostic_messages.valid_match;
    if (c === 'Invalid but interesting') return q.diagnostic_messages.invalid_but_interesting;
    return q.diagnostic_messages.misses_the_premises;
  }

  function tone(c: Classification | null): 'success' | 'warn' | 'error' | 'neutral' {
    if (c === 'Valid') return 'success';
    if (c === 'Invalid but interesting') return 'warn';
    if (c === 'Misses the premises entirely') return 'error';
    return 'neutral';
  }

  return (
    <div className="space-y-4">
      <Card variant="surface">
        <label className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--success))]">
          Your VALID conclusion
        </label>
        <Textarea
          value={validInput}
          onChange={(e) => setValidInput(e.target.value)}
          placeholder="Apply the premises faithfully…"
          className="mt-2"
        />
        {validClass ? (
          <div className="mt-3">
            <Badge tone={tone(validClass)}>{validClass}</Badge>
            <p className="font-mc-serif text-body text-ink mt-2">{diagnostic(validClass)}</p>
          </div>
        ) : null}
      </Card>

      <Card variant="surface">
        <label className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--warn))]">
          Your INVALID conclusion
        </label>
        <Textarea
          value={invalidInput}
          onChange={(e) => setInvalidInput(e.target.value)}
          placeholder="Construct a tempting-but-wrong move (reverse the conditional, etc.)…"
          className="mt-2"
        />
        {invalidClass ? (
          <div className="mt-3">
            <Badge tone={tone(invalidClass)}>{invalidClass}</Badge>
            <p className="font-mc-serif text-body text-ink mt-2">{diagnostic(invalidClass)}</p>
          </div>
        ) : null}
      </Card>

      <div className="flex items-center gap-3">
        <Button disabled={!validInput || !invalidInput || running} onClick={evaluate}>
          {running ? 'Evaluating…' : 'Evaluate'}
        </Button>
        <Chip tone="neutral">offline · keyword-overlap pipeline</Chip>
        {validClass && invalidClass ? (
          <Button variant="primary" onClick={onSubmit} className="ml-auto">
            {isLast ? 'Finish drill' : 'Next →'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
