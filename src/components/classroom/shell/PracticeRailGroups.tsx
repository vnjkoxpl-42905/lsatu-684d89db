import { Lock } from "lucide-react";

type Child = {
  label: string;
  path: string;
  isActive: (pathname: string) => boolean;
};

type Group = {
  id: "exams" | "drilling";
  label: string;
  landing: string;
  /** Any path that belongs to this group. Its sub-items show only while here. */
  owns: (pathname: string) => boolean;
  children: Child[];
};

const GROUPS: Group[] = [
  {
    id: "exams",
    label: "Practice Exams",
    landing: "/practice/exams",
    owns: (p) => p.startsWith("/practice/exams") || p.startsWith("/testing"),
    children: [
      {
        label: "Attempts",
        path: "/practice/exams/attempts",
        isActive: (p) => p.startsWith("/practice/exams/attempts"),
      },
      {
        label: "All Exams",
        path: "/practice/exams/all",
        isActive: (p) =>
          p.startsWith("/practice/exams/") && !p.startsWith("/practice/exams/attempts"),
      },
    ],
  },
  {
    id: "drilling",
    label: "Drilling",
    landing: "/practice/drills",
    owns: (p) =>
      p.startsWith("/practice/drills") ||
      p === "/classroom/drill" ||
      p === "/sets" ||
      p.startsWith("/progress/history"),
    children: [
      {
        label: "My Drills",
        path: "/practice/drills/saved",
        isActive: (p) => p.startsWith("/practice/drills/saved"),
      },
      {
        label: "History",
        path: "/progress/history",
        isActive: (p) => p.startsWith("/progress/history"),
      },
    ],
  },
];

/**
 * The Practice rail destination, drawn the way LexPrep draws it: Practice Exams
 * and Drilling are ordinary rail rows. One click goes to the page, and the
 * sub-items appear under the row while the student is inside that group. There
 * is no chevron and nothing to open by hand; leaving the group closes it.
 */
export function PracticeRailGroups({
  pathname,
  locked,
  go,
  onPrefetch,
  navClass,
}: {
  pathname: string;
  locked: boolean;
  go: (path: string) => void;
  onPrefetch?: () => void;
  navClass: (active: boolean) => string;
}) {
  return (
    <>
      {GROUPS.map((group) => {
        const owned = group.owns(pathname);
        const childActive = group.children.some((child) => child.isActive(pathname));
        // The row lights up on its own landing page. Once a sub-item is the
        // current page, the sub-item carries the highlight instead.
        const parentActive = owned && !childActive;
        return (
          <div className="classroom-nav-disclosure" key={group.id}>
            <button
              type="button"
              className={`${navClass(parentActive)}${locked ? " classroom-nav-dimmed" : ""}`}
              onClick={() => go(group.landing)}
              onMouseEnter={onPrefetch}
              onFocus={onPrefetch}
              aria-current={parentActive ? "page" : undefined}
              aria-expanded={owned}
              title={locked ? `${group.label} is locked for your account` : undefined}
            >
              {group.label}
              {locked ? (
                <>
                  <Lock className="classroom-nav-lock" aria-hidden="true" />
                  <span className="sr-only"> (locked)</span>
                </>
              ) : null}
            </button>
            {owned ? (
              <div className="classroom-nav-sub">
                {group.children.map((child) => {
                  const active = child.isActive(pathname);
                  return (
                    <button
                      key={child.path}
                      type="button"
                      className={`classroom-nav-subitem${active ? " classroom-nav-subitem-active" : ""}`}
                      onClick={() => go(child.path)}
                      aria-current={active ? "page" : undefined}
                    >
                      {child.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
