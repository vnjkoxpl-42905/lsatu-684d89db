/**
 * Types for the Reading Comprehension bounded context.
 *
 * The shapes below are the contract produced by `scripts/build-rc-bank.mjs`
 * and served as static JSON from `public/data/rc/`. Change one and you must
 * change the other.
 */

export type RcLetter = 'A' | 'B' | 'C' | 'D' | 'E';

export const RC_LETTERS: RcLetter[] = ['A', 'B', 'C', 'D', 'E'];

export interface RcChoice {
  letter: RcLetter;
  text: string;
  /** May be null, and may be a dual tag joined with " / ". */
  tag: string | null;
  /** Rounded; does not sum to 100 across A-E. Never total these. */
  percent: number | null;
  responseCount: number | null;
  correct: boolean;
  explanation: string | null;
}

export interface RcExplanationBlock {
  heading: string | null;
  body: string;
}

export interface RcFeature {
  name: string;
  group: string | null;
}

export interface RcQuestion {
  questionId: number;
  /** Official 1-based question number across the full RC section. */
  position: number;
  questionType: string;
  questionTypeFamily: string;
  difficulty: number | null;
  /** Null for questions with no authored explanation record. */
  prompt: string | null;
  correctAnswer: RcLetter;
  hasWrittenExplanation: boolean;
  /** Null or empty for tag-only questions. */
  explanationBlocks: RcExplanationBlock[] | null;
  totalResponses: number | null;
  features: RcFeature[];
  choices: RcChoice[];
}

export interface RcSummaries {
  standard: string | null;
  brief: string | null;
  anotherWay: string | null;
}

export interface RcPassage {
  passageId: number;
  preptest: number;
  section: number;
  /** The passage's position within its section, 1-4. */
  setNumber: number;
  title: string | null;
  topic: string | null;
  format: string | null;
  frameworks: string[];
  difficulty: number | null;
  /** Markdown. Paragraphs separated by \n\n. */
  text: string;
  summaries: RcSummaries;
  questions: RcQuestion[];
}

export interface RcPreptestFile {
  preptest: number;
  passages: RcPassage[];
}

export interface RcIndexPassage {
  passageId: number;
  section: number;
  setNumber: number;
  title: string | null;
  topic: string | null;
  format: string | null;
  frameworks: string[];
  difficulty: number | null;
  questionCount: number;
  explainedCount: number;
  /** Lets the hub roll history up to passage level without a per-PT load. */
  questionIds: number[];
  firstWords: string;
}

export interface RcIndexPreptest {
  preptest: number;
  passageCount: number;
  questionCount: number;
  passages: RcIndexPassage[];
}

export interface RcIndex {
  preptests: RcIndexPreptest[];
}

/* ------------------------------------------------------------ search index */

/**
 * One flat record per drillable question, emitted by
 * `scripts/build-rc-search-index.mjs` as public/data/rc/rc-question-index.json.
 * Carries everything the search page filters on so it never has to load a
 * PrepTest file. Change one and you must change the other.
 */
export interface RcQuestionIndexEntry {
  questionId: number;
  passageId: number;
  preptest: number;
  section: number;
  setNumber: number;
  position: number;
  questionType: string;
  questionTypeFamily: string;
  difficulty: number | null;
  /** Feature names only; groups come from RC_FEATURES. */
  features: string[];
  prompt: string | null;
}

export interface RcQuestionIndex {
  questionCount: number;
  questions: RcQuestionIndexEntry[];
}

/* ------------------------------------------------------------------ session */

export type RcRevealMode = 'per_question' | 'per_passage' | 'end_of_set';

/**
 * One phrasing per reveal mode, lowercase so it reads inside a sentence like
 * "1 passage · untimed · after each passage". Lives here rather than beside a
 * builder because two surfaces render a session's summary and they must not
 * describe the same session differently.
 */
export const REVEAL_LABELS: Record<RcRevealMode, string> = {
  per_question: 'after each question',
  per_passage: 'after each passage',
  end_of_set: 'at the end',
};

export type RcTiming =
  | { mode: 'unlimited' }
  | { mode: 'per_passage_budget'; secondsPerPassage: number };

export interface RcDrillConfig {
  reveal: RcRevealMode;
  timing: RcTiming;
  source: 'manual' | 'adaptive' | 'assignment';
  /** Spent section time, saved with the account so reopening never restarts the clock. */
  clockElapsedSeconds?: number;
  /** Zero-based question position acknowledged by the account. Older sessions omit it. */
  currentQuestionIndex?: number;
  lastActiveAt?: string;
  practiceTestRunId?: string;
  practiceTestLegIndex?: number;
  timedSectionSittingId?: string;
}

export type RcSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface RcDrillSession {
  id: string;
  userId: string;
  config: RcDrillConfig;
  passageIds: number[];
  status: RcSessionStatus;
  excludedFromAnalytics: boolean;
  startedAt: string;
  completedAt: string | null;
}

export interface RcAttempt {
  id?: string;
  sessionId: string;
  userId?: string;
  questionId: number;
  passageId: number;
  selected: RcLetter | null;
  isCorrect: boolean | null;
  timeMs: number;
  flagged: boolean;
  eliminations: RcLetter[];
  isFirstAttempt: boolean;
  createdAt?: string;
}

/**
 * Where a mark lives. Marks are stored per passage, so a question part has to
 * name its question: a bare letter could not say which of the passage's five
 * or so questions it belonged to.
 */
export type RcHighlightTarget = 'passage' | `q${number}:stem` | `q${number}:${RcLetter}`;

/** The target for a question's stem or one of its choices. */
export function questionTarget(questionId: number, part: 'stem' | RcLetter): RcHighlightTarget {
  return `q${questionId}:${part}`;
}

/** A stored highlight, expressed as offsets into the rendered text of its target. */
export interface RcHighlight {
  /** 'passage', or a question-scoped stem or choice. See RcHighlightTarget. */
  target: RcHighlightTarget;
  start: number;
  end: number;
  color: RcHighlightColor;
  /**
   * Underlines draw a rule instead of a fill. Absent means a highlight, so
   * annotations stored before underlining existed still read correctly.
   */
  kind?: RcAnnotationKind;
}

export type RcAnnotationKind = 'highlight' | 'underline';

/**
 * The LR player's three marker colors, at its alpha and blend mode, so a
 * highlight looks the same in both drills. RC previously carried a fourth and
 * fifth (green, cyan) that LR has no equivalent for.
 */
export type RcHighlightColor = 'yellow' | 'pink' | 'orange';

export const RC_HIGHLIGHT_COLORS: Record<RcHighlightColor, string> = {
  yellow: 'rgba(250, 204, 21, 0.32)',
  pink: 'rgba(244, 114, 182, 0.32)',
  orange: 'rgba(251, 146, 60, 0.32)',
};

/**
 * The active annotation tool, mirroring the LR toolbar's own mode union.
 * 'none' leaves the selection popover in charge.
 */
export type RcHighlightMode = 'none' | RcHighlightColor | 'underline' | 'erase';

/** Anything stored under a retired color still paints, as yellow. */
export function rcHighlightColor(color: string | undefined): string {
  return RC_HIGHLIGHT_COLORS[color as RcHighlightColor] ?? RC_HIGHLIGHT_COLORS.yellow;
}

export interface RcQuestionHistoryEntry {
  questionId: number;
  attempts: number;
  everIncorrect: boolean;
  incorrectOnLastTake: boolean;
  incorrectCount: number;
  lastSeenAt: string | null;
}

export type RcQuestionHistory = Map<number, RcQuestionHistoryEntry>;

/* ----------------------------------------------------------------- taxonomy */
/*
 * Closed vocabularies, transcribed from scripts/rc-source/data/taxonomy.csv
 * (50 rows, tag version 32855). Build filter UIs from these constants, never by
 * scanning the bank. Every value in the data is guaranteed to appear here.
 */

export const RC_TOPICS = ['Humanities', 'Society', 'Law', 'Science'] as const;

export const RC_FORMATS = ['Standard (Non-Comparative)', 'Comparative'] as const;

export const RC_FRAMEWORKS = [
  'Old / New',
  'Problem / Solution',
  'Theme / Example',
  'Challenge Position',
  'Highlight Noteworthy',
  'Present Debate',
  'Answer a Question',
] as const;

export const RC_QUESTION_TYPE_FAMILIES = [
  'Big Picture',
  'Implied',
  'Stated',
  'Beyond Passage',
  // Note the typographic apostrophe: this is the exact value in the data.
  'Author’s Intent',
] as const;

export const RC_QUESTION_TYPES: { name: string; family: string }[] = [
  { name: 'Analogy', family: 'Beyond Passage' },
  { name: 'Application', family: 'Beyond Passage' },
  { name: "Author's Attitude", family: 'Implied' },
  { name: 'Inference', family: 'Implied' },
  { name: 'Meaning in Context', family: 'Author’s Intent' },
  { name: 'Author Opinion', family: 'Implied' },
  { name: 'Organization', family: 'Big Picture' },
  { name: 'Principle', family: 'Implied' },
  { name: 'Primary Purpose', family: 'Big Picture' },
  { name: 'Add to the Passage', family: 'Beyond Passage' },
  { name: 'Main Point', family: 'Big Picture' },
  { name: 'Must be False', family: 'Stated' },
  { name: 'Strengthen', family: 'Beyond Passage' },
  { name: 'Weaken', family: 'Beyond Passage' },
  { name: 'Evaluate', family: 'Beyond Passage' },
  { name: 'Method', family: 'Big Picture' },
  { name: 'Local Purpose', family: 'Author’s Intent' },
  { name: 'Paragraph Purpose', family: 'Author’s Intent' },
  { name: 'Five Questions', family: 'Stated' },
  { name: 'Locate Detail', family: 'Stated' },
  { name: 'Non-Author Opinion', family: 'Implied' },
];

export const RC_FEATURES: { name: string; group: string | null }[] = [
  { name: 'EXCEPT', group: 'Format' },
  { name: 'Source / Audience', group: 'Format' },
  { name: 'Primary Concern', group: 'Format' },
  { name: 'Must Be True', group: 'Format' },
  { name: 'Most Supported', group: 'Format' },
  { name: 'Only One', group: 'Comparative Passages' },
  { name: 'Relationship', group: 'Comparative Passages' },
  { name: 'Undefined Target', group: 'Anticipation' },
  { name: 'Defined Target', group: 'Anticipation' },
  { name: 'Flip the Fact', group: null },
  { name: 'Semi-Defined Target', group: 'Anticipation' },
  { name: 'Overlap', group: 'Comparative Passages' },
  { name: 'Disconnect', group: 'Comparative Passages' },
  { name: 'Answers are Questions', group: 'Format' },
  { name: 'Answers are Titles', group: 'Format' },
  { name: 'Paraphrase a Line', group: null },
];

export const RC_PREPTEST_MIN = 101;
export const RC_PREPTEST_MAX = 159;
/** Newest tests are held back by default so they stay fresh for timed sections. */
export const RC_PREPTEST_DEFAULT_MAX = 148;

/** Standard pace: 8:45 per passage. */
export const RC_STANDARD_SECONDS_PER_PASSAGE = 525;
/** Used only for the per-question pace delta on the results table. */
export const RC_SECONDS_PER_QUESTION_BUDGET = 75;
