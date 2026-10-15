import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

export function StructureClassifier({
  value,
  disabled,
  onChange,
}: {
  value: 'First-sentence' | 'Rebuttal' | null;
  disabled?: boolean;
  onChange: (value: 'First-sentence' | 'Rebuttal') => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(['First-sentence', 'Rebuttal'] as const).map((option) => (
        <Button
          key={option}
          type="button"
          variant={value === option ? 'primary' : 'subtle'}
          disabled={disabled}
          onClick={() => onChange(option)}
          className="h-auto min-h-11 py-3"
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
