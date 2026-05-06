export type PresetId = "default" | "minimal" | "power" | "custom";

export interface LayoutPrefs {
  preset: PresetId;
  orbital: string[];
  dock: string[];
  sidebar: string[];
}

const DEFAULT_SIDEBAR = [
  "/classroom",
  "/inbox",
  "/waj",
  "/flagged",
  "/practice",
  "/bootcamps",
  "/analytics",
  "/schedule",
  "/admin/homework",
  "/teacher",
];

export const PRESETS: Record<Exclude<PresetId, "custom">, LayoutPrefs> = {
  default: {
    preset: "default",
    orbital: ["smart-drill", "resume", "find"],
    dock: ["teacher", "whiteboard", "help"],
    sidebar: DEFAULT_SIDEBAR,
  },
  minimal: {
    preset: "minimal",
    orbital: ["resume"],
    dock: ["inbox", "help"],
    sidebar: ["/classroom", "/practice", "/bootcamps", "/inbox"],
  },
  power: {
    preset: "power",
    orbital: ["smart-drill", "resume", "find"],
    dock: [
      "teacher",
      "whiteboard",
      "ask-joshua",
      "inbox",
      "schedule",
      "notifications",
      "profile",
      "settings",
      "help",
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
