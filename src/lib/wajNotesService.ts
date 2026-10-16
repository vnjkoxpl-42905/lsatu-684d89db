/**
 * wajNotesService — user-scoped reflection notes keyed by (class_id, qid).
 *
 * Matches the natural upsert key in wajService. Table: wrong_answer_journal_notes.
 * Errors are never swallowed — callers must surface failures.
 */

import { supabase } from '@/integrations/supabase/client';

export type ReviewStatus = 'unreviewed' | 'in_progress' | 'mastered';

/** Student's self-assessment of how they did. Drives the journal's outcome buckets. */
export type SelfRating = 'correct' | 'unsure' | 'wrong';

/** A single freehand pen stroke drawn over the question (input-space points). */
export interface AnnotationStroke {
  points: number[]; // flat [x0, y0, x1, y1, ...] in 0..1 normalized coords
  color?: string;
  size?: number;
}

export interface WAJNote {
  id: string;
  user_id: string;
  class_id: string;
  qid: string;
  // Legacy reflection fields (kept for back-compat)
  root_cause: string | null;
  trap_pattern: string | null;
  student_note: string | null;
  next_action: string | null;
  review_status: ReviewStatus;
  reattempt_due_at: string | null; // ISO date string YYYY-MM-DD
  // Journal v2 fields
  self_rating: SelfRating | null;
  date_taken: string | null; // ISO date YYYY-MM-DD
  question_summary: string | null;
  wrong_answer: string | null; // chosen answer letter
  wrong_reasoning: string | null;
  correct_reasoning: string | null;
  lesson: string | null;
  other_notes: string | null;
  annotations: AnnotationStroke[] | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

function toAnnotations(raw: unknown): AnnotationStroke[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (s): s is AnnotationStroke =>
      !!s && typeof s === 'object' && Array.isArray((s as AnnotationStroke).points),
  );
}

function toNote(row: Record<string, unknown>): WAJNote {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    class_id: row.class_id as string,
    qid: row.qid as string,
    root_cause: (row.root_cause as string | null) ?? null,
    trap_pattern: (row.trap_pattern as string | null) ?? null,
    student_note: (row.student_note as string | null) ?? null,
    next_action: (row.next_action as string | null) ?? null,
    review_status: (row.review_status as ReviewStatus) ?? 'unreviewed',
    reattempt_due_at: (row.reattempt_due_at as string | null) ?? null,
    self_rating: (row.self_rating as SelfRating | null) ?? null,
    date_taken: (row.date_taken as string | null) ?? null,
    question_summary: (row.question_summary as string | null) ?? null,
    wrong_answer: (row.wrong_answer as string | null) ?? null,
    wrong_reasoning: (row.wrong_reasoning as string | null) ?? null,
    correct_reasoning: (row.correct_reasoning as string | null) ?? null,
    lesson: (row.lesson as string | null) ?? null,
    other_notes: (row.other_notes as string | null) ?? null,
    annotations: toAnnotations(row.annotations),
    title: (row.title as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Fetch all notes for a class, returned as a Map keyed by qid. */
export async function getNotesForClass(classId: string): Promise<Map<string, WAJNote>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();

  // Table not yet in generated types — cast result, not client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('wrong_answer_journal_notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('class_id', classId);

  if (error) throw error;

  const map = new Map<string, WAJNote>();
  for (const row of data ?? []) {
    const note = toNote(row as Record<string, unknown>);
    map.set(note.qid, note);
  }
  return map;
}

/** Upsert a note for a single (class_id, qid) pair. Partial updates are merged. */
export async function upsertNote(params: {
  class_id: string;
  qid: string;
  root_cause?: string | null;
  trap_pattern?: string | null;
  student_note?: string | null;
  next_action?: string | null;
  review_status?: ReviewStatus;
  reattempt_due_at?: string | null;
  self_rating?: SelfRating | null;
  date_taken?: string | null;
  question_summary?: string | null;
  wrong_answer?: string | null;
  wrong_reasoning?: string | null;
  correct_reasoning?: string | null;
  lesson?: string | null;
  other_notes?: string | null;
  annotations?: AnnotationStroke[] | null;
  title?: string | null;
}): Promise<WAJNote> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload: Record<string, unknown> = {
    user_id: user.id,
    class_id: params.class_id,
    qid: params.qid,
  };
  if (params.root_cause !== undefined) payload.root_cause = params.root_cause;
  if (params.trap_pattern !== undefined) payload.trap_pattern = params.trap_pattern;
  if (params.student_note !== undefined) payload.student_note = params.student_note;
  if (params.next_action !== undefined) payload.next_action = params.next_action;
  if (params.review_status !== undefined) payload.review_status = params.review_status;
  if (params.reattempt_due_at !== undefined) payload.reattempt_due_at = params.reattempt_due_at;
  if (params.self_rating !== undefined) payload.self_rating = params.self_rating;
  if (params.date_taken !== undefined) payload.date_taken = params.date_taken;
  if (params.question_summary !== undefined) payload.question_summary = params.question_summary;
  if (params.wrong_answer !== undefined) payload.wrong_answer = params.wrong_answer;
  if (params.wrong_reasoning !== undefined) payload.wrong_reasoning = params.wrong_reasoning;
  if (params.correct_reasoning !== undefined) payload.correct_reasoning = params.correct_reasoning;
  if (params.lesson !== undefined) payload.lesson = params.lesson;
  if (params.other_notes !== undefined) payload.other_notes = params.other_notes;
  if (params.annotations !== undefined) payload.annotations = params.annotations;
  if (params.title !== undefined) payload.title = params.title;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('wrong_answer_journal_notes')
    .upsert(payload, { onConflict: 'user_id,class_id,qid' })
    .select('*')
    .single();

  if (error) throw error;
  return toNote(data as Record<string, unknown>);
}
