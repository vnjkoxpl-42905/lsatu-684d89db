export type PresetId = "default" | "minimal" | "power" | "custom";

export interface LayoutPrefs {
  preset: PresetId;
  orbital: string[];
  dock: string[];
  sidebar: string[];
}

// Student-facing default. Admin-only sidebar entries (/teacher,
// /teacher/reference-library) are intentionally excluded so admin ids are not
// seeded into every student layout.
//
// NOTE: the only consumer of this module was MainhubSidebar, deleted with the
// rest of the StudentShell chrome on 2026-08-03. The classroom rail has its own
// prefs (`railCatalog` + `useRailPrefs`), so this and `useLayoutPrefs` are now
// dead. Left in place pending a decision on removing them.
const DEFAULT_SIDEBAR = [
  "/classroom",
  "/bootcamps",
  "/inbox",
  "/journal",
  "/schedule",
];

export const PRESETS: Record<Exclude<PresetId, "custom">, LayoutPrefs> = {
  default: {
    preset: "default",
    orbital: ["resume", "analytics", "waj"],
    dock: [],
    sidebar: DEFAULT_SIDEBAR,
  },
  minimal: {
    preset: "minimal",
    orbital: ["resume", "analytics", "waj"],
    dock: ["inbox"],
    sidebar: DEFAULT_SIDEBAR,
  },
  power: {
    preset: "power",
    orbital: ["resume", "analytics", "waj"],
    dock: [
      "inbox",
      "schedule",
      "notifications",
      "profile",
      "settings",
    ],
    sidebar: DEFAULT_SIDEBAR,
  },
};

export function getPreset(id: Exclude<PresetId, "custom">): LayoutPrefs {
  return JSON.parse(JSON.stringify(PRESETS[id]));
}

/**
 * Returns the Default-preset slice for a single surface. Used by
 * /settings/layout's per-surface "Reset" link so the user can revert
 * one surface without nuking the others.
 */
export function defaultForSurface(surface: "orbital" | "dock" | "sidebar"): string[] {
  return [...PRESETS.default[surface]];
}

export function defaultLayout(): LayoutPrefs {
  return getPreset("default");
}

// Strict equality on the three lists; preset stays "default"/"minimal"/"power"
// only when the user's current layout matches that preset exactly.
export function detectPreset(prefs: LayoutPrefs): PresetId {
  for (const id of ["default", "minimal", "power"] as const) {
    const p = PRESETS[id];
    if (
      arrayEq(prefs.orbital, p.orbital) &&
      arrayEq(prefs.dock, p.dock) &&
      arrayEq(prefs.sidebar, p.sidebar)
    ) {
      return id;
    }
  }
  return "custom";
}

function arrayEq(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
