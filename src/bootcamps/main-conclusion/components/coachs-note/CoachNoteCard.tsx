/**
 * Coach's Note — per-question explanation card.
 * Three parts: Structure map · Core move · Per-answer audit.
 */

import { Quote, Compass, Zap } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export interface PerAnswerAudit {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  verdict: string;
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
    <Card
      variant="elev"
      data-coach-note={questionId}
      className="relative space-y-4 border border-[color:var(--border-accent-strong)] bg-[rgb(var(--accent)/0.04)]"
    >
      <div
        aria-hidden="true"
        className="absolute -top-3 -left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[image:var(--grad-accent-strong)] border border-[color:var(--border-accent-mid)] text-mc-accent shadow-[var(--glow-accent-soft)]"
      >
        <Quote className="h-3.5 w-3.5" strokeWidth={2.2} />
      </div>
      <div className="flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
        <span
          aria-hidden="true"
          className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
        />
        Coach's Note · {questionId}
      </div>

      <Section icon={<Compass className="h-3 w-3" strokeWidth={2.4} />} label="Structure map">
        <p className="font-mc-serif text-body-prose text-ink mt-1.5 leading-relaxed">{structure_map}</p>
      </Section>

      <Section icon={<Zap className="h-3 w-3" strokeWidth={2.4} />} label="Core move">
        <p className="font-mc-serif text-body-prose text-ink mt-1.5 leading-relaxed">{core_move}</p>
      </Section>

      <Section label="Per-answer audit">
        <ul className="mt-2 space-y-1.5">
          {per_answer_audit.map((a) => (
            <li
              key={a.letter}
              className={cn(
                'flex items-baseline gap-3 rounded-2 px-2 py-1.5',
                'transition-colors duration-150 ease-eased',
                'hover:bg-[rgb(var(--surface)/0.5)]',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full',
                  'bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.10)]',
                  'font-mc-mono text-[10px] font-semibold uppercase',
                )}
              >
                {a.letter}
              </span>
              <span className="font-mc-serif text-body-prose text-ink flex-1 leading-relaxed">{a.verdict}</span>
              {a.trait_id ? (
                <Chip tone="accent" className="shrink-0">
                  {a.trait_id}
                </Chip>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
    </Card>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint inline-flex items-center gap-1.5">
        {icon}
        {label}
      </h3>
      {children}
    </section>
  );
}
