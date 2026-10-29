import React from 'react';
import { cn } from '@/lib/utils';

type VignetteVariant = 'concept' | 'tool' | 'insight';

interface ContentVignetteProps {
  variant: VignetteVariant;
  accentColor?: 'conclusion' | 'premise' | 'pivot' | 'opposing' | 'concession' | 'gold';
  children: React.ReactNode;
  className?: string;
}

export const ContentVignette: React.FC<ContentVignetteProps> = ({
  variant,
  accentColor = 'gold',
  children,
  className,
}) => {
  const baseStyles = 'mc-vignette relative p-8 md:p-10 rounded-[24px] border overflow-hidden transition-all duration-300';

  // Accent mapping using OKLCH and full borders
  const accentClass = {
    conclusion: 'border-[oklch(0.6_0.15_150/0.2)] bg-[oklch(0.6_0.15_150/0.04)]',
    premise: 'border-[oklch(0.6_0.15_250/0.2)] bg-[oklch(0.6_0.15_250/0.04)]',
    pivot: 'border-[oklch(0.6_0.2_40/0.2)] bg-[oklch(0.6_0.2_40/0.04)]',
    opposing: 'border-[oklch(0.6_0.2_280/0.2)] bg-[oklch(0.6_0.2_280/0.04)]',
    concession: 'border-[oklch(0.8_0.15_85/0.2)] bg-[oklch(0.8_0.15_85/0.04)]',
    gold: 'border-[oklch(0.85_0.12_85/0.2)] bg-[oklch(0.98_0.005_60)]',
  };

  return (
    <div className={cn(baseStyles, accentClass[accentColor], className)}>

      <div className="relative z-10">{children}</div>
      {/* Decorative texture overlay for depth */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.png')]" />
    </div>
  );
};
