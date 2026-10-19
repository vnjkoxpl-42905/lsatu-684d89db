import * as React from 'react';
import { useTimer } from '@/hooks/useTimer';

interface TimerContextValue {
  label: string;
  ms: number;
  /** Time the clock has run, whatever direction it reports. */
  elapsedMs: number;
  /** How far past a countdown's budget the student has worked. 0 until then. */
  overtimeMs: number;
  mode: 'countdown' | 'stopwatch';
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  /** Fold already-spent time into the running clock (see useTimer). */
  adoptElapsed: (ms: number) => void;
  running: boolean;
  isPaused: boolean;
}

const TimerContext = React.createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  children: React.ReactNode;
  mode: 'countdown' | 'stopwatch';
  durationMs?: number;
}

export function TimerProvider({ children, mode, durationMs }: TimerProviderProps) {
  const timer = useTimer(mode, durationMs);
  const value = React.useMemo(() => ({ ...timer, mode }), [timer, mode]);

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext() {
  const context = React.useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within TimerProvider');
  }
  return context;
}

/** Safe version that returns null when no TimerProvider is present (no crash). */
export function useTimerContextSafe(): TimerContextValue | null {
  return React.useContext(TimerContext);
}
