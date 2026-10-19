import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { StructureClassifier } from '@/bootcamps/main-conclusion/components/interactive-drills/StructureClassifier';

interface Props {
  step: number;
  selectedFamily: 'First-sentence' | 'Rebuttal' | null;
  onFamilyChange: (family: 'First-sentence' | 'Rebuttal') => void;
  canSubmit: boolean;
  onSubmit: () => void;
  isCorrect?: boolean | null;
}

export function StructuredStepControls({
  step,
  selectedFamily,
  onFamilyChange,
  canSubmit,
  onSubmit,
  isCorrect
}: Props) {
  return (
    <div className="space-y-4">
      <Card variant="ghost" className="bg-[rgb(var(--surface-elev)/0.30)] p-4 border border-[rgb(var(--border)/0.05)]">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="font-mc-mono text-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              Active Task
            </p>
            <p className="font-mc-serif text-body text-ink leading-tight">
              {getPromptForStep(step, selectedFamily)}
            </p>
          </div>
          <div className="font-mc-mono text-mono text-ink-faint text-xs">
            {step === 4 ? 'Review' : `Step ${step} of 3`}
          </div>
        </div>
      </Card>

      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-220 ease-out">
          <StructureClassifier value={selectedFamily} onChange={onFamilyChange} />
        </div>
      )}

      {step === 3 && (
        <div className="flex justify-end pt-2">
          <Button
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            Submit dissection
          </Button>
        </div>
      )}
    </div>
  );
}

function getPromptForStep(step: number, family: string | null): string {
  switch (step) {
    case 1:
      return "Click the author’s main conclusion.";
    case 2:
      return "Classify the argument structure.";
    case 3:
      return family === 'Rebuttal'
        ? "Click the rejected or opposing view."
        : "Click the supporting claim.";
    default:
      return "Follow the steps below.";
  }
}
