/**
 * Source-Backed Slot types (per handoff §6 + architecture-plan.md §1.4).
 * Components that visually hide source identity are rejected at review.
 */

export type SourceItemId = string;
export type LessonId = `MC-LSN-${number}.${number}`;
export type ReferenceId = `MC-REF-${string}`;
export type DrillId = `MC-DRL-${string}`;
export type SimulatorSectionId = `MC-SIM-${string}`;
export type HardSentencesId = `MC-HSL-${string}`;
export type DiagnosticsId = `MC-DIA-${string}`;
export type NamedToolId = `NT-${string}`;
export type IndicatorId = `IND-${string}`;
export type WorkedExampleId = `EX-${string}`;
export type VoicePassageId = `VP-${string}`;
export type QuestionId = `MC-SIM-Q${number}` | `MC-DRL-${string}-Q${number}` | `MC-CAL-${string}-Q${number}`;

export type TrapTraitId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';

export type ParityStatus = 'specced' | 'scaffolded' | 'implemented' | 'verified' | 'drift';
export type ReviewQueueStatus = 'queued' | 'due' | 'completed' | 'lapsed';

export interface SourceBackedSlots {
  source_item_id?: SourceItemId;
  question_id?: QuestionId;
  lesson_id?: LessonId;
  reference_id?: ReferenceId;
  named_tool_id?: NamedToolId;
  trap_tag?: TrapTraitId;
  correct_choice_id?: string;
  review_queue_status?: ReviewQueueStatus;
  parity_status?: ParityStatus;
}

/** Argument-structure role for a sentence/claim. Maps to --role-* CSS tokens. */
export type ArgumentRole =
  | 'conclusion'
  | 'premise'
  | 'pivot'
  | 'opposing'
  | 'concession'
  | 'background'
  | 'intermediate-conclusion';
