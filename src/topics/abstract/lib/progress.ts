import { bootcampIdFromRoute } from "@/lib/bootcamps";
export const ABSTRACT_BOOTCAMP_ID = bootcampIdFromRoute("/topics/abstract");
// Progress roll-up helpers used by the Dashboard and Sidebar to reduce
// raw bootcamp state into per-surface percentages and an overall weighted
// completion number. Centralised here so the same weights apply across
// surfaces and the weights stay easy to tune.

import { LESSONS, DRILLS, FLASHCARDS } from "../data/mockData";
import { ANSWER_CHOICE_ITEMS } from "../data/answerChoiceDrill";
import { APPLIED_SOURCE_QUESTIONS } from "../data/appliedSourceQuestions";
import type { BootcampState } from "../types";
import { sourceExerciseIds } from "./grading-status";
import { LECTURE_DRILL_IDS, LECTURE_LESSON_IDS, MODULES, getModule, type ModuleId } from "../data/modules";

export interface ProgressBreakdown {
  lessons: { done: number; total: number; pct: number };
  translator: { done: number; total: number; pct: number };
  gauntlet: { done: number; total: number; pct: number };
  drills: { done: number; total: number; pct: number };
  flashcards: { done: number; total: number; pct: number };
  finalSet: { done: number; total: number; pct: number };
  overallPct: number;
}

const WEIGHTS = {
  lessons: 0.25,
  translator: 0.2,
  gauntlet: 0.2,
  drills: 0.35,
  flashcards: 0,
  finalSet: 0,
} as const;

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function computeProgress(state: BootcampState): ProgressBreakdown {
  const lessonsTotal = LECTURE_LESSON_IDS.size;
  const lessonsDone = state.completedLessons.filter((id) => LECTURE_LESSON_IDS.has(id)).length;

  // Only the answer choices a student can actually reach count toward progress.
  const translatorIds = new Set(ANSWER_CHOICE_ITEMS.map((i) => i.id));
  const translatorTotal = translatorIds.size;
  const translatorDone = [...sourceExerciseIds(state.drillAttempts)].filter((id) => translatorIds.has(id)).length;

  const gauntletIds = new Set(APPLIED_SOURCE_QUESTIONS.map((item) => item.id));
  const gauntletTotal = gauntletIds.size;
  const gauntletDone = new Set(
    state.completedDrills.filter((id) => gauntletIds.has(id)),
  ).size;

  const drillIds = new Set(DRILLS.filter((item) => LECTURE_DRILL_IDS.has(item.id) && !gauntletIds.has(item.id)).map((item) => item.id));
  const drillsTotal = drillIds.size;
  const drillsDone = state.completedDrills.filter((id) => drillIds.has(id)).length;

  const flashcardsTotal = FLASHCARDS.length;
  const flashcardsDone = Object.values(state.cards).filter((c) => c.status === "mastered").length;

  const finalSetTotal = 0;
  const finalSetDone = 0;

  const lessonsPct = pct(lessonsDone, lessonsTotal);
  const translatorPct = pct(translatorDone, translatorTotal);
  const gauntletPct = pct(gauntletDone, gauntletTotal);
  const drillsPct = pct(drillsDone, drillsTotal);
  const flashcardsPct = pct(flashcardsDone, flashcardsTotal);
  const finalSetPct = pct(finalSetDone, finalSetTotal);

  const overallPct = Math.round(
    lessonsPct * WEIGHTS.lessons +
      translatorPct * WEIGHTS.translator +
      gauntletPct * WEIGHTS.gauntlet +
      drillsPct * WEIGHTS.drills +
      flashcardsPct * WEIGHTS.flashcards +
      finalSetPct * WEIGHTS.finalSet,
  );

  return {
    lessons: { done: lessonsDone, total: lessonsTotal, pct: lessonsPct },
    translator: { done: translatorDone, total: translatorTotal, pct: translatorPct },
    gauntlet: { done: gauntletDone, total: gauntletTotal, pct: gauntletPct },
    drills: { done: drillsDone, total: drillsTotal, pct: drillsPct },
    flashcards: { done: flashcardsDone, total: flashcardsTotal, pct: flashcardsPct },
    finalSet: { done: finalSetDone, total: finalSetTotal, pct: finalSetPct },
    overallPct,
  };
}

// recommendNext: pick the surface with the lowest progress that still has
// runway. Returns a tuple of (label, view-state, blurb) the dashboard can
// render in the "Recommended next" tile.
export function recommendNext(p: ProgressBreakdown): {
  label: string;
  view: import("../types").ViewState;
  blurb: string;
} {
  const candidates: Array<{
    key: keyof Omit<ProgressBreakdown, "overallPct">;
    label: string;
    view: import("../types").ViewState;
    blurb: string;
  }> = [
    {
      key: "lessons",
      label: "Lecture notes",
      view: "dashboard",
      blurb: "Return to the lecture notes.",
    },
    {
      key: "translator",
      label: "The 15 answer choices",
      view: "module",
      blurb: "Return to the original answer choices and their breakdowns.",
    },
    {
      key: "drills",
      label: "Targeted drills",
      view: "drill",
      blurb: "Revisit the practice in the lecture.",
    },
    {
      key: "gauntlet",
      label: "Put It Together",
      view: "dashboard",
      blurb: "Return to Module 7 when you are ready to put the course skills together.",
    },
  ];

  // Find the first candidate with pct < 100; if none, default to final set.
  const next = candidates.find((c) => p[c.key].pct < 100) ?? candidates[1];
  return { label: next.label, view: next.view, blurb: next.blurb };
}

/** Saved work, not a local completion button or reviewed breakdown, completes homework. */
export function moduleRequirementsComplete(state: BootcampState, moduleId: ModuleId): boolean {
  const mod = getModule(moduleId);
  if (!mod || !state.completedLessons.includes(mod.noteLessonId)) return false;
  const saved = moduleId === "m3" ? sourceExerciseIds(state.drillAttempts) : new Set(state.completedDrills);
  return mod.drillIds.every((id) => saved.has(id));
}

export function completedModuleDays(state: BootcampState): number[] {
  return MODULES.filter((mod) => moduleRequirementsComplete(state, mod.id)).map((mod) => mod.number);
}
