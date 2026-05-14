import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ABSTRACT_REFERENCE_CARD_IDS,
  ABSTRACT_REFERENCE_CARD_TITLES,
} from "./ReferenceCardView";

interface NavItem {
  to: string;
  label: string;
  num: string;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { to: "/topics/abstract", label: "Chapter", num: "00", exact: true },
  { to: "/topics/abstract/methods", label: "Methods Library", num: "—" },
  { to: "/topics/abstract/drills/d1", label: "Abstract Language", num: "D1" },
  { to: "/topics/abstract/drills/d2", label: "Translation Buckets", num: "D2" },
  { to: "/topics/abstract/drills/d3", label: "Basic X/Y", num: "D3" },
  { to: "/topics/abstract/drills/d4", label: "Advanced X/Y", num: "D4" },
  { to: "/topics/abstract/drills/d5", label: "Jargon", num: "D5" },
  { to: "/topics/abstract/drills/d7", label: "Keyword Worksheet", num: "D7" },
  { to: "/topics/abstract/drills/d8", label: "Stem Translation", num: "D8" },
  { to: "/topics/abstract/flashcards", label: "Flashcards", num: "—" },
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
    <aside className="topic-sidebar w-full md:w-72 shrink-0 border-b border-border md:border-b-0 md:border-r md:h-[calc(100vh-3rem)] md:sticky md:top-12 md:overflow-y-auto p-4 md:p-6">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-controls="topic-sidebar-nav"
        className="codex-btn-ghost flex min-h-11 w-full items-center justify-between gap-2 md:hidden"
      >
        <span className="flex flex-col items-start gap-0.5">
          <span className="codex-eyebrow">Abstract · Codex</span>
          <span className="codex-display text-base">{activeLabel}</span>
        </span>
        <span aria-hidden="true" className="codex-eyebrow">
          {mobileOpen ? "Close" : "Menu"}
        </span>
      </button>
      <div
        id="topic-sidebar-nav"
        className={`${mobileOpen ? "block" : "hidden"} md:block`}
      >
        <header className="mt-4 md:mt-0">
          <p className="codex-eyebrow">Bootcamp</p>
          <h2 className="codex-display mt-1 text-2xl leading-tight">Abstract</h2>
          <p
            className="codex-marginalia mt-2"
            style={{ fontStyle: "normal" }}
          >
            The translation codex.
          </p>
        </header>

        <hr className="codex-rule" />

        <p className="codex-eyebrow mb-2">Topics</p>
        <nav className="codex-toc space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `codex-toc-item ${isActive ? "active" : ""} min-h-11 md:min-h-0`
              }
            >
              <span className="codex-toc-num">{n.num}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <hr className="codex-rule" />

        <p className="codex-eyebrow mb-2">Reference</p>
        <nav className="codex-toc space-y-0.5">
          {ABSTRACT_REFERENCE_CARD_IDS.map((id) => (
            <NavLink
              key={id}
              to={`/topics/abstract/reference/${id}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `codex-toc-item ${isActive ? "active" : ""} min-h-11 md:min-h-0`
              }
            >
              <span className="codex-toc-num">{id}</span>
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
