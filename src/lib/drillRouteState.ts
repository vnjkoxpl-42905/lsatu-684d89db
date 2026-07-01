import type { DrillMode, FullSectionConfig, TypeDrillConfig } from "@/types/drill";

export interface DrillRouteState {
  mode?: DrillMode;
  config?: FullSectionConfig | TypeDrillConfig;
  practicingLabel?: string;
  /**
   * Presentation hint, independent of `mode`. When 'smart', the runner renders
   * the adaptive Smart-Drill chrome (Tutor toggle, notes, Skip/Submit footer,
   * no Complete Section) even for a fixed-queue type-drill. The Smart LR Drill
   * card sets this so a hand-picked question looks identical to the Auto run.
   */
  present?: "smart";
}

export interface DrillTimerRouteConfig {
  mode: "countdown" | "stopwatch";
  durationMs?: number;
}

export function getResolvedDrillRouteState(
  searchParams: URLSearchParams,
  locationState: unknown,
): DrillRouteState {
  const urlMode = searchParams.get("mode");
  if (urlMode) {
    const qids = (searchParams.get("qids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const config: TypeDrillConfig = {
      qtypes: [],
      difficulties: [],
      pts: [],
      count: qids.length,
      selectedQids: qids,
    };

    const present = searchParams.get("present") === "smart" ? "smart" : undefined;

    return { mode: (urlMode === "practice-set" ? "type-drill" : urlMode) as DrillMode, config, present };
  }

  const state = (locationState || {}) as DrillRouteState;
  return state.mode === "practice-set" ? { ...state, mode: "type-drill" } : state;
}

export function getTimerConfigForDrillRoute(
  state: DrillRouteState | null | undefined,
): DrillTimerRouteConfig | null {
  if ((state?.mode === "type-drill" || state?.mode === "practice-set") && state.config) {
    const config = state.config as TypeDrillConfig;
    if (config.selectedQids && config.selectedQids.length > 0) {
      return { mode: "stopwatch" };
    }
  }

  if (state?.mode === "full-section" && state.config) {
    const config = state.config as FullSectionConfig;
    const timerMode = config.timer.mode;

    if (timerMode === "unlimited") {
      return { mode: "stopwatch" };
    }

    let durationMs: number;
    switch (timerMode) {
      case "35":
        durationMs = 35 * 60 * 1000;
        break;
      case "52.5":
        durationMs = 52.5 * 60 * 1000;
        break;
      case "70":
        durationMs = 70 * 60 * 1000;
        break;
      case "custom":
        durationMs = (config.timer.customMinutes || 35) * 60 * 1000;
        break;
      default:
        durationMs = 35 * 60 * 1000;
    }

    return { mode: "countdown", durationMs };
  }

  return { mode: "stopwatch" };
}
