import { supabase } from '@/integrations/supabase/client';

/**
 * Mark a note read the first time the student opens it, and clear the bell
 * entry that pointed at it.
 *
 * "Read" is `status: 'started'`. That value was already declared on
 * ClassroomItemStatus and had no writer anywhere in the app, and it means
 * exactly this for a note: opened, not necessarily finished. It leaves
 * 'completed' free for the Mark done control, so a student can have read a
 * note without having marked it done, which is the common case.
 *
 * Both writes are what the database already allows a student to do to their
 * own rows. classroom_items: the student update policy is scoped to
 * `student_id = auth.uid()` and its guard trigger permits status,
 * completed_at and metadata_json only. notifications: the student policy is
 * scoped to `user_id = auth.uid()` and its guard permits the read flag alone,
 * and refuses to flip it back to false.
 */
export async function markNoteRead(itemId: string) {
  // Guarded on 'assigned', which makes this idempotent: a note already read
  // stays read, and one already marked done is never demoted back to read.
  const { error } = await supabase
    .from('classroom_items')
    .update({ status: 'started' })
    .eq('id', itemId)
    .eq('status', 'assigned');
  if (error) throw error;

  await clearNoteNotifications(itemId);
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
