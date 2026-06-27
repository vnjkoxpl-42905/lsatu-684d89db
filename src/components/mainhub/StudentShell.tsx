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
import MainhubAccountButton from "@/components/mainhub/MainhubAccountButton";
import MainhubHelpControl from "@/components/mainhub/MainhubHelpControl";
import StudySidecar from "@/components/mainhub/StudySidecar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { hasSeenTour, startTour } from "@/components/mainhub/GuidedTour";

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
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [sidecarOpen, setSidecarOpen] = React.useState(false);

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

  if (!authReady || !user) return null;

  return (
    <>
      <div className="relative flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <aside
          data-tour="mainhub-sidebar"
          className="hidden shrink-0 border-r border-border md:flex"
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

        <div
          className={`relative flex flex-1 flex-col overflow-hidden p-2 transition-all duration-200${
            sidecarOpen ? " md:pr-[calc(24rem+0.5rem)]" : ""
          }`}
        >
          <div className="pointer-events-none absolute right-6 top-5 z-10">
            <div data-tour="mainhub-dock" className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() =>
                  setSidecarOpen((v) => {
                    if (!v) setHelpOpen(false);
                    return !v;
                  })
                }
                aria-label={sidecarOpen ? "Close study assistant" : "Open study assistant"}
                title={sidecarOpen ? "Close study assistant" : "Open study assistant"}
                className="rounded-xl border border-border/40 bg-background/70 px-2.5 py-1.5 shadow-sm shadow-black/5 backdrop-blur-md text-muted-foreground hover:text-foreground transition-colors"
              >
                {sidecarOpen ? (
                  <IconLayoutSidebarLeftCollapse size={18} />
                ) : (
                  <IconLayoutSidebarLeftExpand size={18} />
                )}
              </button>
              <MainhubDock />
              <MainhubAccountButton displayName={displayName} />
            </div>
          </div>

          {/* Center stage. Student pages render here and scroll internally;
              the sidebar and study chat stay put around them. */}
          <main className="relative h-full w-full overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(8px)" }}
                animate={reduceMotion ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4, filter: "blur(4px)" }}
                transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="h-full w-full"
                style={{ willChange: "opacity, transform, filter" }}
              >
                <Outlet context={{ displayName }} />
              </motion.div>
            </AnimatePresence>
          </main>

        </div>
      </div>

      {!sidecarOpen && <MainhubHelpControl open={helpOpen} onOpenChange={setHelpOpen} />}

      <StudySidecar
        open={sidecarOpen}
        onClose={() => setSidecarOpen(false)}
        userName={displayName ?? undefined}
      />
    </>
  );
}
