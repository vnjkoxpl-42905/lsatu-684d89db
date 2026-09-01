import type { DrillMode, FullSectionConfig, TimerConfig, TypeDrillConfig } from "@/types/drill";

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

function listParam(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function numberListParam(value: string | null): number[] {
  return listParam(value)
    .map(Number)
    .filter((n) => Number.isFinite(n));
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
      // A section is not always 35 minutes: 52.5 and 70 are the accommodated
      // clocks and `unlimited` is untimed. Reducing all of them to a number of
      // minutes would quietly re-time an accommodated sitting.
      const timerParam = searchParams.get("timer");
      const timerMode = (["52.5", "70", "custom", "unlimited"] as string[]).includes(
        timerParam ?? "",
      )
        ? (timerParam as TimerConfig["mode"])
        : undefined;
      const config: FullSectionConfig = {
        pt,
        section,
        timer: {
          mode: timerMode ?? (minutes ? "custom" : "35"),
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

  // Smart Drill carries no configuration at all, and must not be handed an
  // empty one: the state-launched form has never had a `config`, and the two
  // forms have to resolve identically now that the gate writes this one.
  if (urlMode === "adaptive") {
    return {
      mode: "adaptive",
      returnTo: safeReturnTo(searchParams.get("returnTo")),
      sealed,
    };
  }

  if (urlMode) {
    const qids = (searchParams.get("qids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // A filtered drill — "six Flaw questions, medium" — is a launch the URL
    // grammar could not previously express, which is why every filtered drill
    // was state-only and died on refresh. The filter is the run's name; the
    // questions it draws live in the Run Record.
    const filterCount = positiveNumberParam(searchParams.get("count"));
    const config: TypeDrillConfig =
      qids.length === 0 && filterCount
        ? {
            qtypes: listParam(searchParams.get("qtypes")),
            difficulties: numberListParam(searchParams.get("difficulties")),
            pts: numberListParam(searchParams.get("pts")),
            // Omitted rather than empty, to match the shape the in-memory
            // launches pass. (`drillResumeKey` reads both as `[]`, so the
            // resume row is unaffected either way.)
            ...(searchParams.get("sections")
              ? { sections: numberListParam(searchParams.get("sections")) }
              : {}),
            ...(searchParams.get("qfeatures")
              ? { qfeatures: listParam(searchParams.get("qfeatures")) }
              : {}),
            count: filterCount,
          }
        : {
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
