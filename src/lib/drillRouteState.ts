import type { DrillMode, FullSectionConfig, TypeDrillConfig } from "@/types/drill";

export interface DrillRouteState {
  mode?: DrillMode;
  config?: FullSectionConfig | TypeDrillConfig;
  practicingLabel?: string;
  returnTo?: string;
  /** True when the runner is launched from a Guided Drill assignment. */
  isGuidedDrill?: boolean;
  guidedDurationMinutes?: number;
  /**
   * Presentation hint, independent of `mode`. When 'smart', the runner renders
   * the adaptive Smart-Drill chrome (Tutor toggle, notes, Skip/Submit footer,
   * no Complete Section) even for a fixed-queue type-drill. The Smart LR Drill
   * card sets this so a hand-picked question looks identical to the Auto run.
   */
  present?: "smart";
  /**
   * Seals the run: Answer and Explanation are not rendered at all, for the
   * whole session, for every question.
   *
   * This is NOT the full-section gate below it, which only withholds a reveal
   * until the question has been attempted and then hands it over. A sealed run
   * never hands it over. It exists because a section assigned as a measurement
   * stops measuring the moment the student can check question 3 before
   * answering question 4, and an honour-system instruction is not a control.
   *
   * Set from `?sealed=1` at launch. It is deliberately a launch property and
   * not a student setting: the person who assigns the section decides.
   */
  sealed?: boolean;
}


export interface DrillTimerRouteConfig {
  mode: "countdown" | "stopwatch";
  durationMs?: number;
}

function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

function positiveNumberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function getResolvedDrillRouteState(
  searchParams: URLSearchParams,
  locationState: unknown,
): DrillRouteState {
  const urlMode = searchParams.get("mode");
  const sealed = searchParams.get("sealed") === "1";

  // A real section, launched from a link. Everything else about a full section
  // already worked; only the launch did not, and it was reachable solely as
  // router state. That made an assigned section impossible to hand over as a
  // URL, which is what a Classroom item is.
  if (urlMode === "full-section") {
    const pt = positiveNumberParam(searchParams.get("pt"));
    const section = positiveNumberParam(searchParams.get("section"));
    if (pt && section) {
      const minutes = positiveNumberParam(searchParams.get("minutes"));
      const config: FullSectionConfig = {
        pt,
        section,
        timer: {
          mode: minutes ? "custom" : "35",
          customMinutes: minutes,
          isPaused: false,
          elapsedMs: 0,
          startedAt: Date.now(),
        },
      };
      return {
        mode: "full-section",
        config,
        returnTo: safeReturnTo(searchParams.get("returnTo")),
        practicingLabel: searchParams.get("label") || undefined,
        sealed,
      };
    }
  }

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
    const returnTo = safeReturnTo(searchParams.get("returnTo"));
    const isGuidedDrill = searchParams.get("guided") === "1" || !!searchParams.get("guidedAssignmentId");
    const guidedDurationMinutes = positiveNumberParam(searchParams.get("guidedDurationMinutes"));

    return {
      mode: (urlMode === "practice-set" ? "type-drill" : urlMode) as DrillMode,
      config,
      present,
      returnTo,
      isGuidedDrill,
      guidedDurationMinutes,
      sealed,
    };
  }

  const state = (locationState || {}) as DrillRouteState;
  const returnTo = safeReturnTo(state.returnTo);
  const normalized: DrillRouteState =
    state.mode === "practice-set" ? { ...state, mode: "type-drill" as DrillMode } : state;
  return { ...normalized, returnTo, sealed: normalized.sealed ?? sealed };
}

export function getTimerConfigForDrillRoute(
  state: DrillRouteState | null | undefined,
): DrillTimerRouteConfig | null {
  if (state?.isGuidedDrill && state.guidedDurationMinutes) {
    return { mode: "countdown", durationMs: state.guidedDurationMinutes * 60 * 1000 };
  }

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
