// Topic registry. Adding a row here surfaces the topic in the Teacher
// Workspace Bootcamps dashboard with zero code changes. AC #9.

export interface BootcampDrillDef {
  /** Persisted mode string written to attempts.mode, eg "abstract:d2". */
  attemptMode: string;
  /** Display label for the dashboard table column. */
  label: string;
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
    chapterSectionCount: 3,
    drills: [
      { attemptMode: "abstract:d1", label: "D1 Strip-Down" },
      { attemptMode: "abstract:d2", label: "D2 Indicators" },
      { attemptMode: "abstract:d3", label: "D3 Basic X/Y" },
      { attemptMode: "abstract:d4", label: "D4 Advanced X/Y" },
      { attemptMode: "abstract:d5", label: "D5 Jargon" },
    ],
    chapterSections: [
      { id: "section-1", title: "The Abstraction Move (Strip-Down)" },
      { id: "section-2", title: "The Decode Move" },
      { id: "section-3", title: "Where This Cashes Out" },
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
