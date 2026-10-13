/**
 * Shared letterpress primitives for the Hard Sentences module.
 * Copied from the lesson-notes idiom (see modules/lessons/notes/argument-anatomy.tsx)
 * so section pages match the current notes generation exactly.
 */

import type { ReactNode } from 'react';

import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export const Kicker = ({ children }: { children: ReactNode }) => (
  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">{children}</div>
);

export const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="space-y-3">
    <Kicker>{title}</Kicker>
    {subtitle ? <h2 className="font-serif text-[40px] italic leading-tight text-[#1a1a1a]">{subtitle}</h2> : null}
  </div>
);

export const LessonSection = ({
  tocTitle,
  children,
  className,
}: {
  tocTitle: string;
  children: ReactNode;
  className?: string;
}) => (
  <section
    data-toc
    data-toc-title={tocTitle}
    className={cn('note-section border-b border-[rgba(26,26,26,0.1)] p-10 md:p-12', className)}
  >
    {children}
  </section>
);

export const CalloutCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-[#FBF8F1] p-6 md:p-8', className)}>
    {children}
  </div>
);

export const GridCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-white p-6 md:p-8">
    <h3 className="mb-4 font-serif text-[28px] italic leading-tight text-[#1a1a1a]">{title}</h3>
    <div className="space-y-4 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">{children}</div>
  </div>
);

export const RowCard = ({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) => (
  <div className="overflow-hidden rounded-[10px] border border-[rgba(26,26,26,0.12)] bg-white">
    <div className="grid grid-cols-1 divide-y divide-[rgba(26,26,26,0.10)] md:grid-cols-[220px_1fr] md:divide-x md:divide-y-0">
      <div className="p-6 font-serif text-[24px] font-semibold leading-tight text-[#1a1a1a] md:p-8">{left}</div>
      <div className="p-6 text-[18px] leading-[1.7] text-[rgba(26,26,26,0.82)] md:p-8">{right}</div>
    </div>
  </div>
);

export const RuleList = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-3 pl-5 text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

/** Closing dark takeaway card, matching the notes' "Student takeaway" idiom. */
export const TakeawayCard = ({ children }: { children: ReactNode }) => (
  <CalloutCard className="border-[rgba(26,26,26,0.92)] bg-[#1a1a1a] text-[#F5F2ED]">
    <p className="text-[22px] leading-[1.8]">{children}</p>
  </CalloutCard>
);
