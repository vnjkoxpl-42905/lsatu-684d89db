import * as React from 'react';

/**
 * How long to wait before treating a click on answer text as a pick while a
 * marker tool is active. A double-click to mark one word arrives as two full
 * click cycles, and the word is only selected on the second press, so the
 * first click cannot tell itself apart from a real pick. Waiting this long
 * lets the second press cancel it. Only marking mode pays the wait.
 */
export const DEFERRED_PICK_MS = 300;

/**
 * A pick that can still be called off. `schedule` replaces any pending pick;
 * `cancel` drops it; unmount drops it too, so a pick never lands on a row
 * that is gone.
 */
export function useDeferredPick() {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = React.useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = React.useCallback(
    (pick: () => void, delayMs: number = DEFERRED_PICK_MS) => {
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        pick();
      }, delayMs);
    },
    [cancel],
  );

  React.useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
