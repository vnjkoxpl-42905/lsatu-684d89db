import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export function IdentityCard({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'border border-rule bg-paper-bright/60 px-6 py-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {eyebrow && <div className="protocol text-ink-mute">{eyebrow}</div>}
      {title && (
        <h3 className="display-title text-2xl text-ink mt-1">{title}</h3>
      )}
      <div className="mt-3 leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}
