import { supabase } from '@/integrations/supabase/client';
import { parseLocalDay } from '@/lib/localDate';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

export const READING_CENTER_PATH = '/reading-center';
export const READING_CENTER_SOURCE = 'reading_center';

export function isReadingCenterAssignment(item: Pick<ClassroomItem, 'type' | 'source_table' | 'source_id'>): boolean {
  return item.type === 'activity' && item.source_table === READING_CENTER_SOURCE && item.source_id === 'library';
}

export async function hasReadingCenterAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_reading_center_access' as never);
  if (error) throw error;
  return data === true;
}

export async function assignReadingCenter(input: {
  studentId: string;
  scheduledForLocalDate?: string;
  title?: string;
  description?: string;
}): Promise<{ item: ClassroomItem; reused: boolean }> {
  const day = input.scheduledForLocalDate ? parseLocalDay(input.scheduledForLocalDate) : null;
  if (input.scheduledForLocalDate && !day) throw new Error('Choose a valid assignment date.');
  const { data, error } = await supabase.rpc('assign_reading_center' as never, {
    p_student_id: input.studentId,
    p_unlock_at: day?.toISOString() ?? null,
    p_title: input.title?.trim() || 'Reading Center',
    p_description: input.description?.trim() || 'Practice reading articles with five reading modes, bookmarks and reading goals.',
  } as never);
  if (error) throw error;
  const result = data as unknown as { item?: ClassroomItem; reused?: boolean } | null;
  if (!result?.item?.id || result.item.student_id !== input.studentId || !isReadingCenterAssignment(result.item) || !result.item.visible_to_student) {
    throw new Error('Reading Center assignment could not be verified. Refresh before trying again.');
  }
  // Verify a second database read, rather than treating an RPC acknowledgement
  // as proof that the student's launcher is present.
  const { data: saved, error: readError } = await supabase.from('classroom_items')
    .select('*').eq('id', result.item.id).eq('student_id', input.studentId).single();
  if (readError) throw readError;
  const item = saved as ClassroomItem;
  if (!isReadingCenterAssignment(item) || !item.visible_to_student || !['assigned', 'in_progress', 'completed'].includes(item.status)) {
    throw new Error('Reading Center assignment is not available to this student.');
  }
  return { item, reused: result.reused === true };
}

export async function revokeReadingCenter(studentId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_reading_center' as never, { p_student_id: studentId } as never);
  if (error) throw error;
}
