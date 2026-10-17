import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function BriefLayout({
  number,
  eyebrow,
  title,
  children,
  margin,
  id,
  className,
}: {
  number?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  margin?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn('mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-12 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10', className)}
    >
      <aside className="md:sticky md:top-6 md:self-start">
        {number && (
          <div className="display-title text-3xl italic text-ink-mute md:text-4xl">
            {number}
          </div>
        )}
        {eyebrow && (
          <div className="protocol mt-2 text-ink-mute">{eyebrow}</div>
        )}
        {margin && <div className="mt-5 text-sm text-ink-mute">{margin}</div>}
      </aside>
      <div className="max-w-prose">
        <h2 className="display-title text-3xl text-ink md:text-4xl">{title}</h2>
        <div className="mt-6 space-y-5 text-[1.05rem] leading-[1.65] text-ink-soft">
          {children}
        </div>
      </div>
    </section>
  );
}
