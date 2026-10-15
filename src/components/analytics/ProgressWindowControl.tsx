import type { ProgressWindow } from '@/lib/firstAnswerProgress';

export const PROGRESS_WINDOWS: Array<{ value: ProgressWindow; label: string }> = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 21, label: '21 days' },
  { value: 30, label: '30 days' },
  { value: 'all', label: 'All time' },
];

export default function ProgressWindowControl({ value, onChange }: { value: ProgressWindow; onChange: (value: ProgressWindow) => void }) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap gap-1" role="group" aria-label="Progress date window">
      {PROGRESS_WINDOWS.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${value === option.value
            ? 'border-foreground bg-foreground text-background'
            : 'border-border text-muted-foreground hover:text-foreground'}`}
        >{option.label}</button>
      ))}
    </div>
  );
}
