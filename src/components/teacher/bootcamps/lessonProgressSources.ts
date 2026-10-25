/**
 * Registry of bootcamp lessons that store per-student progress.
 *
 * A "lesson progress source" is any table holding one row per (student, lesson)
 * that the teacher dossier can read back. The two that exist today have
 * genuinely different shapes. RC keeps a full record of position and written
 * work, Abstract records completion only, so the registry describes each
 * source's real capabilities rather than pretending they match. A source
 * without `data` renders as completion, and nothing invents a percentage or a
 * response count it cannot support.
 *
 * Adding a bootcamp means adding an entry here. Nothing else changes.
 */

import { SCREENS } from '@/bootcamps/rc-bootcamp/content';

export interface LessonPrompt {
  /** Stable key inside the stored record. */
  storageKey: string;
  /** Where in the lesson the student wrote this. */
  chapter: string;
  /** The question they were answering, as plain text. */
  prompt: string;
}

export interface LessonProgressSource {
  /**
   * The single `lesson_id` this source represents. Absent when the table holds
   * many independent lessons (Abstract stores one row per lesson completed),
   * in which case every row for the student is listed and labelled by its own
   * `lesson_id`.
   */
  lessonId?: string;
  /** Registry key. Unique across sources. */
  key: string;
  /** Bootcamp this lesson belongs to, e.g. "RC Bootcamp". */
  bootcamp: string;
  /** The lesson's own title. */
  title: string;
  /** Table holding the rows. */
  table: string;
  /**
   * Total screens, used for the percentage. Absent when the source cannot
   * express partial progress, in which case no percentage is shown.
   */
  totalScreens?: number;
  /** Reserved key holding the furthest screen index reached. */
  furthestKey?: string;
  /** Written prompts, in lesson order. Empty when the source stores no writing. */
  prompts: LessonPrompt[];
  /** True when the table carries a `data` jsonb column and an `updated_at`. */
  hasDetail: boolean;
}

/** Questions in `content.ts` are authored as HTML. The dossier shows them as text. */
function toText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Derived from the lesson itself rather than restated here, so a content change
 * that renames or moves a write screen cannot leave the dossier showing a stale
 * prompt above a student's answer.
 */
const RC_PROMPTS: LessonPrompt[] = SCREENS.flatMap(({ screen, chapterIndex }) =>
  screen.type === 'write'
    ? [
        {
          storageKey: screen.storageKey,
          chapter: `Chapter ${chapterIndex + 1}`,
          prompt: toText(screen.question),
        },
      ]
    : [],
);

export const LESSON_PROGRESS_SOURCES: LessonProgressSource[] = [
  {
    key: 'rc-engaging-with-the-passage',
    lessonId: 'rc-engaging-with-the-passage',
    bootcamp: 'RC Bootcamp',
    title: 'Engaging With The Passage',
    table: 'rc_lesson_progress',
    totalScreens: SCREENS.length,
    furthestKey: '__furthest',
    prompts: RC_PROMPTS,
    hasDetail: true,
  },
  {
    // Completion-only, and many lessons per student: the table has no `data` or
    // `updated_at` columns and no single lesson_id, so this entry deliberately
    // claims neither progress nor written work.
    key: 'abstract',
    bootcamp: 'Abstract Answers',
    title: 'Lessons completed',
    table: 'abstract_lesson_progress',
    prompts: [],
    hasDetail: false,
  },
];
