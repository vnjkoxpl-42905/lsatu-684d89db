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
        'relative isolate overflow-hidden rounded-[2px] p-8 desktop:p-12',
        'bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.10)] shadow-[var(--shadow-2)]',
      )}
      aria-label="Your next training step"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-64 w-[440px] max-w-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.4), transparent 70%)' }}
      />
      <div className="relative flex flex-col gap-6">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 font-mc-mono text-[10px] uppercase tracking-[0.30em] text-[rgb(var(--ink-faint))]">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--ink))]"
            />
            {step.eyebrow}
            {progressLabel ? (
              <span className="text-[rgb(var(--ink-faint))] normal-case tracking-normal font-mc-mono text-[11px]">
                · {progressLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 max-w-[12ch] font-mc-serif text-[clamp(4rem,9vw,7rem)] font-medium italic text-[rgb(var(--ink))] leading-[0.82] tracking-[-0.07em]">
            {step.title}
          </h2>
          <p className="font-mc-sans text-[16px] mt-6 text-[rgb(var(--ink-soft))] max-w-[42rem] leading-relaxed">
            {step.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to={step.href}
              className="inline-flex h-14 items-center gap-3 rounded-[2px] bg-[#1a1a1a] px-8 text-[#F5F2ED] transition-all hover:bg-[rgba(26,26,26,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--ink))]"
            >
              <span className="font-bold uppercase tracking-[0.16em] text-[14px]">
                {step.cta}
              </span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
            {step.secondary ? (
              <Link
                to={step.secondary.href}
                className="font-mc-mono text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--ink-faint))] hover:text-[rgb(var(--ink))] transition-colors duration-150 ease-eased rounded-[2px] px-2 py-1"
              >
                {step.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
