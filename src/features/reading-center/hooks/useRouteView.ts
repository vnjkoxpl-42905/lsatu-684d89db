import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const RESTORE_FRAMES = 30;
const FOCUS_WAIT_MS = 2000;

/** Put the page back where it was, waiting briefly if its content is still loading. */
function restoreScroll(top: number): () => void {
  let frame = 0;
  let tries = 0;
  const step = () => {
    window.scrollTo?.({ top, left: 0, behavior: "auto" });
    const reached = Math.abs(window.scrollY - top) < 2;
    if (!reached && tries++ < RESTORE_FRAMES) frame = requestAnimationFrame(step);
  };
  step();
  return () => cancelAnimationFrame(frame);
}

/**
 * Focus the destination heading once it exists, then stop. If the page is still
 * loading, wait for its heading; give up after a moment, or as soon as the
 * student moves focus into the page themselves, so a late data update never
 * pulls focus away from where they are working.
 */
function focusHeadingWhenReady(root: HTMLElement): () => void {
  const find = () => root.querySelector<HTMLElement>("h1") ?? null;
  const focus = (el: HTMLElement) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  };
  const existing = find();
  if (existing) { focus(existing); return () => undefined; }
  let done = false;
  const stop = () => { done = true; observer.disconnect(); document.removeEventListener("focusin", onFocusIn); window.clearTimeout(timer); };
  const onFocusIn = (event: FocusEvent) => { if (root.contains(event.target as Node)) stop(); };
  const observer = new MutationObserver(() => {
    const el = find();
    if (el && !done) { focus(el); stop(); }
  });
  observer.observe(root, { childList: true, subtree: true });
  document.addEventListener("focusin", onFocusIn);
  const timer = window.setTimeout(stop, FOCUS_WAIT_MS);
  return stop;
}

/**
 * Where the page and keyboard focus go when the destination changes.
 *
 * - A new destination opens at the top, with its heading focused, no matter how
 *   far the previous page was scrolled. The jump is instant, never animated.
 * - Back and Forward restore the scroll position that view had, and leave focus alone.
 * - A change to only the hash or query string (an anchor, a disclosure) is the
 *   page's own business and is left to it.
 *
 * `remember` records the current scroll for the current entry; call it just
 * before an in-app navigation so the position is exact.
 */
export function useRouteView(content: RefObject<HTMLElement>): { remember: () => void } {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const currentKey = useRef(location.key);
  const lastPath = useRef(location.pathname);
  const first = useRef(true);

  const remember = useCallback(() => { positions.current.set(currentKey.current, window.scrollY); }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      const key = currentKey.current;
      const top = window.scrollY;
      frame = requestAnimationFrame(() => positions.current.set(key, top));
    };
    const previous = window.history.scrollRestoration;
    try { window.history.scrollRestoration = "manual"; } catch { /* not settable here */ }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      try { window.history.scrollRestoration = previous; } catch { /* not settable here */ }
    };
  }, []);

  useLayoutEffect(() => {
    const pathChanged = location.pathname !== lastPath.current;
    lastPath.current = location.pathname;
    currentKey.current = location.key;
    if (first.current) { first.current = false; return; }
    if (navigationType === "POP") {
      const saved = positions.current.get(location.key);
      if (saved !== undefined) return restoreScroll(saved);
      if (pathChanged) window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      return;
    }
    if (!pathChanged) return;
    window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    return content.current ? focusHeadingWhenReady(content.current) : undefined;
  }, [location.key, location.pathname, navigationType, content]);

  return { remember };
}
