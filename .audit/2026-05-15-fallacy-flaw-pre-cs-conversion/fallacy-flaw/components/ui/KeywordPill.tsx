import { cn } from '../../lib/utils';
import type { Language } from '../../types/drill';

const tone: Record<Language | 'neutral', string> = {
  assumption: 'border-verdigris/50 bg-verdigris-tint text-verdigris-deep',
  objection: 'border-[#1B3A5C]/40 bg-[#E2E8F0] text-[#1B3A5C]',
  match: 'border-g3/40 bg-g3-tint text-g3',
  neutral: 'border-rule bg-paper-bright text-ink-soft',
};

export function KeywordPill({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: Language | 'neutral';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 protocol text-[0.65rem]',
        tone[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
