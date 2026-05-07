"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FoyerSidebar from "@/components/foyer/FoyerSidebar";
import FoyerDock from "@/components/foyer/FoyerDock";
import FoyerAccountButton from "@/components/foyer/FoyerAccountButton";
import FoyerFindCard from "@/components/foyer/FoyerFindCard";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import GooeyDock from "@/components/ui/gooey-dock";
import HelpDialog from "@/components/foyer/HelpDialog";
import { hasSeenTour, startTour } from "@/components/foyer/GuidedTour";
import { openWhiteboard } from "@/components/whiteboard/whiteboardBus";
import { openTAWidget } from "@/components/ta/taWidgetBus";
import { openNotifications } from "@/components/notifications/notificationsBus";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useLayoutPrefs } from "@/hooks/useLayoutPrefs";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useInbox } from "@/hooks/useInbox";
import { useNotifications } from "@/hooks/useNotifications";
import { nextActionFor, resolveItemRoute } from "@/lib/classroomItems";
import {
  DOCK_CATALOG,
  ORBITAL_CATALOG,
  findCatalogItem,
  type CatalogItem,
} from "@/lib/layoutCatalog";

const FINDER_VARIANT = "finder" as const;

interface OrbitalRenderInfo {
  date: string;
  content: string;
  category: string;
  status: TimelineItem["status"];
  energy: number;
  variant?: typeof FINDER_VARIANT;
}

const ORBITAL_RENDER: Record<string, OrbitalRenderInfo> = {
  "smart-drill": {
    date: "Now",
    content: "Adaptive drill tuned to your weakest question types.",
    category: "Practice",
    status: "in-progress",
    energy: 80,
  },
  resume: {
    date: "Last assignment",
    content: "Open the next thing on your plate.",
    category: "Classroom",
    status: "pending",
    energy: 60,
  },
  find: {
    date: "Anytime",
    content: "Jump to a specific question.",
    category: "Practice",
    status: "in-progress",
    energy: 100,
    variant: FINDER_VARIANT,
  },
  "mock-lsat": {
    date: "Anytime",
    content: "Open the practice surface.",
    category: "Practice",
    status: "pending",
    energy: 70,
  },
  "last-bootcamp": {
    date: "Recent",
    content: "Resume your last bootcamp module.",
    category: "Bootcamp",
    status: "in-progress",
    energy: 65,
  },
};

export default function AcademyFoyer() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const perms = useUserPermissions();
  const { prefs } = useLayoutPrefs();
  const { data: classroomItems = [] } = useClassroomItems();
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  

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
      if (item.adminOnly) return perms.is_admin;
      if (item.requires) return perms.is_admin || !!perms[item.requires as PermissionFlag];
      return true;
    },
    [perms],
  );

  const foyerNodes: TimelineItem[] = React.useMemo(() => {
    return prefs.orbital
      .map((id, idx) => {
        const cat = findCatalogItem(ORBITAL_CATALOG, id);
        const r = ORBITAL_RENDER[id];
        if (!cat || !r || !userHasAccess(cat)) return null;
        const node: TimelineItem = {
          id: idx + 1,
          title: cat.label,
          date: r.date,
          content: r.content,
          category: r.category,
          icon: cat.icon,
          relatedIds: [],
          status: r.status,
          energy: r.energy,
        };
        if (r.variant) node.variant = r.variant;
        return node;
      })
      .filter((n): n is TimelineItem => n !== null);
  }, [prefs.orbital, userHasAccess]);

  const onOrbitalActivate = React.useCallback(
    (nodeId: number) => {
      const idx = nodeId - 1;
      const itemId = prefs.orbital[idx];
      if (itemId === "smart-drill") {
        navigate("/drill", { state: { mode: "adaptive" } });
      } else if (itemId === "resume") {
        const next = nextActionFor(classroomItems);
        const route = next ? resolveItemRoute(next) : null;
        navigate(route ?? "/drill");
      } else if (itemId === "mock-lsat") {
        navigate("/practice");
      } else if (itemId === "last-bootcamp") {
        const lastBootcamp = [...classroomItems]
          .filter(
            (i) =>
              i.type === "bootcamp_module" &&
              (i.status === "assigned" || i.status === "in_progress"),
          )
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
          )[0];
        const route = lastBootcamp ? resolveItemRoute(lastBootcamp) : null;
        navigate(route ?? "/bootcamps");
      } else if (itemId === "find") {
        // Find is a content-overlay node — single click opens the inline
        // FoyerFindCard via renderOrbitalExpanded. Double-click on Find is
        // intentionally a no-op so the overlay doesn't navigate away.
      }
    },
    [navigate, prefs.orbital, classroomItems],
  );

  const renderOrbitalExpanded = React.useCallback(
    (item: TimelineItem, close: () => void) => {
      if (item.variant !== FINDER_VARIANT) return null;
      return (
        <FoyerFindCard
          onOpen={(qid) =>
            navigate("/drill", {
              state: {
                mode: "type-drill",
                config: {
                  qtypes: [],
                  difficulties: [],
                  pts: [],
                  count: 1,
                  selectedQids: [qid],
                },
              },
            })
          }
          onClose={close}
        />
      );
    },
    [navigate],
  );

  if (!authReady || !user) return null;

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside
        className="hidden shrink-0 border-r border-border md:flex"
        style={{ width: "min(320px, 30vw)", minWidth: 280 }}
      >
        <FoyerSidebar displayName={displayName} />
      </aside>

      <Sheet>
        <SheetTrigger
          aria-label="Open menu"
          className="absolute left-4 top-4 z-20 rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] p-0">
          <FoyerSidebar displayName={displayName} />
        </SheetContent>
      </Sheet>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 pb-32">
        <div className="pointer-events-none absolute right-8 top-7 z-10">
          <div className="pointer-events-auto flex items-center gap-2">
            <FoyerDock />
            <FoyerAccountButton displayName={displayName} />
          </div>
        </div>
        <RadialOrbitalTimeline
          timelineData={foyerNodes}
          onActivate={onOrbitalActivate}
          renderExpandedContent={renderOrbitalExpanded}
        />

        <FoyerQuickDock onReplayTour={() => startTour()} />
      </main>
    </div>
  );
}

function FoyerQuickDock({ onReplayTour }: { onReplayTour?: () => void }) {
  const navigate = useNavigate();
  const perms = useUserPermissions();
  const { prefs } = useLayoutPrefs();
  const { unreadCount: inboxUnread } = useInbox();
  const { unreadCount: notifUnread } = useNotifications();
  const [helpOpen, setHelpOpen] = React.useState(false);

  const badgeFor = (id: string): number | undefined => {
    if (id === "inbox") return inboxUnread;
    if (id === "notifications") return notifUnread;
    return undefined;
  };

  const userHasAccess = (item: CatalogItem) => {
    if (item.adminOnly) return perms.is_admin;
    if (item.requires) return perms.is_admin || !!perms[item.requires as PermissionFlag];
    return true;
  };

  const resolveAction = (id: string): (() => void) | null => {
    switch (id) {
      case "teacher":
        return () => navigate("/teacher");
      case "whiteboard":
        return () => openWhiteboard();
      case "ask-joshua":
        return () => openTAWidget();
      case "inbox":
        return () => navigate("/inbox");
      case "schedule":
        return () => navigate("/schedule");
      case "notifications":
        return () => openNotifications();
      case "profile":
        return () => navigate("/profile");
      case "settings":
        return () => navigate("/settings/layout");
      case "help":
        return () => setHelpOpen(true);
      default:
        return null;
    }
  };

  const items = prefs.dock
    .map((id) => {
      const cat = findCatalogItem(DOCK_CATALOG, id);
      if (!cat || !userHasAccess(cat)) return null;
      const onClick = resolveAction(id);
      if (!onClick) return null;
      return { icon: cat.icon, label: cat.label, onClick, badge: badgeFor(id) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <>
      {items.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
          <div className="pointer-events-auto">
            <GooeyDock items={items} />
          </div>
        </div>
      )}
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
