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
          className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.20), transparent 70%)',
          }}
        />
      ) : null}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
            />
            {eyebrow}
          </div>
          <Heading
            className={cn(
              'font-mc-serif font-semibold mt-3 text-ink leading-tight',
              level === 1 ? 'text-display' : 'text-h1',
            )}
          >
            {title}
          </Heading>
          {description ? (
            <div className="font-mc-serif text-body-prose mt-3 text-ink-soft max-w-[60ch] leading-relaxed">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
