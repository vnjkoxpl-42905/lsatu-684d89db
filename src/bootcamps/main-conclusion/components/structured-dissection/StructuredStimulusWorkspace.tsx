import { ClickableStimulus } from '@/bootcamps/main-conclusion/components/interactive-drills/ClickableStimulus';
import type { StimulusPart } from '@/bootcamps/main-conclusion/components/interactive-drills/types';

interface Props {
  parts: StimulusPart[];
  selectedIds: string[];
  onSelect: (part: StimulusPart) => void;
  revealed: boolean;
  disabled: boolean;
}

export function StructuredStimulusWorkspace({
  parts,
  selectedIds,
  onSelect,
  revealed,
  disabled
}: Props) {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="font-mc-mono text-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Argument Stimulus
        </h3>
        {revealed && (
          <span className="font-mc-serif text-small italic text-mc-accent">
            Structure revealed
          </span>
        )}
      </header>
      
      <ClickableStimulus
        parts={parts}
        selectedIds={selectedIds}
        onSelect={onSelect}
        revealed={revealed}
        disabled={disabled}
      />
    </div>
  );
}
