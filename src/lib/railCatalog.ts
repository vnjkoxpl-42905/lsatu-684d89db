import type { PermissionFlag } from "@/hooks/useUserPermissions";

// The classroom rail as data. Behavior (active state, click handlers) stays in
// ClassroomLayout, keyed by id — this file owns only what the rail contains,
// so the Account layout editor and the rail render from one source of truth.

export type RailGroupId = "classroom" | "study" | "review" | "support";

export type RailItemId =
  | "home"
  | "notes"
  | "work"
  | "drill"
  | "testing"
  | "bootcamps"
  | "activities"
  | "journal"
  | "flagged"
  | "analytics"
  | "history"
  | "admissions"
  | "messages"
  | "schedule";

export interface RailItem {
  id: RailItemId;
  label: string;
  group: RailGroupId;
  /** Empty = available to every signed-in student. */
  flags: PermissionFlag[];
  /**
   * Mirrors the `allowSignedIn` prop on this item's route. Where the route lets
   * any signed-in user through regardless of `flags`, the rail must not draw a
   * padlock from those same flags — a padlock over a route anyone can open is
   * a lie the student can disprove by typing the URL.
   *
   * Keep this in step with `src/App.tsx`. `railCatalog.test.ts` pins the pairs.
   */
  allowSignedIn?: boolean;
  /** Section items open the side list and render a › chevron when unlocked. */
  section?: boolean;
  /** Home can never be hidden — it is the guaranteed way back. */
  required?: boolean;
}

export const RAIL_GROUPS: { id: RailGroupId; title: string }[] = [
  { id: "classroom", title: "Classroom" },
  { id: "study", title: "Study" },
  { id: "review", title: "Review" },
  { id: "support", title: "Support" },
];

export const RAIL_CATALOG: RailItem[] = [
  { id: "home", label: "Home", group: "classroom", flags: ["has_classroom_access"], allowSignedIn: true, required: true },
  { id: "drill", label: "Drill", group: "classroom", flags: ["has_drill_access"] },
  // The Testing Centre is where a student sits something under test conditions:
  // one real timed section, or a full practice test. It is deliberately its own
  // rail entry rather than a tab inside Drill — drilling is practice you stop
  // and think inside, and a sitting is not, so putting them behind one door
  // invites starting a 35:00 clock by accident.
  { id: "testing", label: "Testing Centre", group: "classroom", flags: ["has_drill_access"] },
  { id: "work", label: "Assigned work", group: "classroom", flags: ["has_classroom_access"], section: true },
  { id: "notes", label: "Notes and recaps", group: "study", flags: ["has_classroom_access"], section: true },
  { id: "bootcamps", label: "Bootcamps", group: "study", flags: ["has_bootcamp_access"] },
  { id: "activities", label: "Activities", group: "study", flags: ["has_activity_access"] },
  { id: "journal", label: "Wrong answers", group: "review", flags: ["has_journal_access", "has_waj_access"], section: true },
  { id: "flagged", label: "Flagged", group: "review", flags: ["has_flagged_access"], section: true },
  { id: "analytics", label: "Analytics", group: "review", flags: ["has_analytics_access"] },
  // Reference, not a paid feature: what the schools a student is aiming at
  // actually admitted. Open to anyone signed in, like Home.
  { id: "admissions", label: "Admissions", group: "review", flags: ["has_classroom_access"], allowSignedIn: true },
  { id: "history", label: "History", group: "review", flags: ["has_analytics_access"] },
  { id: "messages", label: "Messages", group: "support", flags: ["has_chat_access"] },
  // Schedule owns booking too: one rail entry, two stage tabs (Schedule | Book
  // a session). Two adjacent Support entries for the same errand opened
  // unrelated-looking screens, and the empty Schedule had no way to book at all.
  { id: "schedule", label: "Schedule", group: "support", flags: ["has_schedule_access"], allowSignedIn: true },
];

export interface RailPrefs {
  /** Item ids in display order per group. Missing ids append in catalog order; unknown ids are dropped. */
  order: Partial<Record<RailGroupId, string[]>>;
  /** Item ids the student chose to hide. Required items are never hidden. */
  hidden: string[];
}

export function defaultRailPrefs(): RailPrefs {
  return { order: {}, hidden: [] };
}

export function normalizeRailPrefs(raw: unknown): RailPrefs {
  if (!raw || typeof raw !== "object") return defaultRailPrefs();
  const r = raw as Partial<RailPrefs>;
  const validIds = new Set(RAIL_CATALOG.map((i) => i.id));
  const order: RailPrefs["order"] = {};
  if (r.order && typeof r.order === "object") {
    for (const group of RAIL_GROUPS) {
      const list = (r.order as Record<string, unknown>)[group.id];
      if (Array.isArray(list)) {
        order[group.id] = list.filter(
          (id): id is string => typeof id === "string" && validIds.has(id as RailItemId),
        );
      }
    }
  }
  const hidden = Array.isArray(r.hidden)
    ? r.hidden.filter((id): id is string => {
        if (typeof id !== "string" || !validIds.has(id as RailItemId)) return false;
        const item = RAIL_CATALOG.find((i) => i.id === id);
        return !item?.required;
      })
    : [];
  return { order, hidden };
}

/**
 * Resolve prefs into the per-group item lists the rail renders.
 * includeHidden keeps hidden items in place (the layout editor needs them).
 */
export function resolveRailGroups(
  prefs: RailPrefs,
  opts?: { includeHidden?: boolean },
): {
  id: RailGroupId;
  title: string;
  items: RailItem[];
}[] {
  const hidden = new Set(opts?.includeHidden ? [] : prefs.hidden);
  return RAIL_GROUPS.map((group) => {
    const catalogItems = RAIL_CATALOG.filter((i) => i.group === group.id);
    const byId = new Map(catalogItems.map((i) => [i.id as string, i]));
    const ordered: RailItem[] = [];
    for (const id of prefs.order[group.id] ?? []) {
      const item = byId.get(id);
      if (item && !ordered.includes(item)) ordered.push(item);
    }
    for (const item of catalogItems) {
      if (!ordered.includes(item)) ordered.push(item);
    }
    return {
      ...group,
      items: ordered.filter((i) => i.required || !hidden.has(i.id)),
    };
  }).filter((group) => group.items.length > 0);
}
