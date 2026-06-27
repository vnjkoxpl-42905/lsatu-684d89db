"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import { useLastActivity } from "@/hooks/useLastActivity";
import SmartLRTrainingCard from "@/components/mainhub/SmartLRTrainingCard";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
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
    date: "Notes",
    content: "Open your Journal — notes, databases, and missed-question review.",
    category: "Journal",
    status: "pending",
    energy: 68,
  },
};

/**
 * Mainhub home stage. Renders inside StudentShell's center <Outlet/>: the
 * orbital ring + Smart Drill card on the LexPrep-style inset card. The
 * persistent sidebar, study sidecar, and support chat are owned by the shell.
 */
export default function AcademyMainhub() {
  const navigate = useNavigate();
  const perms = useUserPermissions();
  const { data: classroomItems = [] } = useClassroomItems();
  const { data: lastActivity } = useLastActivity();
  const { setActive: setOrbitalActive } = useOrbitalActive();

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
        navigate("/journal");
      }
    },
    [navigate, classroomItems, setOrbitalActive, lastActivity],
  );

  React.useEffect(() => {
    // If user navigates away while a node is expanded, clear orbital-active
    // so the chat widget reappears on the next route.
    return () => setOrbitalActive(false);
  }, [setOrbitalActive]);

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto rounded-xl bg-card/60 px-4 py-8 pb-24 shadow-sm ring-1 ring-inset ring-border/40 md:px-6 @4xl:py-20">
      <div className="my-auto flex w-full max-w-3xl flex-col items-center gap-10">
        {/* Smart Drill card — now on top */}
        <div className="w-full max-w-[360px] shrink-0">
          <SmartLRTrainingCard />
        </div>

        {/* Orbital ring — moved below the card, no overlap */}
        <section
          aria-label="Mainhub orbital workspace"
          className="relative flex shrink-0 items-center justify-center"
        >
          <div data-tour="mainhub-orbital" className="relative h-[500px] w-[460px] max-w-full">
            <RadialOrbitalTimeline timelineData={mainhubNodes} onActivate={onOrbitalActivate} />
          </div>
        </section>
      </div>
    </div>
  );
}
