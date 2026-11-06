import * as React from "react";
import { Bookmark, BookOpenText, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One saved set in My Sets, for Logical Reasoning and Reading Comprehension.
 *
 * Same plane as a drill-history row: a hairline divides it from its neighbours
 * and it lifts on hover. The row carries one main action (Start or Open) and at
 * most one secondary one; Rename, Duplicate and Delete live in a small menu so
 * the row reads as a name, a detail line and a button, not a wall of buttons.
 */

export type SavedSetMenuItem = {
  label: string;
  /** Spoken name, so a screen reader hears which set the item acts on. */
  ariaLabel: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

function RowMenu({ setName, items }: { setName: string; items: SavedSetMenuItem[] }) {
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div
      className="dh-more"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          root.current?.querySelector<HTMLButtonElement>(".dh-more-trigger")?.focus();
        }
      }}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="dh-more-trigger"
        aria-label={`More actions for ${setName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Button>
      {open && (
        <div className="dh-more-menu" role="menu" id={id}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="dh-more-item"
              data-destructive={item.destructive ? "true" : undefined}
              aria-label={item.ariaLabel}
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onSelect(); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SavedSetRow({
  section, title, kind, detail, saved, startLabel, startAriaLabel, onStart, startDisabled,
  secondary, menu, editing,
}: {
  section: "lr" | "rc";
  title: string;
  /** Short chip: "Exact questions", "Exact passages", "Reusable settings". */
  kind: string;
  detail: string;
  /** ISO date the set was saved, when known. */
  saved?: string;
  startLabel: string;
  startAriaLabel?: string;
  onStart: () => void;
  startDisabled?: boolean;
  secondary?: { label: string; ariaLabel: string; onSelect: () => void; disabled?: boolean };
  menu: SavedSetMenuItem[];
  /** Replaces the name and detail while the set is being renamed; the actions stay. */
  editing?: React.ReactNode;
}) {
  const date = saved ? new Date(saved) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <li className="dh-row" data-state="saved">
      <div className="dh-lead">
        <span className="dh-glyph" data-state="done" aria-hidden>
          {section === "rc" ? <BookOpenText /> : <Bookmark />}
        </span>
      </div>
      <div className="dh-main">
        {editing ?? (
          <>
            <p className="dh-title">{title}</p>
            <div className="dh-statusrow">
              <span className="dh-review" data-need="info">{kind}</span>
            </div>
            <p className="dh-detail">{detail}</p>
          </>
        )}
      </div>
      <div className="dh-side">
        {dateLabel && <time className="dh-date" dateTime={saved}>Saved {dateLabel}</time>}
        <div className="dh-actions">
          {secondary && (
            <Button size="sm" variant="ghost" aria-label={secondary.ariaLabel} disabled={secondary.disabled} onClick={secondary.onSelect}>{secondary.label}</Button>
          )}
          <Button size="sm" aria-label={startAriaLabel} disabled={startDisabled} onClick={onStart}>{startLabel}</Button>
          <RowMenu setName={title} items={menu} />
        </div>
      </div>
    </li>
  );
}
