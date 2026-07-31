import { describe, expect, it } from "vitest";
import {
  getResolvedDrillRouteState,
  getTimerConfigForDrillRoute,
} from "./drillRouteState";
import type { FullSectionConfig, TypeDrillConfig } from "@/types/drill";

describe("drill route state helpers", () => {
  it("builds type-drill state from URL mode and qids", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=type-drill&qids=PT118-S4-Q1,PT118-S4-Q2"),
      null,
    );

    expect(state.mode).toBe("type-drill");
    expect((state.config as TypeDrillConfig).selectedQids).toEqual([
      "PT118-S4-Q1",
      "PT118-S4-Q2",
    ]);
  });

  it("carries present=smart from the URL for Smart LR Drill hand-picks", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=type-drill&qids=PT118-S4-Q1&present=smart&returnTo=%2Fclassroom"),
      null,
    );

    expect(state.mode).toBe("type-drill");
    expect((state.config as TypeDrillConfig).selectedQids).toEqual(["PT118-S4-Q1"]);
    expect(state.present).toBe("smart");
    expect(state.returnTo).toBe("/classroom");
  });

  it("normalizes legacy practice-set URL launches to type-drill selected qids", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=practice-set&qids=PT118-S4-Q1,PT118-S4-Q2"),
      null,
    );

    expect(state.mode).toBe("type-drill");
    expect((state.config as TypeDrillConfig).selectedQids).toEqual([
      "PT118-S4-Q1",
      "PT118-S4-Q2",
    ]);
  });

  it("normalizes legacy practice-set location state to type-drill", () => {
    const config: TypeDrillConfig = {
      qtypes: [],
      difficulties: [],
      pts: [],
      count: 1,
      selectedQids: ["PT118-S4-Q1"],
    };

    const state = getResolvedDrillRouteState(new URLSearchParams(), {
      mode: "practice-set",
      config,
    });

    expect(state.mode).toBe("type-drill");
    expect((state.config as TypeDrillConfig).selectedQids).toEqual(["PT118-S4-Q1"]);
  });

  it("leaves present undefined when the param is absent", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=type-drill&qids=PT118-S4-Q1"),
      null,
    );

    expect(state.present).toBeUndefined();
  });

  it("preserves a safe returnTo from location state", () => {
    const config: TypeDrillConfig = {
      qtypes: [],
      difficulties: [],
      pts: [],
      count: 1,
      selectedQids: ["PT118-S4-Q1"],
    };

    const state = getResolvedDrillRouteState(new URLSearchParams(), {
      mode: "type-drill",
      config,
      returnTo: "/classroom/drill?stage=type-drill",
    });

    expect(state.returnTo).toBe("/classroom/drill?stage=type-drill");
  });

  it("drops unsafe returnTo values", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=type-drill&qids=PT118-S4-Q1&returnTo=https%3A%2F%2Fevil.example"),
      null,
    );

    expect(state.returnTo).toBeUndefined();
  });

  it("uses a stopwatch for URL-launched type drills with explicit qids", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=type-drill&qids=PT118-S4-Q1"),
      null,
    );

    expect(getTimerConfigForDrillRoute(state)).toEqual({ mode: "stopwatch" });
  });

  it("uses guided drill estimated minutes as a countdown timer", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=type-drill&qids=PT118-S4-Q1&guided=1&guidedDurationMinutes=60"),
      null,
    );

    expect(state.isGuidedDrill).toBe(true);
    expect(state.guidedDurationMinutes).toBe(60);
    expect(getTimerConfigForDrillRoute(state)).toEqual({
      mode: "countdown",
      durationMs: 60 * 60 * 1000,
    });
  });

  it("preserves countdown timers for state-launched full sections", () => {
    const config: FullSectionConfig = {
      pt: 118,
      section: 4,
      timer: {
        mode: "35",
        isPaused: false,
        elapsedMs: 0,
        startedAt: 0,
      },
    };

    expect(
      getTimerConfigForDrillRoute({
        mode: "full-section",
        config,
      }),
    ).toEqual({ mode: "countdown", durationMs: 35 * 60 * 1000 });
  });
});
