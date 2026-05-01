/**
 * TraitDeepDive shell — populated at Phase D with the 7 trait pages.
 * Reads from src/data/traps.generated.json. The page component imports this and binds
 * `trait_id` from the route param.
 */

import { useParams } from 'react-router-dom';
import traps from '@/bootcamps/main-conclusion/data/traps.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';

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
    <article className="px-6 py-10 max-w-prose mx-auto space-y-5">
      <header>
        <Badge tone="accent">{trait.id}</Badge>
        <h1 className="font-mc-serif text-h1 font-semibold mt-2">{trait.name}</h1>
        <p className="font-mc-mono text-mono text-ink-faint mt-1">source: {trait.source}</p>
      </header>
      <Card variant="elev">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">What it is</h2>
        <p className="font-mc-serif text-body-prose text-ink mt-1">{trait.what}</p>
      </Card>
      <Card variant="elev">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Why it's a trap</h2>
        <p className="font-mc-serif text-body-prose text-ink mt-1">{trait.why_trap}</p>
      </Card>
      <Card variant="elev">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Fingerprint</h2>
        <p className="font-mc-serif text-body-prose text-ink mt-1">{trait.fingerprint}</p>
      </Card>
      <Card variant="elev">
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Defense</h2>
        <p className="font-mc-serif text-body-prose text-ink mt-1">{trait.defense}</p>
      </Card>
      <p className="font-mc-mono text-mono text-ink-faint">
        Worst-case examples wire in at Phase D once distractors are authored. surface-id: trap-master/{trait.id}
      </p>
    </article>
  );
}
