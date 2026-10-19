import { useModuleStore } from '../../lib/store';
import { cn } from '../../lib/utils';

const SECTIONS = [
  { n: 1, label: 'Hostility' },
  { n: 2, label: 'Cake on Blocks' },
  { n: 3, label: '"What if…"' },
  { n: 4, label: 'Three Languages' },
  { n: 5, label: 'Trap Anatomy' },
  { n: 6, label: 'Walkthroughs' },
  { n: 7, label: 'Checkpoints' },
  { n: 8, label: 'Drill' },
];

export function ProgressTrack({ current }: { current?: number }) {
  const completed = useModuleStore((s) => s.sectionsCompleted);
  const fallback = useModuleStore((s) => s.currentSection);
  const here = current ?? fallback;
  return (
    <ol className="grid grid-cols-4 gap-2 md:grid-cols-8">
      {SECTIONS.map(({ n, label }) => {
        const done = completed.includes(n);
        const isHere = here === n;
        return (
          <li key={n}>
            <span
              className={cn(
                'flex flex-col items-start gap-1 rounded-sm border px-2 py-2',
                done
                  ? 'border-verdigris/60 bg-verdigris-tint text-verdigris-deep'
                  : isHere
                    ? 'border-ink bg-paper-deep text-ink'
                    : 'border-rule-soft text-ink-mute',
              )}
            >
              <span className="protocol text-[0.65rem]">§{n}</span>
              <span className="font-display text-sm leading-tight">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
