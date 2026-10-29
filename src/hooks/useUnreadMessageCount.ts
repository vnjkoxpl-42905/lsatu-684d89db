import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 500;

/** Count incoming messages, not conversations, without the API's default row cap. */
export async function loadUnreadMessageCount(userId: string): Promise<number> {
  const participants: Array<{ conversation_id: string; last_read_at: string | null }> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from('conversation_participants')
      .select('conversation_id, last_read_at').eq('user_id', userId)
      .order('conversation_id', { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    participants.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }
  const uniqueParticipants = [...new Map(participants.map((participant) => [participant.conversation_id, participant])).values()];
  let total = 0;
  // Each bounded batch keeps every conversation's own watermark while a
  // server-side exact count avoids transferring or truncating message history.
  for (let offset = 0; offset < uniqueParticipants.length; offset += 25) {
    const conditions = uniqueParticipants.slice(offset, offset + 25).map((participant) =>
      `and(conversation_id.eq.${participant.conversation_id},created_at.gt.${participant.last_read_at ?? '1970-01-01T00:00:00.000Z'})`,
    );
    const { count, error } = await supabase.from('messages')
      .select('id', { count: 'exact', head: true }).neq('sender_id', userId)
      .or(conditions.join(','));
    if (error) throw error;
    total += count ?? 0;
  }
  return total;
}

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const userId = user?.id;
  const actor = useRef(userId);
  actor.current = userId;
  const generation = useRef(0);
  const [state, setState] = useState({ userId, count: 0 });
  const load = useCallback(async () => {
    const request = ++generation.current;
    if (!userId) return;
    try {
      const count = await loadUnreadMessageCount(userId);
      if (request === generation.current && actor.current === userId) setState({ userId, count });
    } catch (error) {
      console.warn('[inbox] unread count failed:', error);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    if (!userId) return;
    const handleRead = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === userId) void load();
    };
    window.addEventListener('inbox:read', handleRead);
    const channel = supabase.channel(`inbox-unread-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, () => void load())
      .subscribe();
    return () => {
      ++generation.current;
      window.removeEventListener('inbox:read', handleRead);
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return state.userId === userId ? state.count : 0;
}
