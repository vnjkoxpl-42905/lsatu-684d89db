import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { PartRole, StimulusPart } from './types';

function toneForRole(role?: PartRole): React.ComponentProps<typeof Chip>['tone'] {
  if (role === 'main' || role === 'conclusion') return 'conclusion';
  if (role === 'premise' || role === 'support') return 'premise';
  if (role === 'intermediate') return 'pivot';
  if (role === 'opposing') return 'opposing';
  if (role === 'concession') return 'concession';
  return 'background';
}

export function ClickableStimulus({
  parts,
  selectedIds = [],
  revealed = false,
  disabled = false,
  onSelect,
}: {
  parts: StimulusPart[];
  selectedIds?: string[];
  revealed?: boolean;
  disabled?: boolean;
  onSelect?: (part: StimulusPart) => void;
}) {
  return (
    <div className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.42)] p-5">
      <div className="font-mc-serif text-body-prose leading-8 text-ink">
        {parts.map((part) => {
          const selected = selectedIds.includes(part.id);
          return (
            <button
              key={part.id}
              type="button"
              disabled={disabled || !onSelect}
              onClick={() => onSelect?.(part)}
              className={cn(
                'mx-0.5 my-1 inline rounded-[4px] border border-transparent px-1.5 py-0.5 text-left align-baseline',
                'transition-[background,border-color,box-shadow,color] duration-150 ease-eased',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                onSelect && !disabled && 'cursor-pointer hover:border-[rgb(var(--accent)/0.34)] hover:bg-[rgb(var(--accent)/0.09)]',
                selected && 'border-[rgb(var(--accent)/0.50)] bg-[rgb(var(--accent)/0.13)] shadow-[0_0_0_1px_rgb(var(--accent)/0.08)]',
                revealed && roleClass(part.role),
              )}
            >
              {part.text}
              {revealed && part.role ? (
                <Chip tone={toneForRole(part.role)} className="ml-2 translate-y-[-1px]">
                  {part.role === 'main' ? 'main' : part.role}
                </Chip>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function roleClass(role?: PartRole): string {
  if (role === 'main' || role === 'conclusion') return 'bg-[rgb(var(--role-conclusion)/0.10)] text-[rgb(var(--role-conclusion))]';
  if (role === 'premise' || role === 'support') return 'bg-[rgb(var(--role-premise)/0.09)] text-[rgb(var(--role-premise))]';
  if (role === 'intermediate') return 'bg-[rgb(var(--role-pivot)/0.10)] text-[rgb(var(--role-pivot))]';
  if (role === 'opposing') return 'bg-[rgb(var(--role-opposing)/0.10)] text-[rgb(var(--role-opposing))]';
  if (role === 'concession') return 'bg-[rgb(var(--role-concession)/0.10)] text-[rgb(var(--role-concession))]';
  return 'bg-[rgb(var(--role-background)/0.10)] text-ink-soft';
}
