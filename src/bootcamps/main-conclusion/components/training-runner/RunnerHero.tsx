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
        'relative isolate overflow-hidden rounded-[8px] p-7 desktop:p-10',
        'bg-white border border-[rgb(26_26_26/0.10)] shadow-[var(--shadow-3)]',
      )}
      aria-label="Your next training step"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-64 w-[440px] max-w-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(255 255 255 / 0.92), transparent 70%)' }}
      />
      <div className="relative flex flex-col gap-6">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.30em] text-ink-faint">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--ink))]"
            />
            {step.eyebrow}
            {progressLabel ? (
              <span className="text-ink-faint normal-case tracking-normal font-mc-mono text-mono">
                · {progressLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 max-w-[9ch] font-mc-serif text-[clamp(4rem,9vw,8.5rem)] font-medium italic text-ink leading-[0.82] tracking-[-0.08em]">
            {step.title}
          </h2>
          <p className="font-mc-sans text-body-prose mt-5 text-ink-soft max-w-[42rem] leading-relaxed">
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
        <div className="hidden" aria-hidden="true">
          <Icon className="h-8 w-8" strokeWidth={1.8} />
        </div>
      </div>
    </section>
  );
}
