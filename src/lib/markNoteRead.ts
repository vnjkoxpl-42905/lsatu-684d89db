import { supabase } from '@/integrations/supabase/client';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

/**
 * Mark a note read the first time the student opens it, and clear the bell
 * entry that pointed at it.
 *
 * Read state lives in `metadata_json.read_at`, not in `status`.
 *
 * The obvious move was `status: 'started'` — the value is declared on
 * ClassroomItemStatus and had no writer anywhere in the app. That turned out
 * to be *why*: the database's classroom_items_status_check rejects it, so
 * every such write fails with a 400 and the type is lying about what the
 * column accepts. The constraint allows assigned, in_progress, completed and
 * archived. 'in_progress' would have been writable, but calling a note
 * in-progress overloads the work vocabulary with a reading concept and
 * collides with the Mark done control.
 *
 * metadata_json is unconstrained, and the classroom_items student-update guard
 * trigger permits it alongside status and completed_at, so this is a write the
 * database already sanctions for a student on their own row.
 */
export async function markNoteRead(item: ClassroomItem) {
  if (isReadInMetadata(item)) {
    await clearNoteNotifications(item.id);
    return;
  }
  // Merged rather than replaced: metadata_json already carries `kind`, and on
  // a drill-linked note the assignment id too. A blind overwrite would drop them.
  const next = { ...(item.metadata_json ?? {}), read_at: new Date().toISOString() };
  const { error } = await supabase
    .from('classroom_items')
    .update({ metadata_json: next })
    .eq('id', item.id);
  if (error) throw error;

  await clearNoteNotifications(item.id);
}

export function isReadInMetadata(item: Pick<ClassroomItem, 'metadata_json' | 'status'>) {
  // A note the student marked done is read by definition, whatever the metadata says.
  if (item.status === 'completed') return true;
  const at = (item.metadata_json ?? {})['read_at'];
  return typeof at === 'string' && at.length > 0;
}

/**
 * Clear any unread bell entry that points at this note.
 *
 * Matched on the item id appearing anywhere in `link` rather than on an exact
 * route, because a note can be announced by more than one notification and
 * older ones were written with a different path.
 */
export async function clearNoteNotifications(itemId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .like('link', `%${itemId}%`)
    .eq('read', false);
  // A stale bell entry is a much smaller problem than a note that will not
  // open, so this never propagates.
  if (error) console.warn('could not clear note notification', error);
}
