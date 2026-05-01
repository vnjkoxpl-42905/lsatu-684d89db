import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: Props) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-2 bg-[rgb(var(--surface-elev))] animate-pulse motion-reduce:animate-none"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
