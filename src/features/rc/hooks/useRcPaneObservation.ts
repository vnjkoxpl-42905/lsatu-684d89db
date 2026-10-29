import * as React from 'react';
export type RcObservedPane = 'passage' | 'question' | 'shared';
export interface RcObservedTotals { passageMs: number; questionMs: number; sharedMs: number }
/** Wall-clock intervals with a visible pane. Never an inference about reading or attention. */
export function useRcPaneObservation(identity: string, enabled: boolean, paused: boolean) {
  const [pane, setPane] = React.useState<RcObservedPane>('shared');
  const current = React.useRef({ identity, totals: { passageMs: 0, questionMs: 0, sharedMs: 0 } as RcObservedTotals, since: performance.now(), pane, running: false });
  const flush = React.useCallback(() => {
    const state = current.current; const now = performance.now();
    if (state.running) state.totals[`${state.pane}Ms`] += Math.max(0, now - state.since);
    state.since = now;
  }, []);
  React.useLayoutEffect(() => {
    flush();
    if (current.current.identity !== identity) current.current = { identity, totals: { passageMs: 0, questionMs: 0, sharedMs: 0 }, since: performance.now(), pane, running: false };
    current.current.pane = pane;
    const update = () => { flush(); current.current.running = enabled && !paused && document.visibilityState !== 'hidden'; };
    update(); document.addEventListener('visibilitychange', update);
    return () => { flush(); current.current.running = false; document.removeEventListener('visibilitychange', update); };
  }, [identity, enabled, paused, pane, flush]);
  const snapshot = React.useCallback(() => {
    flush();
    return Object.fromEntries(Object.entries(current.current.totals).map(([key, value]) => [key, Math.round(value)])) as unknown as RcObservedTotals;
  }, [flush]);
  return { setPane, snapshot };
}
