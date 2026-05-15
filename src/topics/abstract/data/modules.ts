// 7-module linear bootcamp definition.
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
}

export const MODULES: ModuleRecord[] = [
  {
    id: "m1",
    number: 1,
    name: "Why Abstract Is Hard",
    subtitle: "Feel the difficulty before learning the fix.",
    noteLessonId: "why_hard",
    quizSource: "whyHardItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_1", "drill_2"],
  },
  {
    id: "m2",
    number: 2,
    name: "LSAT Words You Must Know",
    subtitle: "Seven terms with LSAT-specific meanings.",
    noteLessonId: "words_to_know",
    quizSource: "termQuizItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_3", "drill_4"],
  },
  {
    id: "m3",
    number: 3,
    name: "Stimulus + Keyword Extraction",
    subtitle: "The core method. Find the load-bearing words.",
    noteLessonId: "deabstractifying_method",
    quizSource: "translatorItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_5", "drill_6", "drill_7", "drill_8", "drill_9"],
  },
  {
    id: "m4",
    number: 4,
    name: "Match To The Stimulus",
    subtitle: "Test each part of the answer choice against the stimulus.",
    noteLessonId: "art_of_matching",
    quizSource: "matchingItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_10", "drill_11", "drill_12", "drill_13", "drill_14"],
  },
  {
    id: "m5",
    number: 5,
    name: "Spot The Method",
    subtitle: "Seventeen method-of-reasoning patterns.",
    noteLessonId: "master_keys",
    quizSource: "methodQuizItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_15", "drill_16"],
  },
  {
    id: "m6",
    number: 6,
    name: "Catch The Traps",
    subtitle: "One-word swaps, wrong roles, structural mismatches.",
    noteLessonId: "five_bucket_indicators",
    quizSource: "trapItems",
    quizPassThreshold: 0.6,
    drillIds: ["drill_17", "drill_18"],
  },
  {
    id: "m7",
    number: 7,
    name: "Put It Together",
    subtitle: "The whole workflow. The full 18-item gauntlet.",
    noteLessonId: "abstract_15",
    quizSource: "abstractChoices",
    quizPassThreshold: 0.6,
    drillIds: ["drill_19", "drill_20"],
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
