/**
 * Whether an unrepeatable, recording run is on screen right now.
 *
 * There is exactly one thing in this app that cannot survive a reload: a Read,
 * Recall, Colour section. It is one unbroken take of up to twenty-five minutes,
 * held by a `MediaRecorder` in this tab, and a reload ends the recorder, drops
 * the stream and takes the run with it.
 *
 * The app reloads itself on purpose. `main.tsx` checks on every `pageshow` and
 * every return to the tab whether a newer bundle has been published, and
 * reloads if one has. That is right for every other screen -- it is how a
 * student stops running a build from two deploys ago -- and it is catastrophic
 * here: publishing while she is mid-section destroyed her run the moment she
 * glanced at another tab and came back.
 *
 * A module-level flag rather than a React context, for two reasons. The
 * listeners it has to reach are registered in `main.tsx` before React exists,
 * and the answer has to be readable synchronously from inside an event handler
 * where there is no component to ask.
 *
 * The freshness check is only ever DEFERRED, never cancelled. She is on a stale
 * bundle for the length of one section and gets the new one the next time the
 * tab is idle, which is the trade the reload exists to make in the first place.
 */

let live = 0;

/**
 * Mark a run live, and hand back the way to unmark it.
 *
 * Counted rather than boolean so a component that mounts twice -- React's
 * development strict mode does exactly this -- cannot leave the flag stuck on
 * after both copies have gone.
 */
export function beginLiveRun(): () => void {
  live += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    live = Math.max(0, live - 1);
  };
}

/** True while anything unrepeatable is on screen. */
export function isRunLive(): boolean {
  return live > 0;
}
