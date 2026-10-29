/**
 * Zod record schemas — per architecture-plan.md §3.3.
 * Lesson 1.1 only exercises `users`, `lesson_progress`, `module_progress`.
 * Other schemas are declared here so the persistence layer is type-complete from day 1.
 */

import { z } from 'zod';
import { LrRunProvenanceSchema } from '@/lib/lrRunProvenance';
import { UuidV4Schema, IsoDateSchema } from '@/bootcamps/main-conclusion/lib/ids';

const TrapTraitId = z.enum(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']);
const ModuleId = z.enum(['M1', 'M2', 'M3', 'M4', 'M5', 'M6']);

export const User = z.object({
  id: UuidV4Schema,
  name: z.string().default('Student'),
  started_at: IsoDateSchema,
  last_seen: IsoDateSchema,
  settings: z.record(z.unknown()).default({}),
});
export type User = z.infer<typeof User>;

export const ModuleProgress = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  unlocked_modules: z.array(ModuleId),
  unlocked_routes: z.array(z.string()),
  completed_lessons: z.array(z.string()),
  completed_drills: z.array(z.string()),
  completed_milestones: z.array(z.string()).default([]),
  completed_hard_sections: z.array(z.string()).default([]),
  completed_capstones: z.array(z.enum(['M1.13', 'M5.8'])),
  updated_at: IsoDateSchema,
});
export type ModuleProgress = z.infer<typeof ModuleProgress>;

export const LessonProgress = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  lesson_id: z.string(),
  viewed_at: IsoDateSchema,
  checkpoint_responses: z.record(z.unknown()).optional(),
});
export type LessonProgress = z.infer<typeof LessonProgress>;

export const PrefsUser = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  reduced_motion: z.boolean().default(false),
  audio_input_device: z.string().optional(),
  audio_retention: z.enum(['keep-forever', 'auto-purge-90d']).default('keep-forever'),
  cheat_sheet_open: z.boolean().default(false),
});
export type PrefsUser = z.infer<typeof PrefsUser>;

// Stubbed for completeness — populated as later modules build.
export const SimulatorAttempt = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  question_id: z.string(),
  picked: z.enum(['A', 'B', 'C', 'D', 'E']),
  correct: z.boolean(),
  picked_trait_id: TrapTraitId.optional(),
  pre_phrase: z.string().optional(),
  time_spent_ms: z.number().int(),
  attempted_at: IsoDateSchema,
  confidence_rating: z.enum(['low', 'medium', 'high']).optional(),
  reasoning_note: z.string().optional(),
});
export type SimulatorAttempt = z.infer<typeof SimulatorAttempt>;

// ─── Drill Stage-Gate (per drill, per stage, with attempts) ─────────────────
export const DrillStageGate = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  drill_id: z.string(), // 'MC-DRL-3.1' .. 'MC-DRL-3.9'
  stage: z.number().int().min(1).max(4),
  attempt_id: UuidV4Schema,
  score: z.number().int().min(0).max(5),
  passed: z.boolean(),
  responses: z.array(
    z.object({
      question_index: z.number().int().min(0),
      picked: z.string(),
      correct: z.boolean(),
    }),
  ),
  started_at: IsoDateSchema,
  completed_at: IsoDateSchema,
});
export type DrillStageGate = z.infer<typeof DrillStageGate>;

// ─── Traps tag (one row per attempted answer choice) ────────────────────────
export const TrapsTag = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  surface_id: z.string(), // 'MC-SIM-Q1', 'MC-CAL-1.13.3', etc.
  letter: z.enum(['A', 'B', 'C', 'D', 'E']),
  picked: z.boolean(),
  correct: z.boolean(),
  trait_id: TrapTraitId.optional(),
  recorded_at: IsoDateSchema,
});
export type TrapsTag = z.infer<typeof TrapsTag>;

// ─── Mistakes profile (per-trait + per-stem aggregates) ─────────────────────
export const MistakesProfile = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  trait_id: TrapTraitId,
  attempts: z.number().int().min(0),
  picked_when_wrong: z.number().int().min(0),
  last_seen_at: IsoDateSchema,
  notes: z.string().optional(),
});
export type MistakesProfile = z.infer<typeof MistakesProfile>;

// ─── SRS queue (SM-2 spaced repetition) ─────────────────────────────────────
export const SrsQueueItem = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  surface_id: z.string(), // simulator question id, drill question key, etc.
  ease: z.number().min(1.3),
  interval_days: z.number().int().min(0),
  due_at: IsoDateSchema,
  lapses: z.number().int().min(0),
  last_grade: z.number().int().min(0).max(5).optional(),
  last_reviewed_at: IsoDateSchema.optional(),
});
export type SrsQueueItem = z.infer<typeof SrsQueueItem>;

// ─── R&R recordings (metadata; audio blob lives in IndexedDB blob store) ────
export const RrRecording = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  drill_id: z.string(),
  stage: z.string(),
  blob_key: z.string(), // key into IndexedDB blob store
  transcript: z.string().default(''),
  flags: z.array(z.string()).default([]), // e.g. ['outside-knowledge', 'pre-phrase-skipped']
  created_at: IsoDateSchema,
});
export type RrRecording = z.infer<typeof RrRecording>;

export const RrReview = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  recording_id: UuidV4Schema,
  reviewer: z.enum(['self', 'coach']),
  notes: z.string(),
  reviewed_at: IsoDateSchema,
});
export type RrReview = z.infer<typeof RrReview>;

// ─── Journal entries (right-drawer notepad) ─────────────────────────────────
export const JournalEntry = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  surface_id: z.string().optional(), // tied to a surface if opened from one
  body_md: z.string(),
  created_at: IsoDateSchema,
  updated_at: IsoDateSchema,
});
export type JournalEntry = z.infer<typeof JournalEntry>;

// ─── Calibration attempts (M1.13 + M5.8; calibration_only flag in record) ───
export const CalibrationAttempt = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  calibration_only: z.literal(true),
  calibration_module: z.enum(['M1', 'M5']),
  item_id: z.string(), // 'MC-CAL-1.13.1' etc.
  picked: z.string(),
  correct: z.boolean(),
  trait_target: z.string(),
  attempted_at: IsoDateSchema,
});
export type CalibrationAttempt = z.infer<typeof CalibrationAttempt>;

// ─── Practice-set session (resume state for Intro to LR practice drills) ────
// One row per user per practice pool. Holds enough to put the student back
// exactly where they were: the frozen question queue, where they stopped, and
// every answer already given. Survives tab close, sign-out, and device change
// because it rides the same bootcamp_kv sync as module_progress.
export const PracticeSessionAttempt = z.object({
  qid: z.string(),
  selected_answer: z.string(),
  correct: z.boolean(),
  time_ms: z.number().int().min(0).default(0),
  /**
   * Everything a resumed run must not lose. A student who leaves a section
   * half-sat and comes back should find the same record they left, not a
   * flattened one: the answers they changed their mind about, how many times,
   * and what they marked for review. All optional — rows written before this
   * existed are still valid, they simply carry less.
   */
  switch_count: z.number().int().min(0).optional(),
  flagged: z.boolean().optional(),
  answer_trail: z
    .array(z.object({ answer: z.string(), at_ms: z.number().min(0) }))
    .optional(),
  /**
   * The answer was on screen (Answer or Explanation pressed) before or after
   * this pick. Without it a resumed run could not tell a pick made after
   * seeing the answer from a clean one. Optional: older rows read as false.
   */
  answer_revealed: z.boolean().optional(),
  provenance: LrRunProvenanceSchema.optional(),
});
export type PracticeSessionAttempt = z.infer<typeof PracticeSessionAttempt>;

export const PracticeSession = z.object({
  id: UuidV4Schema,
  user_id: UuidV4Schema,
  pool_slug: z.string(),
  completion_id: z.string(),
  /** Version of question identity and answer-key semantics in saved resume rows. */
  data_version: z.number().int().optional(),
  question_queue: z.array(z.string()),
  current_index: z.number().int().min(0).default(0),
  attempts: z.array(PracticeSessionAttempt).default([]),
  status: z.enum(['in_progress', 'completed']).default('in_progress'),
  /**
   * How much of the section clock has already been spent. A timed section that
   * resumed with a fresh 35:00 was handing back time the student had already
   * used, which makes the score meaningless. Absent for anything untimed.
   */
  elapsed_ms: z.number().min(0).optional(),
  /** Original section clock, needed to resume accommodations on another device. */
  timer_mode: z.enum(['35', '52.5', '70', 'custom', 'unlimited']).optional(),
  timer_custom_minutes: z.number().positive().optional(),
  /**
   * Which questions already carried an answer when the section clock ran out.
   * Kept so a section resumed during overtime still knows which side of the
   * buzzer each answer belongs to; recomputing it on resume would quietly
   * move every overtime answer back inside the clock.
   */
  regulation_answered_qids: z.array(z.string()).optional(),
  started_at: IsoDateSchema,
  updated_at: IsoDateSchema,
});
export type PracticeSession = z.infer<typeof PracticeSession>;

export const TABLES = {
  users: 'users',
  module_progress: 'module_progress',
  lesson_progress: 'lesson_progress',
  prefs_user: 'prefs_user',
  simulator_attempts: 'simulator_attempts',
  drill_stagegate: 'drill_stagegate',
  traps_tag: 'traps_tag',
  mistakes_profile: 'mistakes_profile',
  srs_queue: 'srs_queue',
  rr_recordings_meta: 'rr_recordings_meta',
  rr_reviews: 'rr_reviews',
  journal_entries: 'journal_entries',
  calibration_attempts: 'calibration_attempts',
  practice_sessions: 'practice_sessions',
  drill_runs: 'drill_runs',
} as const;
