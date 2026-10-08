import { cn } from '@/lib/utils';

interface Props {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Notion-style classroom section: page-like spacing, restrained header,
 * no decorative card chrome around the children. Each section is a
 * self-contained unit on the calm workspace surface.
 */
export function ClassroomSection({ title, hint, action, children, className }: Props) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground/70">
            {title}
          </h2>
          {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-sm text-muted-foreground text-center">
      {children}
    </div>
  );
}
