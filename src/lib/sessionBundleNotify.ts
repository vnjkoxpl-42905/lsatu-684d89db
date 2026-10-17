import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { getOrCreateAdminStudentConversation } from '@/lib/adminConversation';

/**
 * Session-note notifier (build-spec §6). Distinct from
 * `notifyStudentOfClassroomItem`, which hardcodes "New assignment:" copy and is
 * correct only for homework/assignment parts. A session recap is NOT an
 * assignment, so it gets its own copy and notification type.
 *
 * Posts a chat message authored AS Joshua into the 1:1 thread and a bell
 * notification, both pointing at the recap in the student's Classroom. Reuses
 * the existing admin↔student conversation resolver and the notifications table.
 *
 * Non-throwing per channel: returns granular flags so partial success is
 * surfaced truthfully, never faked. No source labels ("AI", "transcript",
 * "Gemini") ever appear in the copy.
 */
export interface SessionNotifyResult {
  inbox_ok: boolean;
  bell_ok: boolean;
  inbox_error?: string;
  bell_error?: string;
}

interface SessionNotifyParams {
  admin: User;
  studentId: string;
  /** Path to the recap, e.g. /classroom/item/<id> */
  route: string;
  /**
   * Optional approved chat copy authored in review. When omitted, a short
   * default in the coaching voice is used. Never machine-labeled.
   */
  message?: string;
}

const DEFAULT_MESSAGE =
  'I left a recap from our session in your Classroom. Take a look when you get a chance, then we keep building from there.';

export async function notifyStudentOfSessionRecap(
  params: SessionNotifyParams,
): Promise<SessionNotifyResult> {
  const { admin, studentId, route } = params;
  const result: SessionNotifyResult = { inbox_ok: false, bell_ok: false };
  const body = (params.message?.trim() || DEFAULT_MESSAGE) + `\n\n${route}`;

  try {
    const conversationId = await getOrCreateAdminStudentConversation(admin, studentId);
    const { error: mErr } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: admin.id,
      body,
    });
    if (mErr) throw mErr;
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
    result.inbox_ok = true;
  } catch (e) {
    console.error('[sessionBundleNotify:inbox] failed', { studentId, error: e });
    result.inbox_error = e instanceof Error ? e.message : 'inbox failed';
  }

  try {
    const { error: nErr } = await supabase.from('notifications').insert({
      user_id: studentId,
      type: 'message',
      title: 'New recap in your Classroom',
      body: 'A recap from your latest session is ready.',
      link: route,
    });
    if (nErr) throw nErr;
    result.bell_ok = true;
  } catch (e) {
    console.error('[sessionBundleNotify:bell] failed', { studentId, error: e });
    result.bell_error = e instanceof Error ? e.message : 'bell failed';
  }

  return result;
}
