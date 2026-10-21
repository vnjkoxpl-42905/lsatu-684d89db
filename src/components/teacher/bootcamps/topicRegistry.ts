// Topic registry. Adding a row here surfaces the topic in the Teacher
// Workspace Bootcamps dashboard with zero code changes. AC #9.

export interface BootcampDrillDef {
  /**
   * Value matched against the topic's attempt source column. For topics on the
   * shared `attempts` table this is the `mode` string. For topics with their
   * own attempts table (see `attemptsSource`) this is the value written to that
   * table's mode column, eg Abstract's `drill_type` enum value.
   */
  attemptMode: string;
  /** Display label for the dashboard table column. */
  label: string;
}

/**
 * Where a topic's drill attempts are persisted. Default (when omitted) is the
 * shared `attempts` table keyed by `mode`. Topics that write to their own
 * attempts table declare it here so the teacher dashboard reads the real rows
 * instead of an always-empty shared-table query.
 */
export interface BootcampAttemptsSource {
  table: "abstract_drill_attempts";
  /** Column matched against each drill's `attemptMode`. */
  modeColumn: "drill_type";
  /** Timestamp column used for recency / last-activity. */
  timestampColumn: "completed_at";
}

export interface BootcampTopicDef {
  /** Stable id used in URLs (kebab-case). */
  id: string;
  /** Display name shown on the card. */
  name: string;
  /** Short blurb under the card title. */
  blurb: string;
  /** Where the student-facing topic lives. Used for "Open the topic" links. */
  topicPath: string;
  /**
   * The topic_tag value stored in chapter_progress.topic_tag and
   * flashcard_reviews.topic_tag. Usually matches `id`.
   */
  topicTag: string;
  /** Total flashcards published for the topic. Used in card metrics. */
  flashcardTotal: number;
  /** Total chapter sections published. Used in card metrics. */
  chapterSectionCount: number;
  /** Drill modes used by this topic. Each maps to a column in detail view. */
  drills: BootcampDrillDef[];
  /**
   * Optional override for where drill attempts live. Omit to read the shared
   * `attempts` table keyed by `mode`.
   */
  attemptsSource?: BootcampAttemptsSource;
  /** Names of the canonical chapter sections, in reading order. */
  chapterSections: { id: string; title: string }[];
}

// Currently the only shipped topic. Add new BootcampTopicDef entries below as
// future topics go live. The dashboard sorts the array by `name` for display.
export const BOOTCAMP_TOPICS: BootcampTopicDef[] = [
  {
    id: "abstract",
    name: "Abstract",
    blurb:
      "Strip-Down + Decode. Foundation topic feeding Causation, Role, Method, Flaw, Main Conclusion, Parallel, Principle.",
    topicPath: "/topics/abstract",
    topicTag: "abstract",
    flashcardTotal: 68,
    // Eight published lessons. Completion is counted only against these
    // canonical lesson ids (see chapterSections); translator/gauntlet/module
    // mirror rows in chapter_progress are excluded so completion cannot exceed
    // 100%.
    chapterSectionCount: 8,
    // Abstract writes drill attempts to its own table keyed by `drill_type`
    // (the DrillType enum in src/topics/abstract/types.ts), not the shared
    // `attempts.mode` column. attemptMode values below match those enum values.
    attemptsSource: {
      table: "abstract_drill_attempts",
      modeColumn: "drill_type",
      timestampColumn: "completed_at",
    },
    drills: [
      { attemptMode: "role", label: "Role" },
      { attemptMode: "method", label: "Method" },
      { attemptMode: "flaw", label: "Flaw" },
      { attemptMode: "one_word_trap", label: "One-Word Traps" },
      { attemptMode: "keyword_extraction", label: "Keyword Extraction" },
      { attemptMode: "term_definition", label: "Term Definitions" },
      { attemptMode: "translation", label: "Translation" },
      { attemptMode: "matching", label: "Matching" },
      { attemptMode: "mixed", label: "Mixed Practice" },
    ],
    // Canonical lesson ids written by markLessonComplete -> recordChapterProgress
    // (src/topics/abstract/store/AppContext.tsx) and defined in
    // src/topics/abstract/data/lessons.ts.
    chapterSections: [
      { id: "why_hard", title: "Why Abstract Answer Choices Feel Hard" },
      { id: "deabstractifying_method", title: "The De-abstractify Method" },
      { id: "words_to_know", title: "The Words You Must Know" },
      { id: "master_keys", title: "Master Keys (Explanation, Hypothesis, Presuppose)" },
      { id: "five_bucket_indicators", title: "Five-Bucket Indicator Schema" },
      { id: "art_of_matching", title: "The Art of Matching Keywords" },
      { id: "abstract_15", title: "Decode the 18 Abstract Answer Choices" },
      { id: "decode_practice", title: "Decode Practice" },
    ],
  },
];

export function findTopic(id: string | undefined): BootcampTopicDef | undefined {
  if (!id) return undefined;
  return BOOTCAMP_TOPICS.find((t) => t.id === id);
}

// Granular flag check. AC #6 + Joshua's "granular feature flags" rule. No
// `feature_flags` table exists in the repo today, so the gate is a constant
// for now. Wire to a real flag table when it lands; the call sites do not
// need to change.
export const BOOTCAMPS_DASHBOARD_ENABLED = true;
