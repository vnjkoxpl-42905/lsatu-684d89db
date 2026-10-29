// MainhubAvatarFab — the bottom-right help trigger on /mainhub, rendered as a
// small Spline 3D robot avatar (the same scene used in the Practice Hub hero).
//
// Layered: a fallback MessageCircle icon sits underneath and is always present,
// so if Spline fails (SplineErrorBoundary renders null) or hasn't loaded yet,
// the button is still a recognizable, clickable chat affordance. The Spline
// canvas is pointer-events-none so clicks always reach the button. Spline is
// mounted after first paint to keep the orbital and chat snappy.

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { SplineScene } from "@/components/ui/splite";

const ROBOT_SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

interface MainhubAvatarFabProps {
  open: boolean;
  onToggle: () => void;
}

export default function MainhubAvatarFab({ open, onToggle }: MainhubAvatarFabProps) {
  const [mountSpline, setMountSpline] = React.useState(false);

  React.useEffect(() => {
    const ric =
      typeof window !== "undefined" &&
      (window as typeof window & { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback;
    let id: number;
    if (ric) {
      id = ric.call(window, () => setMountSpline(true));
      return () => (window as typeof window & { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setMountSpline(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label="Get help from Joshua"
      title="Get help from Joshua"
      data-help-overlay
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-[#141414] text-white shadow-[0_14px_35px_rgba(15,23,42,0.18)] transition hover:bg-[#242424] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Fallback layer — always rendered, covered by Spline when it loads. */}
      <MessageCircle
        className="absolute h-5 w-5 text-white"
        strokeWidth={1.8}
        aria-hidden
      />
      {mountSpline && (
        <span className="pointer-events-none absolute inset-0 scale-[1.6]">
          <SplineScene scene={ROBOT_SCENE} className="h-full w-full" />
        </span>
      )}
    </button>
  );
}
