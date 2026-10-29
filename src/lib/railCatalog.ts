import type { PermissionFlag } from "@/hooks/useUserPermissions";

export type RailGroupId = "classroom";
export type RailItemId = "home" | "my-work" | "practice" | "review" | "progress" | "library" | "schedule";

export interface RailItem {
  id: RailItemId;
  label: string;
  group: RailGroupId;
  flags: PermissionFlag[];
  allowSignedIn?: boolean;
  requireAdmin?: boolean;
  section?: boolean;
  required?: boolean;
}

export const RAIL_GROUPS: { id: RailGroupId; title: string }[] = [
  { id: "classroom", title: "Classroom" },
];

// Each destination stays visible, including while its contents are locked.
// Every tab and deep route applies its own permission gate.
export const RAIL_CATALOG: RailItem[] = [
  { id: "home", label: "Home", group: "classroom", flags: ["has_classroom_access"], allowSignedIn: true, required: true },
  { id: "my-work", label: "My Work", group: "classroom", flags: ["has_classroom_access"] },
  { id: "practice", label: "Practice", group: "classroom", flags: ["has_drill_access", "has_practice_access"], allowSignedIn: true },
  { id: "review", label: "Review", group: "classroom", flags: ["has_journal_access", "has_flagged_access"], allowSignedIn: true },
  { id: "library", label: "Library", group: "classroom", flags: ["has_activity_access", "has_bootcamp_access"], allowSignedIn: true },
  { id: "schedule", label: "Schedule", group: "classroom", flags: ["has_schedule_access"], allowSignedIn: true },
];

export interface RailPrefs {
  order: Partial<Record<RailGroupId, string[]>>;
  hidden: string[];
  reviewHub?: true;
}

export function defaultRailPrefs(): RailPrefs {
  return { order: {}, hidden: [] };
}

const LEGACY_DESTINATION: Record<string, RailItemId> = {
  home: "home",
  "my-work": "my-work",
  work: "my-work",
  notes: "my-work",
  drill: "practice",
  practice: "practice",
  testing: "practice",
  journal: "review",
  flagged: "review",
  review: "review",
  analytics: "progress",
  progress: "progress",
  history: "progress",
  bootcamps: "library",
  library: "library",
  activities: "library",
  admissions: "library",
  schedule: "schedule",
};

export function normalizeRailPrefs(raw: unknown): RailPrefs {
  if (!raw || typeof raw !== "object") return defaultRailPrefs();
  const source = raw as Partial<RailPrefs>;
  const valid = new Set([...RAIL_CATALOG.map((item) => item.id), 'progress']);
  const order = Array.isArray(source.order?.classroom)
    ? [...new Set(source.order.classroom)].filter((id): id is RailItemId => typeof id === "string" && valid.has(id as RailItemId))
    : [];
  const hidden = Array.isArray(source.hidden)
    ? [...new Set(source.hidden)].filter((id): id is RailItemId => typeof id === "string" && valid.has(id as RailItemId) && id !== "home")
    : [];
  return { order: order.length ? { classroom: order } : {}, hidden, ...(source.reviewHub === true ? { reviewHub: true as const } : {}) };
}

const LEGACY_ORDER: Record<string, string[]> = {
  classroom: ["home", "drill", "testing", "work"],
  study: ["notes", "bootcamps", "activities"],
  review: ["review", "analytics", "admissions", "history"],
  support: ["messages", "schedule"],
};
const OLD_MEMBERS: Partial<Record<RailItemId, string[]>> = {
  "my-work": ["work", "notes"],
  practice: ["drill", "testing"],
  review: ["review"],
  progress: ["analytics", "history"],
  library: ["bootcamps", "activities", "admissions"],
  schedule: ["schedule"],
};

/** One-time migration from layout_prefs.classroom_rail to classroom_rail_v2. */
export function migrateLegacyRailPrefs(raw: unknown): RailPrefs {
  if (!raw || typeof raw !== "object") return defaultRailPrefs();
  const source = raw as { order?: Record<string, unknown>; hidden?: unknown };
  const oldHidden = new Set(Array.isArray(source.hidden) ? source.hidden.filter((id): id is string => typeof id === "string") : []);
  const seen = new Set<RailItemId>();
  const order: RailItemId[] = [];
  for (const [group, defaults] of Object.entries(LEGACY_ORDER)) {
    const preferred = Array.isArray(source.order?.[group]) ? source.order[group] as string[] : [];
    for (const oldId of [...preferred, ...defaults]) {
      if (oldHidden.has(oldId)) continue;
      const id = LEGACY_DESTINATION[oldId];
      if (id && !seen.has(id)) { seen.add(id); order.push(id); }
    }
  }
  const hidden = [...RAIL_CATALOG, { id: "progress" as RailItemId, required: false }].filter((item) => {
    const members = item.id === "review" && (oldHidden.has("journal") || oldHidden.has("flagged")) && !oldHidden.has("review")
      ? ["journal", "flagged"]
      : OLD_MEMBERS[item.id] ?? [];
    return !item.required && members.length > 0 && members.every((member) => oldHidden.has(member));
  }).map((item) => item.id);
  return normalizeRailPrefs({ order: { classroom: order }, hidden });
}

export function resolveRailGroups(prefs: RailPrefs, _opts?: { includeHidden?: boolean }) {
  prefs = projectReviewRailPrefs(prefs);
  const ordered: RailItem[] = [];
  for (const id of prefs.order.classroom ?? []) {
    const item = RAIL_CATALOG.find((candidate) => candidate.id === id);
    if (item && !ordered.includes(item)) ordered.push(item);
  }
  for (const item of RAIL_CATALOG) {
    if (!ordered.includes(item)) ordered.push(item);
  }
  const hidden = new Set(_opts?.includeHidden ? [] : prefs.hidden);
  return [{ ...RAIL_GROUPS[0], items: ordered.filter((item) => item.required || !hidden.has(item.id)) }];
}

/** Read-only projection. Keep legacy raw prefs for guarded writes and initial landing. */
export function projectReviewRailPrefs(raw: RailPrefs): RailPrefs {
  const prefs = normalizeRailPrefs(raw);
  const hidden = prefs.hidden.filter((id) => id !== 'review' && id !== 'progress');
  if (prefs.hidden.includes('review') && (prefs.reviewHub || prefs.hidden.includes('progress'))) hidden.push('review');
  const order = [...new Set((prefs.order.classroom ?? []).map((id) => id === 'progress' ? 'review' : id))];
  return { order: order.length ? { classroom: order } : {}, hidden, reviewHub: true };
}

export function reviewRailLanding(prefs: RailPrefs, analyticsAllowed: boolean): string {
  return !prefs.reviewHub && prefs.hidden.includes('review') && !prefs.hidden.includes('progress') && analyticsAllowed
    ? '/review/progress' : '/review/to-review';
}
