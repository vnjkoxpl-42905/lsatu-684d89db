import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * How many messages are waiting for the signed-in user, counted as MESSAGES and
 * not as threads.
 *
 * `useInbox` already exposes an `unreadCount`, but it counts conversations, so a
 * student with one thread can only ever see "1" no matter how many replies are
 * sitting there. The rail badge is supposed to read 1 / 2 / 3, so it needs this.
 *
 * This is deliberately NOT `useInbox`: the rail is mounted on every classroom
 * page, and `useInbox` runs six sequential queries plus an unfiltered realtime
 * subscription to build full thread rows the rail never draws. Two small reads
 * are the whole cost here.
 */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }

    const { data: parts, error: partsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);
    if (partsError) {
      // A failed count must not invent a number: leave the badge as it was.
      console.warn('[inbox] unread count participants read failed:', partsError.message);
      return;
    }

    const rows = parts ?? [];
    if (rows.length === 0) {
      setCount(0);
      return;
    }

    // A null last_read_at means the thread has never been opened, so every
    // message in it is unread — which is exactly what the epoch floor gives.
    const lastReadMap = new Map<string, number>(
      rows.map((p) => [p.conversation_id, p.last_read_at ? new Date(p.last_read_at).getTime() : 0]),
    );
    const earliest = Math.min(...lastReadMap.values());

    // Bound the read at the oldest last-read instant and drop the caller's own
    // messages server-side, so this stays a small payload rather than the
    // whole message history.
    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', Array.from(lastReadMap.keys()))
      .neq('sender_id', user.id)
      .gt('created_at', new Date(earliest).toISOString());
    if (msgsError) {
      console.warn('[inbox] unread count messages read failed:', msgsError.message);
      return;
    }

    setCount(
      (msgs ?? []).filter(
        (m) => new Date(m.created_at).getTime() > (lastReadMap.get(m.conversation_id) ?? 0),
      ).length,
    );
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Clear immediately in the current tab when a thread is opened. Realtime
  // remains the cross-tab/server source of truth, but should not be required
  // for a badge the teacher just acted on to disappear.
  useEffect(() => {
    const handleRead = () => void load();
    window.addEventListener('inbox:read', handleRead);
    return () => window.removeEventListener('inbox:read', handleRead);
  }, [load]);

  // The badge has to move the moment a message lands, and has to clear the
  // moment the thread is opened (which writes last_read_at), so both tables are
  // watched.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      // Unique per subscription: the rail is rendered twice (desktop aside +
      // mobile sheet), and two channels sharing one topic collide.
      .channel(`inbox-unread-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => void load(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  return count;
}
