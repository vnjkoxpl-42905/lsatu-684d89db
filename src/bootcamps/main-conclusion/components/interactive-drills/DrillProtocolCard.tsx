import { Play } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
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
    <Card variant="elev" accent className={cn(compact ? 'p-4' : 'p-6', 'overflow-visible')}>
      <div className={cn('grid gap-4', compact ? 'desktop:grid-cols-[minmax(0,1fr)_auto] desktop:items-center' : '')}>
        <div className="min-w-0">
          <p className="font-mc-mono text-mono uppercase tracking-[0.2em] text-mc-accent">Protocol</p>
          <h2 className={cn('mt-1 font-mc-serif font-semibold text-ink', compact ? 'text-h3' : 'text-h2')}>
            {protocol.title}
          </h2>
          {compact ? (
            <p className="mt-1 font-mc-serif text-small leading-relaxed text-ink-soft">
              {protocol.goal}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 text-left desktop:grid-cols-3">
              <ProtocolStep label="Goal" text={protocol.goal} />
              <ProtocolStep label="Interact" text={protocol.interaction} />
              <ProtocolStep label="Reveal" text={protocol.afterSubmit} />
            </div>
          )}
        </div>
        {onStart ? (
          <div className="flex justify-start pt-1">
            <Button
              onClick={onStart}
              rightIcon={<Play className="h-3.5 w-3.5" strokeWidth={2.3} />}
              className="min-w-[9rem] whitespace-nowrap"
            >
              Start Drill
            </Button>
          </div>
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
