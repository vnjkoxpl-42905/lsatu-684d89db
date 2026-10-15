// Re-export hub for split data files.
//
// The new bootcamp's `mockData.ts` was a single 776-line file. Per
// _BUILD_SPEC_v2.0.md the data is split into per-domain files; this hub
// preserves the existing import surface (`from '../../data/mockData'`) used
// across views while routing each export through the new authoritative file.
//
// New views and refactors should import directly from the named files.

export { LESSONS } from "./lessons";
export { ABSTRACT_CHOICES } from "./abstractChoices";
export { TERMS } from "./terms";
export { METHOD_PATTERNS } from "./methodPatterns";
export { QUESTION_STEMS, QUESTION_STEM_REFS } from "./questionStems";
export { MATCHING_ITEMS } from "./matchingItems";
export { DRILLS } from "./drills";
export { FLASHCARDS } from "./flashcards";
export { TRANSLATOR_ITEMS } from "./translatorItems";

// Re-export AbstractChoice type which was defined inline in the original
// mockData.ts; it now lives in `../types`.
export type { AbstractChoice } from "../types";
