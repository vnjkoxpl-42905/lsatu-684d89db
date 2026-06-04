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

  it("uses a stopwatch for URL-launched type drills with explicit qids", () => {
    const state = getResolvedDrillRouteState(
      new URLSearchParams("mode=type-drill&qids=PT118-S4-Q1"),
      null,
    );

    expect(getTimerConfigForDrillRoute(state)).toEqual({ mode: "stopwatch" });
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
