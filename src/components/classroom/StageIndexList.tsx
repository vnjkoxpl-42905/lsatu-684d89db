import { useNavigate } from "react-router-dom";

export interface StageIndexItem {
  key: string;
  title: string;
  meta: string;
  route: string;
  /** Draws the unread dot and marks the row for assistive tech. */
  unread?: boolean;
}

/**
 * The section list, repeated inside the stage for narrow windows.
 *
 * The third column that normally holds this list is hidden below 1280px, and
 * below 1400px for Wrong answers, where it collapses behind a trigger that
 * reads as nothing more than a section title. At those widths every index
 * route was telling the student to "choose an entry from the list" while no
 * list was anywhere on screen — which covers a 13" laptop and any window with
 * a panel docked.
 *
 * Both copies are always rendered and CSS shows exactly one, so there is no
 * width measured in JS and nothing to re-run on resize. `display: none` also
 * keeps the hidden copy out of the accessibility tree, so it is not read twice.
 */
export function StageIndexList({
  items,
  label,
  heading,
}: {
  items: StageIndexItem[];
  label: string;
  /** Optional group label, shown only when a page renders more than one list. */
  heading?: string;
}) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  return (
    <nav className="classroom-stage-index" aria-label={label}>
      {heading ? (
        <p className="classroom-stage-index-heading">{heading}</p>
      ) : null}
      {items.map((item) => (
        <button
          type="button"
          key={item.key}
          className="classroom-panel-item"
          onClick={() => navigate(item.route)}
        >
          <h3>
            {item.unread ? (
              <span className="classroom-unread-dot" aria-hidden="true" />
            ) : null}
            {item.title}
            {item.unread ? <span className="sr-only"> (unread)</span> : null}
          </h3>
          <time>{item.meta}</time>
        </button>
      ))}
    </nav>
  );
}

/** The "choose from the list" line, shown only where the list column exists. */
export function StageIndexHint({ children }: { children: React.ReactNode }) {
  return <p className="classroom-empty-copy classroom-stage-index-hint">{children}</p>;
}

export function shortDate(iso: string | null | undefined, fallback = "") {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString("en-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
