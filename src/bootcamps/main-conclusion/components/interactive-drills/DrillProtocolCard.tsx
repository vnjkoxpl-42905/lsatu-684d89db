import { Play } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import type { DrillProtocol } from './types';

export function DrillProtocolCard({
  protocol,
  compact = false,
  onStart,
}: {
  protocol: DrillProtocol;
  compact?: boolean;
  onStart?: () => void;
}) {
  return (
    <Card variant="elev" accent className={compact ? 'p-4' : 'p-6'}>
      <div className="flex flex-col gap-4 desktop:flex-row desktop:items-end desktop:justify-between">
        <div>
          <p className="font-mc-mono text-mono uppercase tracking-[0.2em] text-mc-accent">Protocol</p>
          <h2 className="mt-1 font-mc-serif text-h2 font-semibold text-ink">{protocol.title}</h2>
          <div className="mt-4 grid gap-3 text-left sm:grid-cols-3">
            <ProtocolStep label="Goal" text={protocol.goal} />
            <ProtocolStep label="Interact" text={protocol.interaction} />
            <ProtocolStep label="Reveal" text={protocol.afterSubmit} />
          </div>
        </div>
        {onStart ? (
          <Button onClick={onStart} rightIcon={<Play className="h-3.5 w-3.5" strokeWidth={2.3} />}>
            Start
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function ProtocolStep({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface)/0.64)] p-3">
      <p className="font-mc-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
      <p className="mt-1 font-mc-serif text-body leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}
