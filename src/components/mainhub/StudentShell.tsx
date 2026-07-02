"use client";

import * as React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu } from "lucide-react";
import { IconLayoutSidebarLeftExpand, IconLayoutSidebarLeftCollapse } from "@tabler/icons-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainhubSidebar from "@/components/mainhub/MainhubSidebar";
import MainhubDock from "@/components/mainhub/MainhubDock";


import StudySidecar from "@/components/mainhub/StudySidecar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { hasSeenTour, startTour } from "@/components/mainhub/GuidedTour";

const SIDECAR_WIDTH_STORAGE_KEY = "lsatu:sidecarWidth";
const SIDECAR_MIN_WIDTH = 360;
const SIDECAR_DEFAULT_WIDTH = 420;
const SIDECAR_MAX_WIDTH = 640;

const ROUTE_TITLES: Record<string, string> = {
  "/mainhub": "Home",
  "/classroom": "Classroom",
  "/bootcamps": "Bootcamps",
  "/inbox": "Messages",
  "/practice": "Practice Hub",
  "/journal": "Wrong Answer Journal",
  "/activities": "Activity Centre",
  "/schedule": "Schedule",
  "/teacher": "Teacher Workspace",
  "/teacher/reference-library": "Reference Library",
  "/admin/board": "Whiteboard",
};

function titleForPath(pathname: string) {
  const match = Object.entries(ROUTE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return match?.[1] ?? "Workspace";
}

function maxSidecarWidth() {
  if (typeof window === "undefined") return SIDECAR_MAX_WIDTH;
  return Math.max(SIDECAR_DEFAULT_WIDTH, Math.min(SIDECAR_MAX_WIDTH, window.innerWidth * 0.45));
}

function clampSidecarWidth(width: number) {
  return Math.min(Math.max(width, SIDECAR_MIN_WIDTH), maxSidecarWidth());
}

function readStoredSidecarWidth() {
  if (typeof window === "undefined") return SIDECAR_DEFAULT_WIDTH;
  const rawValue = window.localStorage.getItem(SIDECAR_WIDTH_STORAGE_KEY);
  if (rawValue === null) return clampSidecarWidth(SIDECAR_DEFAULT_WIDTH);
  const stored = Number(rawValue);
  return Number.isFinite(stored) ? clampSidecarWidth(stored) : clampSidecarWidth(SIDECAR_DEFAULT_WIDTH);
}

/**
 * Persistent student app shell (LexPrep-style).
 *
 * The sidebar, top-right cluster, study sidecar, and support chat live here and
 * stay mounted across navigations. Student pages render into the center stage
 * via <Outlet/>, so clicking a sidebar item swaps the stage instead of
 * redirecting to a separate page. Actual LSAT question surfaces (Drill,
 * sections, in-bootcamp runners) are routed OUTSIDE this shell and take over
 * the full viewport, unchanged.
 */
export default function StudentShell() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [sidecarOpen, setSidecarOpen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("lsatu:sidecarOpen") !== "0";
  });
  const [sidecarWidth, setSidecarWidth] = React.useState(readStoredSidecarWidth);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const mainRef = React.useRef<HTMLElement>(null);
  const routeTitle = React.useMemo(() => titleForPath(location.pathname), [location.pathname]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem("lsatu:sidecarOpen", sidecarOpen ? "1" : "0");
    } catch {
      // Ignore storage failures in private or restricted browsing contexts.
    }
  }, [sidecarOpen]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(SIDECAR_WIDTH_STORAGE_KEY, String(Math.round(sidecarWidth)));
    } catch {
      // Ignore storage failures in private or restricted browsing contexts.
    }
  }, [sidecarWidth]);

  React.useEffect(() => {
    const handleResize = () => setSidecarWidth((width) => clampSidecarWidth(width));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("class_id", user.id)
        .maybeSingle();
      if (!profile?.display_name) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setDisplayName(profile.display_name);
    })();
  }, [user, authReady, navigate]);

  React.useEffect(() => {
    if (displayName && !hasSeenTour()) {
      const t = setTimeout(() => startTour(), 600);
      return () => clearTimeout(t);
    }
  }, [displayName]);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [location.pathname, reduceMotion]);

  const handleSidecarResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button > 0) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidecarWidth;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setSidecarWidth(clampSidecarWidth(nextWidth));
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const resetSidecarWidth = () => {
    setSidecarWidth(clampSidecarWidth(SIDECAR_DEFAULT_WIDTH));
  };

  const handleSidecarResizeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? 1 : -1;
      setSidecarWidth((width) => clampSidecarWidth(width + direction * 24));
    }
    if (event.key === "Home") {
      event.preventDefault();
      setSidecarWidth(SIDECAR_MIN_WIDTH);
    }
    if (event.key === "End") {
      event.preventDefault();
      setSidecarWidth(maxSidecarWidth());
    }
  };

  if (!authReady || !user) return null;

  return (
    <>
      <div className="relative flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <aside
          data-tour="mainhub-sidebar"
          className="hidden shrink-0 md:flex"
          style={{ width: "15rem" }}
        >
          <MainhubSidebar displayName={displayName} />
        </aside>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="absolute left-4 top-4 z-20 rounded-md p-2 text-muted-foreground transition hover:text-foreground active:opacity-70 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0">
            <MainhubSidebar displayName={displayName} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="relative flex min-w-0 flex-1 gap-2 overflow-hidden p-2 transition-all duration-200">
          <div className="pointer-events-none absolute right-6 top-5 z-10 md:hidden">
            <div data-tour="mainhub-dock" className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setSidecarOpen((v) => !v)}
                aria-label={sidecarOpen ? "Close LSAT U chat" : "Open LSAT U chat"}
                title={sidecarOpen ? "Close LSAT U chat" : "Open LSAT U chat"}
                className="rounded-xl border border-border/40 bg-background/70 px-2.5 py-1.5 text-muted-foreground shadow-sm shadow-black/5 backdrop-blur-md transition-colors hover:text-foreground"
              >
                {sidecarOpen ? (
                  <IconLayoutSidebarLeftCollapse size={18} />
                ) : (
                  <IconLayoutSidebarLeftExpand size={18} />
                )}
              </button>
              <MainhubDock />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="hidden h-8 shrink-0 items-start justify-between gap-4 px-1 md:flex">
              <h1 className="truncate pt-0.5 text-sm font-semibold text-foreground">
                {routeTitle}
              </h1>
              {!sidecarOpen && (
                <button
                  onClick={() => setSidecarOpen(true)}
                  aria-label="Open LSAT U chat"
                  title="Open LSAT U chat"
                  className="rounded-lg border border-border/40 bg-background/70 p-1.5 text-muted-foreground shadow-sm shadow-black/5 backdrop-blur-md transition-colors hover:text-foreground"
                >
                  <IconLayoutSidebarLeftExpand size={16} />
                </button>
              )}
            </div>

            {/* Center stage. Student pages render here and scroll internally;
                the sidebar and study chat stay put around them. */}
            <main ref={mainRef} className="relative min-h-0 w-full flex-1 overflow-y-auto">
              {/* No mode="wait": the incoming page mounts immediately instead of
                  waiting for the outgoing page to finish exiting, so swaps feel
                  instant. Short fade only (no blur/translate stack). */}
              <AnimatePresence initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className="h-full w-full"
                  style={{ willChange: "opacity" }}
                >
                  <Outlet context={{ displayName }} />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          <div
            className="relative hidden min-h-0 shrink-0 pt-8 md:block"
            style={{ width: sidecarOpen ? sidecarWidth : 0 }}
          >
            {sidecarOpen ? (
              <button
                type="button"
                aria-label="Resize communication rail"
                aria-valuemin={SIDECAR_MIN_WIDTH}
                aria-valuemax={Math.round(maxSidecarWidth())}
                aria-valuenow={Math.round(sidecarWidth)}
                className="absolute left-0 top-8 z-20 h-[calc(100%-2rem)] w-3 -translate-x-1/2 cursor-col-resize rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onPointerDown={handleSidecarResizePointerDown}
                onDoubleClick={resetSidecarWidth}
                onKeyDown={handleSidecarResizeKeyDown}
              >
                <span className="mx-auto block h-16 w-1 rounded-full bg-border/60 opacity-50 transition-opacity hover:opacity-100" />
              </button>
            ) : null}
            <StudySidecar
              open={sidecarOpen}
              onClose={() => setSidecarOpen(false)}
              userName={displayName ?? undefined}
              presentation="docked"
              width={sidecarWidth}
            />
          </div>
        </div>
      </div>
    </>
  );
}
