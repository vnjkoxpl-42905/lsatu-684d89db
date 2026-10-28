import { useEffect, useState } from "react";

/**
 * Whether this device probably has no keyboard, so the drill's one key is out
 * of reach.
 *
 * A section advances on Space and on nothing else
 * (`SectionRunner.tsx`, "One key, and only Space"). That is deliberate: no
 * mouse in the loop, so her hands never leave the argument. It also means a
 * phone can open the drill, read stimulus 1, and never get to stimulus 2 --
 * the briefing, the door and the library all render fine at 390x844, so
 * nothing warns her before the recording is already running.
 *
 * `(pointer: coarse)` is the test rather than a width, because the question is
 * "is there a keyboard", not "is the screen small". A narrow desktop window has
 * a keyboard and must keep the pure one-key loop; a large tablet has no
 * keyboard and needs the control. Width answers neither.
 *
 * This is a hint, never a gate. Joshua's call, 2026-09-04: a phone is warned
 * and let through, not refused. So nothing here disables anything -- it adds a
 * sentence at the door and an on-screen way to advance inside the run, and
 * Space stays authoritative everywhere.
 */
export const NO_KEYBOARD_QUERY = "(pointer: coarse)";

/** Read once, outside React, so a non-browser render has a defined answer. */
export function hasNoKeyboard(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(NO_KEYBOARD_QUERY).matches;
}

/**
 * The same question as a hook, kept live.
 *
 * A tablet with a keyboard case attached or removed mid-run changes the answer,
 * and the control appearing or going away is the correct response to that. The
 * initial state is computed rather than defaulted to `false`, so the first
 * paint on a phone already carries the control instead of flashing a screen
 * that cannot be advanced.
 */
export function useNoKeyboard(): boolean {
  const [noKeyboard, setNoKeyboard] = useState<boolean>(hasNoKeyboard);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(NO_KEYBOARD_QUERY);
    const onChange = () => setNoKeyboard(mql.matches);
    onChange();
    // `addEventListener` is not universal on MediaQueryList in older Safari,
    // which is exactly the population this query is about, so the older API is
    // the fallback rather than the assumption.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener?.(onChange);
    return () => mql.removeListener?.(onChange);
  }, []);

  return noKeyboard;
}
