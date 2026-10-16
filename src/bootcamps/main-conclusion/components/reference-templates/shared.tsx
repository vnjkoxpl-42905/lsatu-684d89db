import type { ReactNode } from 'react';

import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export function renderIndicatorMarkup(text: string): string {
  return text.replace(/<i-w t="([^"]+)">([^<]+)<\/i-w>/g, (_match, type, content) => {
    let className = 'text-mc-accent border-mc-accent/40 bg-mc-accent/10';
    if (String(type).includes('Premise')) className = 'text-sky-700 border-sky-300 bg-sky-50';
    if (String(type).includes('Pivot')) className = 'text-amber-700 border-amber-300 bg-amber-50';
    if (String(type).includes('Opposing')) className = 'text-violet-700 border-violet-300 bg-violet-50';
    if (String(type).includes('Concession')) className = 'text-zinc-700 border-zinc-300 bg-zinc-100';
    if (String(type).includes('Opinion')) className = 'text-emerald-700 border-emerald-300 bg-emerald-50';
    if (String(type).includes('Conclusion')) className = 'text-rose-700 border-rose-300 bg-rose-50';
    return `<span class="${className} rounded px-1 py-0.5 border border-dashed font-semibold">${content}</span>`;
  });
}

export function RoleKey() {
  return (
    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Conclusion</span>
      <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">Support</span>
      <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-800">Opposing View</span>
      <span className="rounded-full bg-zinc-200 px-3 py-1 text-zinc-800">Concession / Neutral</span>
    </div>
  );
}

export function StimulusLine({
  html,
  className,
  onClick,
  selected = false,
  accent = 'ink',
}: {
  html: string;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  accent?: 'ink' | 'conclusion' | 'support' | 'opposing' | 'neutral';
}) {
  const accentClasses =
    accent === 'conclusion'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
      : accent === 'support'
        ? 'border-sky-300 bg-sky-50 text-sky-950'
        : accent === 'opposing'
          ? 'border-violet-300 bg-violet-50 text-violet-950'
          : accent === 'neutral'
            ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
            : 'border-[rgba(26,26,26,0.08)] bg-white text-ink';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-[20px] border px-5 py-4 text-left text-[17px] leading-[1.7] transition-all',
        selected ? accentClasses : 'border-[rgba(26,26,26,0.08)] bg-white hover:border-[rgba(26,26,26,0.16)] hover:bg-[#fffdf9]',
        className,
      )}
    >
      <span dangerouslySetInnerHTML={{ __html: renderIndicatorMarkup(html) }} />
    </button>
  );
}

export function StimulusInlineSegment({
  html,
  onClick,
  selected = false,
  accent = 'ink',
}: {
  html: string;
  onClick?: () => void;
  selected?: boolean;
  accent?: 'ink' | 'conclusion' | 'support' | 'opposing' | 'neutral';
}) {
  const accentClasses =
    accent === 'conclusion'
      ? 'bg-emerald-100 text-emerald-950 shadow-[inset_0_-2px_0_rgba(5,150,105,0.25)]'
      : accent === 'support'
        ? 'bg-sky-100 text-sky-950 shadow-[inset_0_-2px_0_rgba(14,165,233,0.24)]'
        : accent === 'opposing'
          ? 'bg-violet-100 text-violet-950 shadow-[inset_0_-2px_0_rgba(139,92,246,0.24)]'
          : accent === 'neutral'
            ? 'bg-zinc-200 text-zinc-950 shadow-[inset_0_-2px_0_rgba(63,63,70,0.18)]'
            : 'text-ink';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mb-1 mr-1 inline rounded-[10px] px-1.5 py-0.5 text-left text-[18px] leading-[1.9] transition-colors',
        selected ? accentClasses : 'text-ink hover:bg-[rgba(26,26,26,0.06)]',
      )}
    >
      <span dangerouslySetInnerHTML={{ __html: renderIndicatorMarkup(html) }} />
    </button>
  );
}

export function ReplicaShell({
  eyebrow,
  title,
  description,
  tone = 'default',
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: 'default' | 'inverted';
  children: ReactNode;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        {eyebrow ? (
          <p className={cn('font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent', tone === 'inverted' && 'text-[#f0d58a]')}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn('font-mc-serif text-h1 font-semibold leading-tight text-ink', tone === 'inverted' && 'text-white')}>
          {title}
        </h1>
        {description ? (
          <p className={cn('max-w-3xl font-mc-serif text-body-prose leading-relaxed text-ink-soft', tone === 'inverted' && 'text-[#cbd5e1]')}>
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </article>
  );
}
