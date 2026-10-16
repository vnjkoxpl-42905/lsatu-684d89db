import * as React from "react";
import { ChevronDown } from "lucide-react";

/**
 * Whether a scroll container still has content below what is on screen.
 *
 * Rechecks on scroll, when the container resizes, and when anything inside it
 * changes (a new question, an explanation opening, the student's text size).
 */
export function useHasMoreBelow(ref: React.RefObject<HTMLElement>): boolean {
  const [more, setMore] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A couple of pixels of slack so sub-pixel rounding never leaves the cue
    // showing at the very bottom.
    const check = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    resize?.observe(el);
    const mutation =
      typeof MutationObserver !== "undefined" ? new MutationObserver(check) : null;
    mutation?.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => {
      el.removeEventListener("scroll", check);
      resize?.disconnect();
      mutation?.disconnect();
    };
  }, [ref]);

  return more;
}

/**
 * The "more below" cue for a Question screen column. Most questions fit on a
 * laptop screen, but the longest ones, and any question read at a larger text
 * size, run past the bottom of their column. Without a cue a student can take
 * four choices for five. Render it as the LAST child of the scroll container:
 * it is a zero-height sticky anchor, so it adds no height of its own and the
 * fade sits over the bottom edge of whatever is visible.
 */
export function ScrollMoreCue({
  scrollRef,
  label = "More below",
  fadeStyle,
}: {
  scrollRef: React.RefObject<HTMLElement>;
  label?: string;
  /** Override the white fade, for a column painted another colour (RC's
   *  accessibility schemes). */
  fadeStyle?: React.CSSProperties;
}) {
  const more = useHasMoreBelow(scrollRef);
  if (!more) return null;

  return (
    <div className="sticky bottom-0 h-0 z-10" data-testid="scroll-more-cue">
      <div
        className={
          "pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-end justify-center pb-2" +
          (fadeStyle ? "" : " bg-gradient-to-t from-white via-white/85 to-transparent")
        }
        style={fadeStyle}
      >
        <button
          type="button"
          onClick={() => {
            const el = scrollRef.current;
            if (el) el.scrollBy({ top: el.clientHeight * 0.8, behavior: "smooth" });
          }}
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 font-sans text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {label}
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
