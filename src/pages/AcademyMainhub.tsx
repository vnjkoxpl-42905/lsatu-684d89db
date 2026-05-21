"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { LifeBuoy, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainhubSidebar from "@/components/mainhub/MainhubSidebar";
import MainhubDock from "@/components/mainhub/MainhubDock";
import MainhubAccountButton from "@/components/mainhub/MainhubAccountButton";
import SmartLRTrainingCard from "@/components/mainhub/SmartLRTrainingCard";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import HelpDialog from "@/components/mainhub/HelpDialog";
import { hasSeenTour, startTour } from "@/components/mainhub/GuidedTour";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import { useLastActivity } from "@/hooks/useLastActivity";
import { resolveResumeTarget } from "@/lib/lastActivity";
import { nextActionFor, resolveItemRoute } from "@/lib/classroomItems";
import {
  ORBITAL_CATALOG,
  findCatalogItem,
  type CatalogItem,
} from "@/lib/layoutCatalog";

const REQUIRED_ORBITAL_IDS = ["resume", "analytics", "waj"] as const;

interface OrbitalRenderInfo {
  date: string;
  content: string;
  category: string;
  status: TimelineItem["status"];
  energy: number;
}

const ORBITAL_RENDER: Record<string, OrbitalRenderInfo> = {
  resume: {
    date: "Last assignment",
    content: "Open the next thing on your plate.",
    category: "Classroom",
    status: "pending",
    energy: 60,
  },
  analytics: {
    date: "Trends",
    content: "Review your performance trends and accuracy by question type.",
    category: "Progress",
    status: "in-progress",
    energy: 72,
  },
  waj: {
    date: "Review",
    content: "Open your Wrong Answer Journal.",
    category: "Journal",
    status: "pending",
    energy: 68,
  },
};

export default function AcademyMainhub() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const perms = useUserPermissions();
  const { data: classroomItems = [] } = useClassroomItems();
  const { data: lastActivity } = useLastActivity();
  const { setActive: setOrbitalActive } = useOrbitalActive();
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [helpOpen, setHelpOpen] = React.useState(false);
  

  React.useEffect(() => {
    if (displayName && !hasSeenTour()) {
      const t = setTimeout(() => startTour(), 600);
      return () => clearTimeout(t);
    }
  }, [displayName]);

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

  const userHasAccess = React.useCallback(
    (item: CatalogItem) => {
      // Optimistic during perm load: useUserPermissions refetches per mount,
      // taking 1-3s. The orbital is a nav surface; ProtectedRoute gates the
      // actual route. Optimism here keeps the mainhub from staying blank.
      if (perms.loading) return true;
      if (item.adminOnly) return perms.is_admin;
      if (item.requires) return perms.is_admin || !!perms[item.requires as PermissionFlag];
      return true;
    },
    [perms],
  );

  const mainhubNodes: TimelineItem[] = React.useMemo(() => {
    const visibleIds = REQUIRED_ORBITAL_IDS.filter((id) => {
      const cat = findCatalogItem(ORBITAL_CATALOG, id);
      return cat ? userHasAccess(cat) : false;
    });
    return visibleIds
      .map((id) => {
        const cat = findCatalogItem(ORBITAL_CATALOG, id);
        const r = ORBITAL_RENDER[id];
        if (!cat || !r || !userHasAccess(cat)) return null;
        // Stable id: position in ORBITAL_CATALOG. Survives permissions-driven
        // filter changes so React's key tracks the same DOM element.
        const stableId = ORBITAL_CATALOG.findIndex((c) => c.id === id) + 1;
        const node: TimelineItem = {
          id: stableId,
          title: cat.label,
          date: r.date,
          content: r.content,
          category: r.category,
          icon: cat.icon,
          relatedIds: [],
          status: r.status,
          energy: r.energy,
        };
        return node;
      })
      .filter((n): n is TimelineItem => n !== null);
  }, [userHasAccess]);

  const onOrbitalActivate = React.useCallback(
    (nodeId: number | null) => {
      // Push orbital-active state for shared mainhub overlay gates.
      setOrbitalActive(nodeId !== null);
      if (nodeId === null) return;
      // nodeId is ORBITAL_CATALOG position + 1, so look up the catalog id directly.
      const itemId = ORBITAL_CATALOG[nodeId - 1]?.id;
      if (itemId === "resume") {
        // Primary source: user_last_activity (true "where I left off").
        // Fallbacks: next assigned classroom item → Smart Drill.
        if (lastActivity) {
          const { path, state } = resolveResumeTarget(lastActivity.state_snapshot);
          navigate(path, { state });
        } else {
          const next = nextActionFor(classroomItems);
          const route = next ? resolveItemRoute(next) : null;
          navigate(route ?? "/drill", route ? undefined : { state: { mode: "adaptive" } });
        }
      } else if (itemId === "analytics") {
        navigate("/analytics");
      } else if (itemId === "waj") {
        navigate("/waj");
      }
    },
    [navigate, classroomItems, setOrbitalActive, lastActivity],
  );

  React.useEffect(() => {
    // If user navigates away while a node is expanded, clear orbital-active
    // so the chat widget reappears on the next route.
    return () => setOrbitalActive(false);
  }, [setOrbitalActive]);

  if (!authReady || !user) return null;

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <aside
        data-tour="mainhub-sidebar"
        className="hidden shrink-0 border-r border-border md:flex"
        style={{ width: "min(320px, 30vw)", minWidth: 280 }}
      >
        <MainhubSidebar displayName={displayName} />
      </aside>

      <Sheet>
        <SheetTrigger
          aria-label="Open menu"
          className="absolute left-4 top-4 z-20 rounded-md p-2 text-muted-foreground transition hover:text-foreground active:opacity-70 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] p-0">
          <MainhubSidebar displayName={displayName} />
        </SheetContent>
      </Sheet>

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 pb-24 md:px-6">
        <div className="pointer-events-none absolute right-8 top-7 z-10">
          <div data-tour="mainhub-dock" className="pointer-events-auto flex items-center gap-2">
            <MainhubDock />
            <MainhubAccountButton displayName={displayName} />
          </div>
        </div>

        <div className="relative flex h-full w-full max-w-[1060px] items-center justify-center gap-3 2xl:max-w-[1100px] 2xl:gap-4">
          <div className="hidden w-[400px] shrink-0 xl:flex 2xl:w-[440px]">
            <SmartLRTrainingCard />
          </div>

          <section
            aria-label="Mainhub orbital workspace"
            className="relative flex h-full min-h-[560px] min-w-0 flex-1 items-center justify-center"
          >
            <div
              data-tour="mainhub-orbital"
              className="absolute left-1/2 top-1/2 h-[500px] w-[460px] max-w-full -translate-x-1/2 -translate-y-1/2"
            >
              <RadialOrbitalTimeline
                timelineData={mainhubNodes}
                onActivate={onOrbitalActivate}
              />
            </div>
          </section>
        </div>
      </main>

      <MainhubHelpControl
        open={helpOpen}
        onOpenChange={setHelpOpen}
        onReplayTour={() => startTour()}
      />
    </div>
  );
}

function MainhubHelpControl({
  open,
  onOpenChange,
  onReplayTour,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplayTour?: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Get help from Joshua"
        title="Get help from Joshua"
        data-help-overlay
        className="fixed bottom-5 left-5 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LifeBuoy className="h-4 w-4" aria-hidden />
      </button>
      <HelpDialog open={open} onOpenChange={onOpenChange} onReplayTour={onReplayTour} />
    </>
  );
}
