import { type HTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Tone = 'neutral' | 'accent' | 'conclusion' | 'premise' | 'pivot' | 'opposing' | 'concession' | 'background';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const TONE: Record<Tone, string> = {
  neutral: 'bg-[rgb(var(--surface-elev))] text-ink-soft border-[rgb(var(--border)/0.08)]',
  accent: 'bg-[rgb(var(--accent)/0.12)] text-mc-accent border-[rgb(var(--accent)/0.30)]',
  conclusion: 'bg-[rgb(var(--role-conclusion)/0.14)] text-[rgb(var(--role-conclusion))] border-[rgb(var(--role-conclusion)/0.36)]',
  premise: 'bg-[rgb(var(--role-premise)/0.14)] text-[rgb(var(--role-premise))] border-[rgb(var(--role-premise)/0.36)]',
  pivot: 'bg-[rgb(var(--role-pivot)/0.14)] text-[rgb(var(--role-pivot))] border-[rgb(var(--role-pivot)/0.36)]',
  opposing: 'bg-[rgb(var(--role-opposing)/0.14)] text-[rgb(var(--role-opposing))] border-[rgb(var(--role-opposing)/0.36)]',
  concession: 'bg-[rgb(var(--role-concession)/0.14)] text-[rgb(var(--role-concession))] border-[rgb(var(--role-concession)/0.36)]',
  background: 'bg-[rgb(var(--role-background)/0.14)] text-[rgb(var(--role-background))] border-[rgb(var(--role-background)/0.36)]',
};

export function Chip({ tone = 'neutral', className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mc-mono text-mono border',
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
