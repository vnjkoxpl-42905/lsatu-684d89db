import { expect, it } from "vitest";
import { getModule, LECTURE_MODULES } from "../data/modules";
import { APPLIED_SOURCE_QUESTIONS } from "../data/appliedSourceQuestions";
import { LECTURE_DRILL_IDS } from "../data/modules";
import { DRILLS } from "../data/mockData";
import { computeProgress, recommendNext } from "./progress";
import type { BootcampState } from "../types";
it("keeps the seven-module course visible while preserving its registry", () => {
  expect(LECTURE_MODULES.map((m) => m.id)).toEqual(["m1", "m2", "m3", "m4", "m5", "m6", "m7"]);
  expect(getModule("m4")?.name).toBe("Match To The Stimulus");
  expect(getModule("m7")?.name).toBe("Put It Together");
});
it("counts the visible course requirements but never requires a separate final set", () => {
  const state = { completedLessons: LECTURE_MODULES.map((m) => m.noteLessonId).concat(["historical_note"]), completedDrills: DRILLS.map((d) => d.id), drillAttempts: Array.from({ length: 15 }, (_, n) => ({ drillId: `choice_${n + 1}`, trapTag: "source_exercise_ungraded" })), translatorAttempts: [], gauntletAttempts: [], cards: {}, finalSetScore: { score: 20, total: 20 } } as unknown as BootcampState;
  const progress = computeProgress(state);
  expect(progress.lessons).toMatchObject({ done: 7, total: 7 });
  expect(progress.drills).toMatchObject({ done: [...LECTURE_DRILL_IDS].filter(id => !id.startsWith("choice_") && !id.startsWith("source_")).length, total: 8 });
  expect(progress.gauntlet.total).toBe(APPLIED_SOURCE_QUESTIONS.length); expect(progress.finalSet.total).toBe(0);
  expect(progress.overallPct).toBe(100);
  expect(recommendNext(progress).label).toBe("The 15 answer choices");
  expect(state.finalSetScore).toEqual({ score: 20, total: 20 });
});
