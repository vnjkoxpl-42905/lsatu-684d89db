import { NavLink } from "react-router-dom";
import { ABSTRACT_REFERENCE_CARD_IDS } from "./ReferenceCardView";

const NAV = [
  { to: "/topics/abstract", label: "Chapter", exact: true },
  { to: "/topics/abstract/playground", label: "Playground" },
  { to: "/topics/abstract/drills/d1", label: "D1 · Strip-Down" },
  { to: "/topics/abstract/drills/d2", label: "D2 · Indicators" },
  { to: "/topics/abstract/drills/d3", label: "D3 · Basic X/Y" },
  { to: "/topics/abstract/drills/d4", label: "D4 · Advanced X/Y" },
  { to: "/topics/abstract/drills/d5", label: "D5 · Jargon" },
  { to: "/topics/abstract/flashcards", label: "Flashcards" },
];

export function TopicSidebar() {
  return (
    <aside className="topic-sidebar w-full md:w-64 shrink-0 border-r border-border md:h-[calc(100vh-3rem)] md:sticky md:top-12 overflow-y-auto p-3">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Abstract
      </h2>
      <nav className="mt-2 space-y-0.5 text-sm">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.exact}
            className={({ isActive }) =>
              `block rounded-md px-2 py-1.5 ${
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
            className={({ isActive }) =>
              `block rounded-md px-2 py-1.5 font-mono text-xs ${
                isActive
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`
            }
          >
            {id}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
