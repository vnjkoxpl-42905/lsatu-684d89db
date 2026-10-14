import type { ReactNode } from 'react';
import { IntegratedPathRail } from '@/bootcamps/main-conclusion/components/IntegratedPathRail';

interface IntroPathLearningLayoutProps {
  children: ReactNode;
}

export function IntroPathLearningLayout({ children }: IntroPathLearningLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-4 px-4 py-4 desktop:flex-row desktop:gap-0 desktop:px-0 desktop:py-0">
      <IntegratedPathRail />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
