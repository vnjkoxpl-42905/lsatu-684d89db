/**
 * wajNotesService — user-scoped reflection notes keyed by (class_id, qid).
 *
 * Matches the natural upsert key in wajService. Table: wrong_answer_journal_notes.
 * Errors are never swallowed — callers must surface failures.
 */

import { supabase } from '@/integrations/supabase/client';

export type ReviewStatus = 'unreviewed' | 'in_progress' | 'mastered';

export interface WAJNote {
  id: string;
  user_id: string;
  class_id: string;
  qid: string;
  root_cause: string | null;
  trap_pattern: string | null;
  student_note: string | null;
  next_action: string | null;
  review_status: ReviewStatus;
  reattempt_due_at: string | null; // ISO date string YYYY-MM-DD
  created_at: string;
  updated_at: string;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('wrong_answer_journal_notes')
    .upsert(payload, { onConflict: 'user_id,class_id,qid' })
    .select('*')
    .single();

  if (error) throw error;
  return toNote(data as Record<string, unknown>);
}
