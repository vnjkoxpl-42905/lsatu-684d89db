import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/** How long a received typing event keeps the indicator lit. */
export const TYPING_DECAY_MS = 5000;
/** Minimum spacing between outgoing typing broadcasts. */
export const TYPING_THROTTLE_MS = 2000;

interface TypingPayload {
  user_id: string;
  stopped?: boolean;
}

type Listener = (payload: TypingPayload) => void;

interface ChannelEntry {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
  refs: number;
}

// One realtime channel per conversation per client, shared across mounted
// views (Inbox + FloatingMessenger can hold the same thread at once — two
// subscriptions on one topic collide, same failure mode useUnreadMessageCount
// had to dodge).
const channelRegistry = new Map<string, ChannelEntry>();

function acquireChannel(conversationId: string, listener: Listener): () => void {
  let entry = channelRegistry.get(conversationId);
  if (!entry) {
    const listeners = new Set<Listener>();
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const typed = payload as TypingPayload | undefined;
        if (!typed?.user_id) return;
        listeners.forEach((fn) => fn(typed));
      })
      .subscribe();
    entry = { channel, listeners, refs: 0 };
    channelRegistry.set(conversationId, entry);
  }
  entry.refs += 1;
  entry.listeners.add(listener);

  return () => {
    const current = channelRegistry.get(conversationId);
    if (!current) return;
    current.listeners.delete(listener);
    current.refs -= 1;
    if (current.refs <= 0) {
      channelRegistry.delete(conversationId);
      void supabase.removeChannel(current.channel);
    }
  };
}

/**
 * Live typing signal for a 1:1 thread over a Supabase broadcast channel —
 * no tables, no RLS. Call `broadcastTyping()` on every keystroke (throttled
 * internally) and `broadcastStopped()` on send/blur; `otherTyping` lights up
 * when the other participant is composing and decays after TYPING_DECAY_MS.
 */
export function useTypingIndicator(conversationId: string | null, ownUserId: string | null) {
  const [otherTyping, setOtherTyping] = useState(false);
  const decayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);
  const entryRef = useRef<{ conversationId: string } | null>(null);

  useEffect(() => {
    setOtherTyping(false);
    if (!conversationId || !ownUserId) {
      entryRef.current = null;
      return;
    }
    entryRef.current = { conversationId };

    const release = acquireChannel(conversationId, (payload) => {
      if (payload.user_id === ownUserId) return;
      if (decayRef.current) clearTimeout(decayRef.current);
      if (payload.stopped) {
        setOtherTyping(false);
        return;
      }
      setOtherTyping(true);
      decayRef.current = setTimeout(() => setOtherTyping(false), TYPING_DECAY_MS);
    });

    return () => {
      release();
      if (decayRef.current) clearTimeout(decayRef.current);
    };
  }, [conversationId, ownUserId]);

  const sendEvent = useCallback(
    (stopped: boolean) => {
      if (!conversationId || !ownUserId) return;
      const entry = channelRegistry.get(conversationId);
      if (!entry) return;
      void entry.channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: ownUserId, stopped } satisfies TypingPayload,
      });
    },
    [conversationId, ownUserId],
  );

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_THROTTLE_MS) return;
    lastSentRef.current = now;
    sendEvent(false);
  }, [sendEvent]);

  const broadcastStopped = useCallback(() => {
    lastSentRef.current = 0;
    sendEvent(true);
  }, [sendEvent]);

  return { otherTyping, broadcastTyping, broadcastStopped };
}
