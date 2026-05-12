import React, { createContext, useContext, useRef } from 'react';
import { AdaptiveEngine } from '@/lib/adaptiveEngine';

const AdaptiveEngineContext = createContext<AdaptiveEngine | null>(null);

export function AdaptiveEngineProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<AdaptiveEngine | null>(null);
  if (!ref.current) {
    ref.current = new AdaptiveEngine();
  }
  return (
    <AdaptiveEngineContext.Provider value={ref.current}>
      {children}
    </AdaptiveEngineContext.Provider>
  );
}

export function useAdaptiveEngine(): AdaptiveEngine {
  const engine = useContext(AdaptiveEngineContext);
  if (!engine) {
    throw new Error('useAdaptiveEngine must be used inside <AdaptiveEngineProvider>');
  }
  return engine;
}
