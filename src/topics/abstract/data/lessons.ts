import { Lesson } from "../types";

// The seven module notes, one per module, in module order. The note content
// lives in components/views/AbstractNotes.tsx.
//
// Lesson ids are stable keys in abstract_lesson_progress, so they keep their
// original names even where the topic changed (master_keys is now the Spot
// the Method note; five_bucket_indicators is now Catch the Traps; abstract_15
// is the closing routine).
export const LESSONS: Lesson[] = [
  {
    id: "why_hard",
    title: "Why Abstract Answer Choices Feel Hard",
    type: "concept",
    content: "",
  },
  {
    id: "words_to_know",
    title: "The Words You Must Know",
    type: "concept",
    content: "",
  },
  {
    id: "deabstractifying_method",
    title: "Break Down an Abstract Answer Choice",
    type: "concept",
    content: "",
    hasInteractiveContent: true,
  },
  {
    id: "art_of_matching",
    title: "Match Every Piece to the Stimulus",
    type: "concept",
    content: "",
    hasInteractiveContent: true,
  },
  {
    id: "master_keys",
    title: "Spot the Method",
    type: "concept",
    content: "",
  },
  {
    id: "five_bucket_indicators",
    title: "Catch the Traps",
    type: "concept",
    content: "",
  },
  {
    id: "abstract_15",
    title: "The Whole Routine",
    type: "concept",
    content: "",
  },
];
