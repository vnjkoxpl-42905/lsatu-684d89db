/**
 * flaggedService — the service layer `flagged_questions` never had.
 *
 * A flag is a come-back-to-this marker the student raises mid-question, from
 * Drill or either Blind Review flow. It is NOT a record of a missed question;
 * that is the Wrong Answer Journal (`wrong_answer_journal`), a different table
 * with a different meaning.
 *
 * Before this, the table was queried inline in five components. Anything new
 * should come through here.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Derived from the generated schema rather than hand-written. The old page
 * declared its own local interface listing only six of the eleven columns,
 * which is how `class_id`, `level` and `qtype` went missing.
 */
export type FlaggedQuestionRow =
  Database['public']['Tables']['flagged_questions']['Row'];

/** The shape needed to put a flag back after an accidental unflag. */
export type FlagRestorePayload =
  Database['public']['Tables']['flagged_questions']['Insert'];

export function flagLabel(row: Pick<FlaggedQuestionRow, 'pt' | 'section' | 'qnum'>) {
  return `PT${row.pt}-S${row.section}-Q${row.qnum}`;
}

export async function listFlagged(userId: string): Promise<FlaggedQuestionRow[]> {
  const { data, error } = await supabase
    .from('flagged_questions')
    .select('*')
    .eq('user_id', userId)
    .order('flagged_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FlaggedQuestionRow[];
}

export async function updateFlagNote(id: string, note: string): Promise<void> {
  // `.select()` matters: an RLS-blocked UPDATE returns success with zero rows
  // rather than an error, so without this the UI would report "saved" for a
  // write that never happened.
  const { data, error } = await supabase
    .from('flagged_questions')
    .update({ note: note.trim() ? note : null })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('That note was not saved. You may not have permission to edit this flag.');
  }
}

export async function unflag(id: string): Promise<void> {
  const { error } = await supabase.from('flagged_questions').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Puts an unflagged question back. The row gets a fresh id (the original is
 * gone) but `flagged_at` is preserved, so undo does not silently reorder the
 * list under the student.
 */
export async function restoreFlag(
  payload: FlagRestorePayload,
): Promise<FlaggedQuestionRow> {
  const { data, error } = await supabase
    .from('flagged_questions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as FlaggedQuestionRow;
}
