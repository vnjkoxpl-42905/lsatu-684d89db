import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * One row per conversation whose newest message is unread and came from an
 * instructor. This is everything the drill hub's Today feed needs from
 * Messages, and nothing else.
 */
export interface InstructorMessage {
  conversationId: string;
  subject: string | null;
  body: string;
  createdAt: string;
}

export const instructorMessagesQueryKey = (userId: string | undefined) =>
  ['instructor-messages', userId] as const;

/**
 * The hub used to reach for `useInbox` to find these rows. That hook builds
 * the full inbox: six sequential reads including every participant of every
 * thread, their display names and last-seen instants, and an attachment scan
 * across all messages, plus an unfiltered realtime subscription. Traced on the
 * shipped hub (2026-09-09) those reads ran out to 4.5 s and sat on the same
 * connection as the auth chain the hero waits on.
 *
 * This hook asks the two questions the feed actually has: which of my threads
 * has a newer message than I have read, and was it Joshua who sent it. Two
 * reads when nothing is unread (the common case), four when something is.
 * The result is cached under a stable key so two mounts share one fetch.
 */
export function useInstructorMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery<InstructorMessage[]>({
    queryKey: instructorMessagesQueryKey(userId),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => loadInstructorMessages(userId!),
  });

  // Realtime keeps the feed honest across tabs; the `inbox:read` event keeps
  // it honest in this tab the instant a thread is opened. Both just invalidate.
  useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: instructorMessagesQueryKey(userId) });
    };
    window.addEventListener('inbox:read', invalidate);
    const channel = supabase
      .channel(`instructor-messages-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, invalidate)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        invalidate,
      )
      .subscribe();
    return () => {
      window.removeEventListener('inbox:read', invalidate);
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return query;
}

export async function loadInstructorMessages(userId: string): Promise<InstructorMessage[]> {
  const { data: parts, error: partsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);
  if (partsError) throw partsError;

  const rows = parts ?? [];
  if (rows.length === 0) return [];

  const lastReadMap = new Map<string, number>(
    rows.map((p) => [p.conversation_id, p.last_read_at ? new Date(p.last_read_at).getTime() : 0]),
  );

  // Newest message per thread, computed in Postgres: one row per conversation.
  const { data: latest, error: latestError } = await supabase
    .rpc('get_latest_messages', { conv_ids: Array.from(lastReadMap.keys()) });
  if (latestError) throw latestError;

  const unread = (latest ?? []).filter(
    (m) =>
      m.sender_id !== userId &&
      new Date(m.created_at).getTime() > (lastReadMap.get(m.conversation_id) ?? 0),
  );
  if (unread.length === 0) return [];

  // Only now do we need to know who sent them. The RPC runs SECURITY DEFINER
  // and answers only for users who share a thread with the caller.
  const senderIds = Array.from(new Set(unread.map((m) => m.sender_id)));
  const { data: senders, error: sendersError } = await supabase
    .rpc('get_conversation_participant_names', { _user_ids: senderIds });
  if (sendersError) throw sendersError;
  const adminIds = new Set(
    ((senders ?? []) as Array<{ user_id: string; is_admin: boolean }>)
      .filter((s) => s.is_admin)
      .map((s) => s.user_id),
  );

  const fromInstructor = unread.filter((m) => adminIds.has(m.sender_id));
  if (fromInstructor.length === 0) return [];

  const { data: convs, error: convsError } = await supabase
    .from('conversations')
    .select('id, subject')
    .in('id', fromInstructor.map((m) => m.conversation_id));
  if (convsError) throw convsError;
  const subjectMap = new Map((convs ?? []).map((c) => [c.id, c.subject as string | null]));

  return fromInstructor
    .map((m) => ({
      conversationId: m.conversation_id,
      subject: subjectMap.get(m.conversation_id) ?? null,
      body: m.body,
      createdAt: m.created_at,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
