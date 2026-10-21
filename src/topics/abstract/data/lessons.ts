import { Lesson } from "../types";

// 8 lessons for the Abstract bootcamp.
//
// Order intentional per spec: foundation -> tooling -> framework -> practice.
// `abstract_15` retains its stage gate (now 18 items, name preserved for
// id-stability across Supabase rows that may already reference it).
//
// The three new lessons (master_keys, five_bucket_indicators, art_of_matching)
// are sourced from _source/03 and _source/06 and have render cases added in
// LessonReader.tsx.
export const LESSONS: Lesson[] = [
  {
    id: "why_hard",
    title: "Why Abstract Answer Choices Feel Hard",
    type: "concept",
    content: "",
    hasInteractiveContent: true,
  },
  {
    id: "deabstractifying_method",
    title: "The De-abstractify Method",
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
    id: "master_keys",
    title: "Master Keys (Explanation, Hypothesis, Presuppose)",
    type: "concept",
    content: "",
  },
  {
    id: "five_bucket_indicators",
    title: "Five-Bucket Indicator Schema",
    type: "concept",
    content: "",
  },
  {
    id: "art_of_matching",
    title: "The Art of Matching Keywords",
    type: "concept",
    content: "",
  },
  {
    id: "abstract_15",
    title: "Decode the 18 Abstract Answer Choices",
    type: "concept",
    content: "",
    hasInteractiveContent: true,
  },
  {
    id: "decode_practice",
    title: "Decode Practice",
    type: "concept",
    content: "",
  },
];
