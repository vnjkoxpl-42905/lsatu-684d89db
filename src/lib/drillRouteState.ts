import type { DrillMode, FullSectionConfig, TypeDrillConfig } from "@/types/drill";

export interface DrillRouteState {
  mode?: DrillMode;
  config?: FullSectionConfig | TypeDrillConfig;
  practicingLabel?: string;
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

    return { mode: urlMode as DrillMode, config };
  }

  return (locationState || {}) as DrillRouteState;
}

export function getTimerConfigForDrillRoute(
  state: DrillRouteState | null | undefined,
): DrillTimerRouteConfig | null {
  if (state?.mode === "type-drill" && state.config) {
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
