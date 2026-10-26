import * as React from 'react';

type TimerMode = 'countdown' | 'stopwatch';

interface TimerState {
  startedAt: number;
  pausedAt: number;
  pausedAcc: number;
  running: boolean;
  duration: number;
}

export function useTimer(mode: TimerMode, durationMs?: number) {
  const raf = React.useRef<number | null>(null);
  const state = React.useRef<TimerState>({
    startedAt: 0,
    pausedAt: 0,
    pausedAcc: 0,
    running: false,
    duration: durationMs ?? 0
  });
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  // Initialized to true so the first tick scheduled synchronously from
  // start() (which may run inside a child component's effect, before this
  // provider's own mount effect fires under React's child-first effect
  // order) doesn't get gated out. The cleanup below flips it to false on
  // unmount to prevent zombie ticks.
  const mountedRef = React.useRef(true);

  const now = () => performance.now();

  const tick = React.useCallback(() => {
    if (!mountedRef.current) return;
    force();
    raf.current = window.setTimeout(tick, 250) as unknown as number;
  }, []);

  const start = React.useCallback(() => {
    if (state.current.running) return;
    state.current.startedAt = now();
    state.current.pausedAcc = 0;
    state.current.pausedAt = 0;
    state.current.running = true;
    tick();
  }, [tick]);

  const pause = React.useCallback(() => {
    if (!state.current.running) return;
    state.current.running = false;
    state.current.pausedAt = now();
    if (raf.current !== null) {
      clearTimeout(raf.current);
      raf.current = null;
    }
    force();
  }, []);

  const resume = React.useCallback(() => {
    if (state.current.running || !state.current.pausedAt) return;
    state.current.pausedAcc += now() - state.current.pausedAt;
    state.current.pausedAt = 0;
    state.current.running = true;
    tick();
  }, [tick]);

  /**
   * Fold time already spent into a clock that is starting now.
   *
   * A section resumed on another device, or after a closed tab, has to come
   * back on the clock it left rather than on a fresh 35:00. Shifting the start
   * backwards is how: every later read of elapsed/remaining already accounts
   * for it, and nothing else in the timer has to know a resume happened.
   */
  const adoptElapsed = React.useCallback((ms: number) => {
    if (!Number.isFinite(ms) || ms <= 0) return;
    state.current.startedAt -= ms;
    force();
  }, []);

  const reset = React.useCallback(() => {
    state.current = {
      startedAt: 0,
      pausedAt: 0,
      pausedAcc: 0,
      running: false,
      duration: durationMs ?? 0
    };
    if (raf.current !== null) {
      clearTimeout(raf.current);
      raf.current = null;
    }
    force();
  }, [durationMs]);

  React.useEffect(() => {
    // Re-assert true on every mount (including Strict Mode's cleanup-then-
    // remount cycle, which would otherwise leave the ref stuck at false from
    // the cleanup pass).
    mountedRef.current = true;
    // Strict Mode mounts, unmounts, and mounts again. The unmount below clears
    // the scheduled tick, and the child effect that called start() does not
    // call it twice because the clock already says running. Without this the
    // clock is running and nothing ever re-renders it: 34:59 for ever, which
    // is exactly what the dev build showed. Re-arm the tick when the clock is
    // running with nothing scheduled.
    if (state.current.running && raf.current === null) {
      raf.current = window.setTimeout(tick, 250) as unknown as number;
    }
    return () => {
      mountedRef.current = false;
      if (raf.current !== null) {
        clearTimeout(raf.current);
        raf.current = null;
      }
    };
  }, [tick]);

  const elapsed = () => {
    const base = state.current.running ? now() : (state.current.pausedAt || state.current.startedAt);
    return Math.max(0, base - state.current.startedAt - state.current.pausedAcc);
  };

  const remaining = () => Math.max(0, (state.current.duration || 0) - elapsed());

  const ms = mode === 'countdown' ? remaining() : elapsed();
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const label = `${mm}:${ss.toString().padStart(2, '0')}`;

  // What the clock has actually run, and what it was given. A countdown that
  // has hit zero reports `ms` of 0 forever, which cannot say whether the
  // student stopped at the buzzer or worked twenty minutes past it.
  const elapsedMs = elapsed();
  const overtimeMs =
    mode === 'countdown' && state.current.duration
      ? Math.max(0, elapsedMs - state.current.duration)
      : 0;

  return {
    label,
    ms,
    elapsedMs,
    overtimeMs,
    start,
    pause,
    resume,
    reset,
    adoptElapsed,
    running: state.current.running,
    isPaused: state.current.pausedAt > 0 && !state.current.running
  };
}
