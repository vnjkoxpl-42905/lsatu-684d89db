import { supabase } from '@/integrations/supabase/client';
export type NativeLabKind = 'main-conclusion' | 'structure' | 'conclusion-type';
export interface NativeLabSubmission {
  id: string; user_id: string; drill_id: string; question_id: string; mode: 'native_lab_v1';
  selected_answer: string; correct: boolean;
}
export async function saveNativeLabSubmission(submission: NativeLabSubmission): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user || user.id !== submission.user_id) throw new Error('The signed-in account changed. Your answer has not been saved.');
  const { data, error } = await supabase.from('intro_lr_attempts').insert(submission).select('*').single();
  if (!error && data && matches(data, submission)) return;
  // A response can be lost after the server inserts it. Reconcile the same UUID,
  // never generate a replacement submission or modify an existing attempt.
  const existing = await supabase.from('intro_lr_attempts').select('*').eq('user_id', submission.user_id).eq('id', submission.id).maybeSingle();
  if (!existing.error && existing.data && matches(existing.data, submission)) return;
  throw error ?? existing.error ?? new Error('The account did not acknowledge this saved answer.');
}
function matches(row: Record<string, unknown>, expected: NativeLabSubmission): boolean {
  return Object.entries(expected).every(([key, value]) => row[key] === value);
}
