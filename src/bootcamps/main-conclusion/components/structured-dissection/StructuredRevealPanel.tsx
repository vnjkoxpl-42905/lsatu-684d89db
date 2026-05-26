import { ArrowRight } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { RoleRevealMap } from '@/bootcamps/main-conclusion/components/interactive-drills/RoleRevealMap';
import type { RevealEntry } from '@/bootcamps/main-conclusion/components/interactive-drills/types';

interface Props {
  revealMap: RevealEntry[];
  explanation: string;
  structureMap?: string;
  onNext?: () => void;
  isLast?: boolean;
  actionLabel?: string;
}

export function StructuredRevealPanel({
  revealMap,
  explanation,
  structureMap,
  onNext,
  isLast = false,
  actionLabel,
}: Props) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-320 ease-out">
      <Card variant="surface" className="border border-[rgb(var(--border)/0.08)] bg-[rgb(var(--surface-elev)/0.50)] p-6 space-y-6">
        <div className="space-y-4">
          <header className="flex items-center justify-between border-b border-[rgb(var(--border)/0.08)] pb-3">
            <h3 className="font-mc-serif text-h3 font-semibold text-ink">Argument structure map</h3>
            {structureMap && (
              <span className="font-mc-mono text-mono text-ink-faint uppercase tracking-wider text-[11px]">
                {structureMap}
              </span>
            )}
          </header>
          
          <RoleRevealMap entries={revealMap} summary={explanation} />
        </div>

        {onNext ? (
          <div className="flex justify-end pt-2">
            <Button
              onClick={onNext}
              rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
            >
              {actionLabel ?? (isLast ? 'Finish Drill' : 'Next Question')}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
