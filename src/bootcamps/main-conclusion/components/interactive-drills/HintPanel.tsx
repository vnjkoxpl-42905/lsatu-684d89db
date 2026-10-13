import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export function HintPanel({
  tone = 'hint',
  title,
  children,
}: {
  tone?: 'hint' | 'success' | 'error';
  title: string;
  children: React.ReactNode;
}) {
  const positive = tone === 'success';
  return (
    <Card
      variant="ghost"
      className={cn(
        'p-4',
        positive
          ? 'border-[rgb(var(--success)/0.30)] bg-[rgb(var(--success)/0.07)]'
          : tone === 'error'
            ? 'border-[rgb(var(--error)/0.30)] bg-[rgb(var(--error)/0.07)]'
            : 'border-[rgb(var(--accent)/0.22)] bg-[rgb(var(--accent)/0.07)]',
      )}
    >
      <div className="flex gap-3">
        {positive ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--success))]" strokeWidth={2.3} />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-mc-accent" strokeWidth={2.3} />
        )}
        <div>
          <p className="font-mc-mono text-mono uppercase tracking-[0.18em] text-ink-faint">{title}</p>
          <div className="mt-1 font-mc-serif text-body-prose leading-relaxed text-ink-soft">{children}</div>
        </div>
      </div>
    </Card>
  );
}
