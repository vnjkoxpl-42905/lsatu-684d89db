import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Admin-side helper. Returns the conversation id for the canonical 1:1
 * thread between the current admin and a chosen student. Creates the
 * thread if one does not exist yet.
 *
 * Admins are permitted by RLS to insert into conversations and
 * conversation_participants directly, so this is a pure client-side
 * resolver — no RPC required. The student-direction equivalent
 * (get_or_create_joshua_conversation) needs SECURITY DEFINER because
 * student INSERTs are blocked by RLS.
 */
export async function getOrCreateAdminStudentConversation(
  admin: User,
  studentId: string,
): Promise<string> {
  if (!admin?.id) throw new Error('Admin user is required');
  if (!studentId) throw new Error('Student id is required');
  if (admin.id === studentId) throw new Error('Cannot start a thread with yourself');

  // Look for an existing 1:1 by intersecting both users' participant rows.
  const { data: mineRows, error: mineErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', admin.id);
  if (mineErr) throw mineErr;

  const myConvIds = (mineRows ?? []).map((r) => r.conversation_id);
  if (myConvIds.length > 0) {
    const { data: theirRows, error: theirErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', studentId)
      .in('conversation_id', myConvIds);
    if (theirErr) throw theirErr;
    const existing = (theirRows ?? [])[0]?.conversation_id;
    if (existing) return existing;
  }

  // Create new conversation. created_by must be auth.uid() per RLS.
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ created_by: admin.id, last_message_at: new Date().toISOString() })
    .select('id')
    .single();
  if (convErr || !conv) throw convErr ?? new Error('Failed to create conversation');

  const now = new Date().toISOString();
  const { error: partErr } = await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: admin.id, last_read_at: now },
    { conversation_id: conv.id, user_id: studentId, last_read_at: now },
  ]);
  if (partErr) throw partErr;

  return conv.id as string;
}
