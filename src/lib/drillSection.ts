/**
 * Which section of the drill hub a student is looking at.
 *
 * The hub is one page with two sections, LR and RC, chosen by the toggle in
 * its tools row. Section is URL state (`?section=rc`), not component state, so
 * a refresh, a Back press, or a shared link all land where the student was.
 * The last section is remembered per browser and applied ONLY when the URL is
 * silent — a deep link always outranks the remembered value.
 */
export type DrillSection = "lr" | "rc";

export const DRILL_SECTION_PARAM = "section";
export const DRILL_SECTION_STORAGE_KEY = "lsatu.drill.section";

/** `rc` and nothing else. Anything unrecognised is LR, never an error. */
export function parseDrillSection(value: string | null | undefined): DrillSection | null {
  if (value == null) return null;
  const v = value.trim().toLowerCase();
  if (v === "rc") return "rc";
  if (v === "lr") return "lr";
  return null;
}

/**
 * Storage is wrapped because it throws outright in Safari private mode and in
 * a sandboxed iframe — a remembered preference is never worth a blank page.
 */
export function readRememberedSection(): DrillSection | null {
  try {
    return parseDrillSection(window.localStorage.getItem(DRILL_SECTION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function rememberSection(section: DrillSection): void {
  try {
    window.localStorage.setItem(DRILL_SECTION_STORAGE_KEY, section);
  } catch {
    /* no-op: see readRememberedSection */
  }
}

/**
 * The one resolution rule: an explicit `?section=` wins, then the remembered
 * value, then LR. A student who has never chosen lands on LR every time — the
 * toggle is the discovery, and the page never moves under them.
 *
 * "Present but unrecognised" is NOT the same as absent. A link that says
 * `?section=sideways` has stated a section, badly; honouring the browser's
 * remembered RC there would open a section the link did not ask for. Any
 * stated section that is not RC resolves to LR, which is what the spec says
 * and what a malformed link should get.
 */
export function resolveDrillSection(param: string | null | undefined): DrillSection {
  const stated = param != null && param.trim() !== "";
  if (stated) return parseDrillSection(param) ?? "lr";
  return readRememberedSection() ?? "lr";
}

export const DRILL_SECTION_LABELS: Record<DrillSection, { short: string; full: string; route: string }> = {
  lr: { short: "LR", full: "Logical Reasoning", route: "DRILL / LOGICAL REASONING" },
  rc: { short: "RC", full: "Reading Comprehension", route: "DRILL / READING COMPREHENSION" },
};
