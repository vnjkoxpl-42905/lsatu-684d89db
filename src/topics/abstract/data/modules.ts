import { BREAKDOWN_DRILL_IDS } from "./breakdownDrill";

// 7-module bootcamp definition. Modules are taken in order but nothing is
// locked: a student (or teacher previewing) can open any module or part.
//
// Each module has 3 parts: Note, Quiz, Drill. Lessons and drills are tagged
// to modules via the maps below (kept here rather than in-line on each item
// so the verbatim source comments in data/drills.ts and data/lessons.ts stay
// intact). The lookup helpers expose moduleId on a per-item basis.

export type ModuleId = "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7";

export type ModulePart = "note" | "quiz" | "drill";

export type QuizSource =
  | "whyHardItems"
  | "termQuizItems"
  | "translatorItems"
  | "matchingItems"
  | "methodQuizItems"
  | "trapItems"
  | "abstractChoices";

export interface ModuleRecord {
  id: ModuleId;
  number: number;
  name: string;
  subtitle: string;
  noteLessonId: string;
  quizSource: QuizSource;
  quizPassThreshold: number;
  drillIds: string[];
  // "breakdown" modules run the step-by-step breakdown drill
  // (data/breakdownDrill.ts) instead of multiple-choice questions.
  drillKind?: "questions" | "breakdown";
}

export const MODULES: ModuleRecord[] = [
  {
    id: "m1",
    number: 1,
    name: "Why Abstract Is Hard",
    subtitle: "What an abstract answer choice is, and why it reads like a riddle.",
    noteLessonId: "why_hard",
    quizSource: "whyHardItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_1", "drill_2"],
  },
  {
    id: "m2",
    number: 2,
    name: "LSAT Words You Must Know",
    subtitle: "Thirteen everyday words with strict LSAT meanings.",
    noteLessonId: "words_to_know",
    quizSource: "termQuizItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_3", "drill_10"],
  },
  {
    id: "m3",
    number: 3,
    name: "Break It Down",
    subtitle: "Turn an abstract answer choice into plain English, then into the stimulus.",
    noteLessonId: "deabstractifying_method",
    quizSource: "translatorItems",
    quizPassThreshold: 0.6,
    drillIds: BREAKDOWN_DRILL_IDS,
    drillKind: "breakdown",
  },
  {
    id: "m4",
    number: 4,
    name: "Match To The Stimulus",
    subtitle: "Point to every piece of the answer choice in the stimulus.",
    noteLessonId: "art_of_matching",
    quizSource: "matchingItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_5", "drill_6", "drill_7", "drill_8"],
  },
  {
    id: "m5",
    number: 5,
    name: "Spot The Method",
    subtitle: "Name what the author does, not what the author says.",
    noteLessonId: "master_keys",
    quizSource: "methodQuizItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_9", "drill_11", "drill_12", "drill_13"],
  },
  {
    id: "m6",
    number: 6,
    name: "Catch The Traps",
    subtitle: "Wrong role, wrong method, structural mismatch, one-word traps.",
    noteLessonId: "five_bucket_indicators",
    quizSource: "trapItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_4", "drill_18", "drill_19", "drill_20"],
  },
  {
    id: "m7",
    number: 7,
    name: "Put It Together",
    subtitle: "The whole routine on fresh answer choices and full questions.",
    noteLessonId: "abstract_15",
    quizSource: "abstractChoices",
    quizPassThreshold: 0.6,
    drillIds: ["drill_14", "drill_15", "drill_16", "drill_17"],
  },
];

export function getModule(id: ModuleId): ModuleRecord | undefined {
  return MODULES.find((m) => m.id === id);
}

const DRILL_MODULE_MAP: Record<string, ModuleId> = MODULES.reduce(
  (acc, m) => {
    for (const drillId of m.drillIds) acc[drillId] = m.id;
    return acc;
  },
  {} as Record<string, ModuleId>,
);

const LESSON_MODULE_MAP: Record<string, ModuleId> = MODULES.reduce(
  (acc, m) => {
    acc[m.noteLessonId] = m.id;
    return acc;
  },
  {} as Record<string, ModuleId>,
);

export function moduleIdForDrill(drillId: string): ModuleId | undefined {
  return DRILL_MODULE_MAP[drillId];
}

export function moduleIdForLesson(lessonId: string): ModuleId | undefined {
  return LESSON_MODULE_MAP[lessonId];
}
