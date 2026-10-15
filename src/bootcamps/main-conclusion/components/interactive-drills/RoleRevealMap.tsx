import { ArrowRight } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import type { PartRole, RevealEntry } from './types';

function tone(role: PartRole): React.ComponentProps<typeof Chip>['tone'] {
  if (role === 'main' || role === 'conclusion') return 'conclusion';
  if (role === 'premise' || role === 'support') return 'premise';
  if (role === 'intermediate') return 'pivot';
  if (role === 'opposing') return 'opposing';
  if (role === 'concession') return 'concession';
  return 'background';
}

export function RoleRevealMap({
  entries,
  summary,
}: {
  entries: RevealEntry[];
  summary?: string;
}) {
  const ordered = [...entries].sort((a, b) => roleOrder(a.role) - roleOrder(b.role));
  return (
    <Card variant="elev" className="space-y-4 border-[rgb(var(--accent)/0.18)] bg-[rgb(var(--accent)/0.045)]">
      <div>
        <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-mc-accent">Structure reveal</p>
        {summary ? <p className="mt-1 font-mc-serif text-body-prose text-ink-soft">{summary}</p> : null}
      </div>
      <ol className="space-y-2">
        {ordered.map((entry) => (
          <li key={entry.id} className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface)/0.70)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={tone(entry.role)}>{entry.label}</Chip>
              <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
              <p className="font-mc-serif text-body text-ink">{entry.text}</p>
            </div>
            {entry.note ? <p className="mt-2 font-mc-serif text-body text-ink-soft">{entry.note}</p> : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function roleOrder(role: PartRole): number {
  if (role === 'opposing' || role === 'concession' || role === 'background') return 0;
  if (role === 'premise' || role === 'support') return 1;
  if (role === 'intermediate') return 2;
  return 3;
}
