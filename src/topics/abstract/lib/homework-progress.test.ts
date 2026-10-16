import { expect, it } from "vitest";
import { MODULES } from "../data/modules";
import { classroomItemMatchesBootcamp } from "@/lib/bootcamps";
import { ABSTRACT_BOOTCAMP_ID, completedModuleDays } from "./progress";
import type { BootcampState } from "../types";
const full = (): BootcampState => ({ completedLessons: MODULES.map(m => m.noteLessonId), completedDrills: MODULES.flatMap(m => m.drillIds), drillAttempts: MODULES[2].drillIds.map(drillId => ({ drillId, trapTag: "source_exercise_ungraded" })), moduleProgress: {}, cards: {}, translatorAttempts: [], gauntletAttempts: [], drillsStats: {}, aceBadges: [], xpTotal: 0, dailyStreak: 0 } as BootcampState);
it("completes all seven saved module requirements without treating written work as mastery", () => { expect(completedModuleDays(full())).toEqual([1,2,3,4,5,6,7]); });
it("does not count reviewed-only choices, old practice IDs, or local completion flags", () => {
 const state = full(); state.drillAttempts = state.drillAttempts.map(a => ({ ...a, trapTag: "source_breakdown_reviewed" }));
 state.completedDrills = state.completedDrills.filter(id => !id.startsWith("source_")); state.completedDrills.push("drill_13", "choice_18");
 state.moduleProgress = { m7: { drillComplete: true } } as unknown as BootcampState["moduleProgress"];
 expect(completedModuleDays(state)).toEqual([1,2,4]);
});
it("requires saved notes even when every question has been attempted", () => { const state=full(); state.completedLessons=[]; expect(completedModuleDays(state)).toEqual([]); });

it("syncs the registered abstraction assignment through both metadata and canonical course route", () => {
 expect(ABSTRACT_BOOTCAMP_ID).toBe("abstraction");
 expect(classroomItemMatchesBootcamp({source_id:"/topics/abstract",metadata_json:{}}, ABSTRACT_BOOTCAMP_ID)).toBe(true);
 expect(classroomItemMatchesBootcamp({source_id:null,metadata_json:{bootcamp_id:"abstraction"}}, ABSTRACT_BOOTCAMP_ID)).toBe(true);
});
