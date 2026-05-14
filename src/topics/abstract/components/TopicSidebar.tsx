import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ABSTRACT_REFERENCE_CARD_IDS,
  ABSTRACT_REFERENCE_CARD_TITLES,
} from "./ReferenceCardView";

const NAV = [
  { to: "/topics/abstract", label: "Chapter", exact: true },
  { to: "/topics/abstract/methods", label: "Methods Library" },
  { to: "/topics/abstract/playground", label: "Playground" },
  { to: "/topics/abstract/drills/d1", label: "D1 · Strip-Down" },
  { to: "/topics/abstract/drills/d2", label: "D2 · Indicators" },
  { to: "/topics/abstract/drills/d3", label: "D3 · Basic X/Y" },
  { to: "/topics/abstract/drills/d4", label: "D4 · Advanced X/Y" },
  { to: "/topics/abstract/drills/d5", label: "D5 · Jargon" },
  { to: "/topics/abstract/drills/d7", label: "D7 · Keyword Worksheet" },
  { to: "/topics/abstract/drills/d8", label: "D8 · Stem Translation" },
  { to: "/topics/abstract/flashcards", label: "Flashcards" },
];

function resolveReferenceLabel(pathname: string): string | null {
  const match = pathname.match(/\/topics\/abstract\/reference\/([^/]+)/);
  if (!match) return null;
  const id = match[1];
  return ABSTRACT_REFERENCE_CARD_TITLES[id] ?? null;
}

export function TopicSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navMatch = NAV.find((n) => location.pathname === n.to);
  const referenceLabel = resolveReferenceLabel(location.pathname);
  const activeLabel = navMatch?.label ?? referenceLabel ?? "Chapter";

  return (
    <aside className="topic-sidebar w-full md:w-64 shrink-0 border-b border-border md:border-b-0 md:border-r md:h-[calc(100vh-3rem)] md:sticky md:top-12 md:overflow-y-auto p-3">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-controls="topic-sidebar-nav"
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm md:hidden"
      >
        <span className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Abstract
          </span>
          <span className="font-medium">{activeLabel}</span>
        </span>
        <span aria-hidden="true" className="text-xs text-muted-foreground">
          {mobileOpen ? "Close" : "Menu"}
        </span>
      </button>
      <div
        id="topic-sidebar-nav"
        className={`${mobileOpen ? "block" : "hidden"} md:block`}
      >
        <h2 className="mt-3 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:mt-0">
          Abstract
        </h2>
        <nav className="mt-2 space-y-0.5 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center rounded-md px-2 py-2 md:min-h-0 md:py-1.5 ${
                  isActive
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <h3 className="mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reference
        </h3>
        <nav className="mt-1 space-y-0.5 text-sm">
          {ABSTRACT_REFERENCE_CARD_IDS.map((id) => (
            <NavLink
              key={id}
              to={`/topics/abstract/reference/${id}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-2 rounded-md px-2 py-2 md:min-h-0 md:py-1.5 ${
                  isActive
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              <span aria-hidden="true" className="font-mono text-[10px] text-muted-foreground">
                {id}
              </span>
              <span className="truncate">
                {ABSTRACT_REFERENCE_CARD_TITLES[id]}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
