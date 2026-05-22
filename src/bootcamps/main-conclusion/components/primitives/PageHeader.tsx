import { type ReactNode } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Props {
  /** Eyebrow text — module/section label, e.g. "Module 1" or "Lesson 1.7". */
  eyebrow: string;
  /** Page title. Renders in display size. */
  title: string;
  /** Optional sub-text or description (font-mc-serif body-prose). */
  description?: ReactNode;
  /** Right-side actions (badges, buttons). */
  actions?: ReactNode;
  /** Disable the radial accent bloom behind the header. */
  noBloom?: boolean;
  /** Use h2 instead of h1 (for sub-pages like simulator subscreens). */
  level?: 1 | 2;
  /** Tighter spacing for compact pages. */
  compact?: boolean;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  noBloom = false,
  level = 1,
  compact = false,
  className,
}: Props): JSX.Element {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <header className={cn('relative isolate', !compact && 'mb-10', compact && 'mb-6', className)}>
      {!noBloom ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-60 blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, rgb(255 255 255 / 0.86), transparent 70%)',
          }}
        />
      ) : null}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.28em] text-ink-faint">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--ink))]"
            />
            {eyebrow}
          </div>
          <Heading
            className={cn(
              'font-mc-serif mt-3 text-ink leading-[0.94] italic',
              level === 1 ? 'text-[clamp(3.1rem,7vw,6rem)] font-medium tracking-[-0.06em]' : 'text-[clamp(2rem,4vw,2.7rem)] font-medium tracking-[-0.04em]',
            )}
          >
            {title}
          </Heading>
          {description ? (
            <div className="font-mc-sans text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
