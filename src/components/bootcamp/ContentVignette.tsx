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
  const baseStyles = 'mc-vignette relative p-6 rounded-r-3xl rounded-l-md border-l-4 overflow-hidden';
  
  // Accent mapping to CSS variables
  const accentClass = {
    conclusion: 'border-l-role-conclusion bg-role-conclusion/5',
    premise: 'border-l-role-premise bg-role-premise/5',
    pivot: 'border-l-role-pivot bg-role-pivot/5',
    opposing: 'border-l-role-opposing bg-role-opposing/5',
    concession: 'border-l-role-concession bg-role-concession/5',
    gold: 'border-l-mc-accent bg-mc-accent/5',
  };

  return (
    <div className={cn(baseStyles, accentClass[accentColor], className)}>
      <div className="relative z-10">{children}</div>
      {/* Decorative texture overlay for depth */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.png')]" />
    </div>
  );
};
