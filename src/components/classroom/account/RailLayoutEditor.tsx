import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useRailPrefs } from "@/hooks/useRailPrefs";
import {
  defaultRailPrefs,
  resolveRailGroups,
  type RailItem,
  type RailPrefs,
} from "@/lib/railCatalog";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { railItemLocked } from "@/lib/destinationAccess";

// The sidebar layout editor. Changes save as they are made — rail order is a
// low-stakes preference, so there is no draft/Save/Discard state to lose.

export default function RailLayoutEditor() {
  const { projectedPrefs: prefs, save, saving, loading, error, retry, canSave, ownerId } = useRailPrefs();
  const permissions = useUserPermissions();
  const [justSaved, setJustSaved] = React.useState(false);
  const savedTimer = React.useRef<number | null>(null);
  const ownerRef = React.useRef(ownerId);
  ownerRef.current = ownerId;

  React.useEffect(() => {
    setJustSaved(false);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
  }, [ownerId]);

  React.useEffect(() => {
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, []);

  const commit = async (next: RailPrefs) => {
    const savingOwner = ownerId;
    setJustSaved(false);
    try {
      await save(next);
      if (ownerRef.current !== savingOwner) return;
      setJustSaved(true);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setJustSaved(false), 1600);
    } catch {
      if (ownerRef.current !== savingOwner) return;
      toast.error("Could not save your layout. Please try again.");
    }
  };

  // Same predicate as the live rail, so the preview never padlocks a
  // destination the sidebar draws open (or the reverse).
  const unlocked = (item: RailItem) => !railItemLocked(item.id, permissions);

  const groups = resolveRailGroups(prefs, { includeHidden: true });
  const hiddenSet = new Set(prefs.hidden);

  const move = (groupId: string, ids: string[], idx: number, delta: -1 | 1) => {
    const j = idx + delta;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[idx], next[j]] = [next[j], next[idx]];
    void commit({
      ...prefs,
      order: { ...prefs.order, [groupId]: next },
    });
  };

  const toggleHidden = (item: RailItem) => {
    if (item.required) return;
    const hidden = hiddenSet.has(item.id)
      ? prefs.hidden.filter((id) => id !== item.id)
      : [...prefs.hidden, item.id];
    void commit({ ...prefs, hidden });
  };

  const isDefault =
    Object.values(prefs.order).every((list) => !list || list.length === 0) &&
    prefs.hidden.length === 0;

  return (
    <div className="classroom-account-grid">
      <div className="classroom-account-main">
        <div className="classroom-account-toolbar">
          <p>Choose what shows in your sidebar and in what order.</p>
          <div className="classroom-account-toolbar-actions">
            <span
              className={`classroom-account-savestate${saving || justSaved ? " classroom-account-savestate-visible" : ""}`}
              aria-live="polite"
            >
              {saving ? (
                <>
                  <Loader2 size={12} className="classroom-spin" aria-hidden="true" />
                  Saving
                </>
              ) : justSaved ? (
                <>
                  <Check size={12} aria-hidden="true" />
                  Saved
                </>
              ) : null}
            </span>
            {!isDefault ? (
              <button
                type="button"
                className="classroom-account-ghost-button"
                onClick={() => void commit(defaultRailPrefs())}
                disabled={!canSave}
              >
                <RotateCcw size={12} aria-hidden="true" />
                Reset to default
              </button>
            ) : null}
          </div>
        </div>

        {loading ? <p role="status">Loading your saved sidebar layout.</p> : null}
        {error ? (
          <div role="alert">
            <p>Your saved sidebar layout could not be verified. Reload it before editing.</p>
            <button type="button" className="classroom-account-ghost-button" onClick={() => void retry()}>Try again</button>
          </div>
        ) : null}

        {groups.map((group) => {
          const ids = group.items.map((i) => i.id as string);
          return (
            <section className="classroom-account-card" key={group.id}>
              <header className="classroom-account-card-head">
                <h2>{group.title}</h2>
              </header>
              <ul className="classroom-account-rows">
                {group.items.map((item, idx) => {
                  const isHidden = hiddenSet.has(item.id);
                  return (
                    <li className="classroom-account-row" key={item.id}>
                      <span className="classroom-account-row-arrows">
                        <button
                          type="button"
                          onClick={() => move(group.id, ids, idx, -1)}
                          disabled={idx === 0 || !canSave}
                          aria-label={`Move ${item.label} up`}
                        >
                          <ChevronUp size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(group.id, ids, idx, 1)}
                          disabled={idx === ids.length - 1 || !canSave}
                          aria-label={`Move ${item.label} down`}
                        >
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                      </span>
                      <span
                        className={`classroom-account-row-label${isHidden ? " classroom-account-row-hidden" : ""}`}
                      >
                        {item.label}
                        {!unlocked(item) ? (
                          <Lock
                            size={11}
                            className="classroom-account-row-lock"
                            aria-label="Locked for your account"
                          />
                        ) : null}
                      </span>
                      {item.required ? (
                        <span className="classroom-account-row-note">
                          Always shown
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="classroom-account-eye"
                          onClick={() => toggleHidden(item)}
                          disabled={!canSave}
                          aria-pressed={!isHidden}
                          aria-label={
                            isHidden ? `Show ${item.label}` : `Hide ${item.label}`
                          }
                          title={isHidden ? "Show" : "Hide"}
                        >
                          {isHidden ? (
                            <EyeOff size={14} aria-hidden="true" />
                          ) : (
                            <Eye size={14} aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className="classroom-account-side" aria-label="Sidebar preview">
        <div className="classroom-account-card classroom-account-preview">
          <header className="classroom-account-card-head">
            <h2>Preview</h2>
          </header>
          <div className="classroom-account-preview-rail">
            {resolveRailGroups(prefs).map((group) => (
              <div className="classroom-nav-group" key={group.id}>
                <b>{group.title}</b>
                {group.items.map((item) => (
                  <span
                    className={`classroom-nav${unlocked(item) ? "" : " classroom-nav-locked"}`}
                    key={item.id}
                  >
                    {item.label}
                    {item.section && unlocked(item) ? <em>›</em> : null}
                    {!unlocked(item) ? (
                      <Lock className="classroom-nav-lock" aria-hidden="true" />
                    ) : null}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="classroom-account-preview-note">
            Locked items unlock as parts of the course open up. Hiding an item
            here never removes your access.
          </p>
        </div>
      </aside>
    </div>
  );
}
