import React, { createContext, useContext, useMemo } from 'react';
import { AdaptiveEngine } from '@/lib/adaptiveEngine';
import { useAuth } from '@/contexts/AuthContext';

const AdaptiveEngineContext = createContext<AdaptiveEngine | null>(null);

export function AdaptiveEngineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // The engine owns hydrated attempt history. Give each signed-in student a
  // separate instance so signing out and back in without a page reload cannot
  // carry one student's profile into another student's Smart Drill.
  const engine = useMemo(() => new AdaptiveEngine(), [user?.id]);
  return (
    <AdaptiveEngineContext.Provider value={engine}>
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
