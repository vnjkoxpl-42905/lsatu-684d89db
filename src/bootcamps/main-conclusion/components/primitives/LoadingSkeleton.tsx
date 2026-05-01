import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type Variant = 'text' | 'card' | 'avatar';

interface Props {
  className?: string;
  /** Number of lines (text variant only). */
  lines?: number;
  variant?: Variant;
}

const SHIMMER = cn(
  'relative overflow-hidden',
  'bg-[rgb(var(--surface-elev))]',
  'before:absolute before:inset-0 before:bg-[image:var(--grad-shimmer)] before:bg-[length:200%_100%]',
  'motion-safe:before:animate-mc-shimmer-sweep motion-reduce:before:hidden',
);

export function LoadingSkeleton({ className, lines = 3, variant = 'text' }: Props) {
  if (variant === 'card') {
    return (
      <div
        role="status"
        aria-label="Loading"
        className={cn('rounded-4 border border-[rgb(var(--border)/0.08)] p-4', className)}
      >
        <div className={cn('h-4 w-2/5 rounded-2', SHIMMER)} />
        <div className={cn('mt-3 h-3 w-full rounded-2', SHIMMER)} />
        <div className={cn('mt-2 h-3 w-4/5 rounded-2', SHIMMER)} />
        <div className={cn('mt-2 h-3 w-3/5 rounded-2', SHIMMER)} />
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div
        role="status"
        aria-label="Loading"
        className={cn('h-9 w-9 rounded-full', SHIMMER, className)}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn('h-3 rounded-2', SHIMMER)}
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
