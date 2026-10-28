import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

const PRESSABLE = ".classroom-home-cta, .classroom-home-action, .classroom-home-done, .classroom-home-search-clear";

/** Pointer feedback only. Daily-use Home content is visible immediately. */
export function useHomeFeedback(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const media = gsap.matchMedia(root);
    media.add("(prefers-reduced-motion: no-preference)", (context) => {
      const pressed = new Set<HTMLElement>();
      const press = (event: PointerEvent) => {
        if (event.button !== 0 || !(event.target instanceof Element)) return;
        const target = event.target.closest<HTMLElement>(PRESSABLE);
        if (!target || !root.contains(target) || target.matches(":disabled")) return;
        pressed.add(target);
        context.add(() => {
          gsap.to(target, { scale: 0.97, duration: 0.12, ease: "power2.out", overwrite: "auto" });
        });
      };
      const release = () => {
        for (const target of pressed) {
          context.add(() => {
            gsap.to(target, {
              scale: 1, duration: 0.16, ease: "power3.out", overwrite: "auto",
              onComplete: () => gsap.set(target, { clearProps: "transform" }),
            });
          });
        }
        pressed.clear();
      };
      const reset = () => {
        for (const target of root.querySelectorAll<HTMLElement>(PRESSABLE)) {
          gsap.killTweensOf(target);
          gsap.set(target, { clearProps: "transform" });
        }
        pressed.clear();
      };
      root.addEventListener("pointerdown", press);
      root.addEventListener("keydown", reset);
      document.addEventListener("pointerup", release);
      document.addEventListener("pointercancel", reset);
      window.addEventListener("blur", reset);
      return () => {
        root.removeEventListener("pointerdown", press);
        root.removeEventListener("keydown", reset);
        document.removeEventListener("pointerup", release);
        document.removeEventListener("pointercancel", reset);
        window.removeEventListener("blur", reset);
        reset();
      };
    });
    return () => media.revert();
  }, [ref]);
}
