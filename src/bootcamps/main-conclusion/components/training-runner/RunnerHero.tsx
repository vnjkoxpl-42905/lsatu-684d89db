import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, type LucideIcon } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { NextStep } from '@/bootcamps/main-conclusion/lib/runner';

interface Props {
  step: NextStep;
  /** Optional progress count to display alongside the eyebrow ("4 / 13 done"). */
  progressLabel?: string;
  Icon?: LucideIcon;
}

export function RunnerHero({ step, progressLabel, Icon = Sparkles }: Props): JSX.Element {
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-5 p-7 desktop:p-9',
        'bg-[image:var(--grad-surface-elev)]',
        'border border-[color:var(--border-accent-soft)]',
        'shadow-[var(--shadow-3),var(--glow-accent-soft)]',
      )}
      aria-label="Your next training step"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-64 w-[440px] max-w-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.22), transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--border-accent-strong)] to-transparent"
      />
      <div className="relative flex flex-col desktop:flex-row desktop:items-center desktop:justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
            />
            {step.eyebrow}
            {progressLabel ? (
              <span className="text-ink-faint normal-case tracking-normal font-mc-mono text-mono">
                · {progressLabel}
              </span>
            ) : null}
          </div>
          <h2 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-[1.05]">
            {step.title}
          </h2>
          <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[58ch] leading-relaxed">
            {step.subtitle}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to={step.href}
              className="rounded-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
            >
              <Button
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
                className="!h-12 !px-6"
              >
                {step.cta}
              </Button>
            </Link>
            {step.secondary ? (
              <Link
                to={step.secondary.href}
                className="font-mc-mono text-mono text-ink-soft hover:text-mc-accent transition-colors duration-150 ease-eased focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2 px-1"
              >
                {step.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
        <div
          aria-hidden="true"
          className={cn(
            'shrink-0 hidden desktop:inline-flex h-20 w-20 items-center justify-center rounded-5',
            'bg-[image:var(--grad-accent-strong)]',
            'border border-[color:var(--border-accent-mid)]',
            'text-mc-accent shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.10)]',
          )}
        >
          <Icon className="h-8 w-8" strokeWidth={1.8} />
        </div>
      </div>
    </section>
  );
}
