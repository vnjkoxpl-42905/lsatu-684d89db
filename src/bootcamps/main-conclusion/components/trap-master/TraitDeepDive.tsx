/**
 * TraitDeepDive shell — populated at Phase D with the 7 trait pages.
 * Reads from src/data/traps.generated.json. The page component imports this and binds
 * `trait_id` from the route param.
 */

import { useParams } from 'react-router-dom';
import { Eye, AlertOctagon, Fingerprint, Shield } from 'lucide-react';
import traps from '@/bootcamps/main-conclusion/data/traps.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface SectionDef {
  label: string;
  Icon: LucideIcon;
}

const SECTIONS: Record<string, SectionDef> = {
  what: { label: 'What it is', Icon: Eye },
  why_trap: { label: "Why it's a trap", Icon: AlertOctagon },
  fingerprint: { label: 'Fingerprint', Icon: Fingerprint },
  defense: { label: 'Defense', Icon: Shield },
};

export function TraitDeepDive() {
  const { traitId } = useParams<{ traitId: string }>();
  const trait = (traps as Array<{
    id: string;
    name: string;
    what: string;
    why_trap: string;
    fingerprint: string;
    defense: string;
    pt_example_label?: string;
    source: string;
  }>).find((t) => t.id === traitId);

  if (!trait) {
    return (
      <EmptyState
        title="Trait not found"
        body="The Trap Master deep-dive pages cover T1–T7. Check your URL."
        surfaceId={`trap-master/${traitId ?? 'unknown'}`}
      />
    );
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-prose mx-auto">
      <header className="relative isolate mb-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.20), transparent 70%)' }}
        />
        <div className="relative">
          <Badge tone="accent" dot>{trait.id}</Badge>
          <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-tight">
            {trait.name}
          </h1>
          <p className="font-mc-mono text-mono text-ink-faint mt-3">source · {trait.source}</p>
        </div>
      </header>
      <div className="space-y-4">
        <Section def={SECTIONS.what!} text={trait.what} />
        <Section def={SECTIONS.why_trap!} text={trait.why_trap} />
        <Section def={SECTIONS.fingerprint!} text={trait.fingerprint} />
        <Section def={SECTIONS.defense!} text={trait.defense} />
      </div>
      <p className="mt-8 font-mc-mono text-mono text-ink-faint">
        Worst-case examples wire in at Phase D once distractors are authored. surface-id: trap-master/
        {trait.id}
      </p>
    </article>
  );
}

function Section({ def, text }: { def: SectionDef; text: string }): JSX.Element {
  return (
    <Card variant="elev">
      <h2
        className={cn(
          'font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent',
          'inline-flex items-center gap-2',
        )}
      >
        <def.Icon className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
        {def.label}
      </h2>
      <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">{text}</p>
    </Card>
  );
}
