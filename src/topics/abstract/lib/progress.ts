// Progress roll-up helpers used by the Dashboard and Sidebar to reduce
// raw bootcamp state into per-surface percentages and an overall weighted
// completion number. Centralised here so the same weights apply across
// surfaces and the weights stay easy to tune.

import { LESSONS, DRILLS, FLASHCARDS, ABSTRACT_CHOICES, TRANSLATOR_ITEMS } from "../data/mockData";
import type { BootcampState } from "../types";

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
  translator: 0.1,
  gauntlet: 0.2,
  drills: 0.2,
  flashcards: 0.15,
  finalSet: 0.1,
} as const;

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function computeProgress(state: BootcampState): ProgressBreakdown {
  const lessonsTotal = LESSONS.length;
  const lessonsDone = state.completedLessons.length;

  const translatorTotal = TRANSLATOR_ITEMS.length;
  const translatorDone = new Set(state.translatorAttempts.map((a) => a.stemNumber)).size;

  const gauntletTotal = ABSTRACT_CHOICES.length;
  const gauntletDone = new Set(state.gauntletAttempts.map((a) => a.choiceId)).size;

  const drillsTotal = DRILLS.length;
  const drillsDone = Math.min(state.completedDrills.length, drillsTotal);

  const flashcardsTotal = FLASHCARDS.length;
  const flashcardsDone = Object.values(state.cards).filter((c) => c.status === "mastered").length;

  const finalSetTotal = 1;
  const finalSetDone = state.finalSetScore ? 1 : 0;

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
      label: "Guided lessons",
      view: "lesson",
      blurb: "Work through the next lesson to keep building the S + K method.",
    },
    {
      key: "translator",
      label: "Translator",
      view: "lesson",
      blurb: "Translate the next abstract question stem and see the walkthrough.",
    },
    {
      key: "gauntlet",
      label: "Decoding Gauntlet",
      view: "lesson",
      blurb: "Decode one more abstract answer choice and stress-test your translations.",
    },
    {
      key: "drills",
      label: "Targeted drills",
      view: "drill",
      blurb: "Pick a drill type and grind a few more reps under timed conditions.",
    },
    {
      key: "flashcards",
      label: "Flashcards",
      view: "flashcards",
      blurb: "Burn down the due-now queue before it builds up.",
    },
    {
      key: "finalSet",
      label: "Final timed set",
      view: "timed_set",
      blurb: "Run the timed simulation when the other surfaces are at 100%.",
    },
  ];

  // Find the first candidate with pct < 100; if none, default to final set.
  const next = candidates.find((c) => p[c.key].pct < 100) ?? candidates[candidates.length - 1];
  return { label: next.label, view: next.view, blurb: next.blurb };
}
