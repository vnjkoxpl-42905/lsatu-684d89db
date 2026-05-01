/**
 * Coach's Note — per-question explanation card.
 * Three parts: Structure map · Core move · Per-answer audit.
 * Per architecture-plan §1, NT-Coach-Note named tool.
 */

import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';

export interface PerAnswerAudit {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  verdict: string; // "Too strong" / "Stay narrow" / "Out of scope" / etc.
  trait_id?: string;
}

interface Props {
  questionId: string;
  structure_map: string;
  core_move: string;
  per_answer_audit: PerAnswerAudit[];
}

export function CoachNoteCard({ questionId, structure_map, core_move, per_answer_audit }: Props) {
  return (
    <Card variant="elev" data-coach-note={questionId} className="space-y-3">
      <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Coach's Note · {questionId}</div>
      <section>
        <h3 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Structure map</h3>
        <p className="font-mc-serif text-body-prose text-ink mt-1">{structure_map}</p>
      </section>
      <section>
        <h3 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Core move</h3>
        <p className="font-mc-serif text-body-prose text-ink mt-1">{core_move}</p>
      </section>
      <section>
        <h3 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Per-answer audit</h3>
        <ul className="mt-2 space-y-1">
          {per_answer_audit.map((a) => (
            <li key={a.letter} className="flex items-baseline gap-2">
              <span className="font-mc-mono text-mono text-ink-faint w-4">{a.letter}</span>
              <span className="font-mc-serif text-body-prose text-ink">{a.verdict}</span>
              {a.trait_id ? <Chip tone="accent" className="ml-auto">{a.trait_id}</Chip> : null}
            </li>
          ))}
        </ul>
      </section>
    </Card>
  );
}
