import { useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

/** Home regions that take part in the one entrance. */
export const HOME_REVEAL_SELECTOR = "[data-home-reveal]";

/**
 * One entrance for Home, owned here rather than by the shared classroom
 * motion (the Home root carries `data-motion-skip`, so the shared reveal
 * leaves it alone and nothing is animated twice).
 *
 * A short fade-up with a small stagger across the top-level regions, once per
 * mount. No blur: these regions are large, and blurring a card that is mostly
 * text reads as the page failing to focus. Content that is not ready within a
 * moment of arriving simply appears, because a late entrance is worse than
 * none. Count or row updates afterwards never replay it. Every control stays
 * interactive while it fades, and a pointer press finishes it at once.
 */
export function useHomeEntrance(ref: RefObject<HTMLElement>, ready: boolean) {
  const mountedAt = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const played = useRef(false);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !ready || played.current) return;
    played.current = true;
    if (performance.now() - mountedAt.current > 700) return;
    let tween: gsap.core.Tween | null = null;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const targets = Array.from(root.querySelectorAll<HTMLElement>(HOME_REVEAL_SELECTOR)).filter(
        (element) => !element.contains(document.activeElement),
      );
      if (!targets.length) return;
      tween = gsap.fromTo(
        targets,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: "power2.out", stagger: 0.05, clearProps: "transform,opacity" },
      );
    });
    const finish = () => tween?.progress(1);
    root.addEventListener("pointerdown", finish, { once: true });
    return () => {
      root.removeEventListener("pointerdown", finish);
      media.revert();
    };
  }, [ref, ready]);
}
