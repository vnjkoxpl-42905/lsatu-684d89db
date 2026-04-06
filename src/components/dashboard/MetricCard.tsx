import * as React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MetricCard({ children, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl bg-neutral-900/70 backdrop-blur-xl border border-white/[0.06] p-6",
        "transition-all duration-200 ease-out",
        "hover:border-white/[0.12] hover:shadow-[0_0_30px_-10px_rgba(255,255,255,0.04)]",
        "animate-fade-in",
        className
      )}
    >
      {/* Top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-t-xl" />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
