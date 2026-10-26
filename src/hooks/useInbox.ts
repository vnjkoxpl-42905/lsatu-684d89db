import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  home_cleared_at?: string | null;
  display_name?: string | null;
  is_admin?: boolean;
  last_seen_at?: string | null;
}

export interface Conversation {
  id: string;
  subject: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string;
  participants: Participant[];
  last_message?: { body: string; created_at: string; sender_id: string } | null;
  unread: boolean;
  /**
   * The viewer's own Home card is cleared through this instant. A message at or
   * before it is not news on Home; a newer one is. Null means never cleared.
   * Server state, so every device and every surface agrees without a sync step.
   */
  home_cleared_at: string | null;
  hasAttachments: boolean;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  storage_path: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  kind?: 'storage' | 'drive' | null;
  web_view_link?: string | null;
  drive_file_id?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  attachments: MessageAttachment[];
}

export function useInbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Get conversations the user participates in. A swallowed error here (and
    // in each read below) yielded null -> an empty inbox rendered as if the
    // student had no messages: a swallowed-error AND a truthful-UI violation.
    // On any failure we set an error, KEEP the prior conversations, and stop.
    const { data: myParts, error: partsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, home_cleared_at')
      .eq('user_id', user.id);
    if (partsError) {
      console.error('[inbox] load participants failed:', partsError);
      setError('Could not load your messages');
      setLoading(false);
      return;
    }

    const convIds = (myParts ?? []).map((p) => p.conversation_id);
    if (convIds.length === 0) {
      setError(null);
      setConversations([]);
      setLoading(false);
      return;
    }

    const lastReadMap = new Map<string, number>(
      (myParts ?? []).map((p) => [
        p.conversation_id,
        p.last_read_at ? new Date(p.last_read_at).getTime() : 0,
      ])
    );

    const homeClearedMap = new Map<string, string | null>(
      (myParts ?? []).map((p) => [p.conversation_id, p.home_cleared_at ?? null])
    );

    const { data: convs, error: convsError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });
    if (convsError) {
      console.error('[inbox] load conversations failed:', convsError);
      setError('Could not load your messages');
      setLoading(false);
      return;
    }

    const { data: allParts, error: allPartsError } = await supabase
      .from('conversation_participants')
      .select('id, conversation_id, user_id, last_read_at')
      .in('conversation_id', convIds);
    if (allPartsError) {
      console.error('[inbox] load all participants failed:', allPartsError);
      setError('Could not load your messages');
      setLoading(false);
      return;
    }

    // Resolve display names via SECURITY DEFINER RPC — RLS on `profiles` blocks
    // non-admin cross-user SELECTs, so a direct `.from('profiles').select(...)`
    // silently drops the admin row and leaves the thread titled "Conversation".
    // The RPC returns display_name only for users who share a conversation with
    // the caller.
    const userIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id)));
    const { data: nameRows, error: namesError } = await supabase
      .rpc('get_conversation_participant_names', { _user_ids: userIds });
    if (namesError) {
      // Non-fatal: names just fall back to "Conversation". Warn, don't blank.
      console.warn('[inbox] participant names RPC failed:', namesError.message);
    }
    const rows = (nameRows ?? []) as Array<{
      user_id: string;
      display_name: string | null;
      is_admin: boolean;
      last_seen_at: string | null;
    }>;
    const nameMap = new Map(rows.map((r) => [r.user_id, r.display_name]));
    const lastSeenMap = new Map(rows.map((r) => [r.user_id, r.last_seen_at]));
    // RLS on user_roles blocks students from reading other users' roles, so
    // admin status is sourced from the RPC (which runs SECURITY DEFINER).
    const adminSet = new Set(rows.filter((r) => r.is_admin).map((r) => r.user_id));

    // Last message per conversation via DISTINCT ON RPC (get_latest_messages):
    // exactly one row per conversation, computed in Postgres, no full-table
    // download. Replaces the H22 .limit() stopgap that fetched a bounded slice of
    // recent messages. RLS on `messages` still governs via SECURITY INVOKER.
    const { data: msgs, error: msgsError } = await supabase
      .rpc('get_latest_messages', { conv_ids: convIds });
    if (msgsError) {
      console.error('[inbox] load messages failed:', msgsError);
      setError('Could not load your messages');
      setLoading(false);
      return;
    }
    const lastMsgMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
    for (const m of msgs ?? []) {
      lastMsgMap.set(m.conversation_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id });
    }

    // Match the rail badge: a conversation is unread when it contains any
    // incoming message newer than this viewer's read timestamp, even if a
    // later message in the thread was sent by the viewer.
    const oldestReadAt = Math.min(...lastReadMap.values());
    const { data: unreadMessages, error: unreadMessagesError } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .gt('created_at', new Date(oldestReadAt).toISOString());
    if (unreadMessagesError) {
      console.error('[inbox] load unread messages failed:', unreadMessagesError);
      setError('Could not load your messages');
      setLoading(false);
      return;
    }
    const unreadConversationIds = new Set(
      (unreadMessages ?? [])
        .filter((m) => new Date(m.created_at).getTime() > (lastReadMap.get(m.conversation_id) ?? 0))
        .map((m) => m.conversation_id),
    );

    // Per-conversation attachment presence via RPC — exact across ALL messages in
    // the conversation. The old stopgap only inspected recently-fetched messages,
    // so an attachment older than the cutoff lost its paperclip. Non-fatal: on
    // failure the indicator is simply missing, so warn (don't blank the inbox).
    const attachmentConvIds = new Set<string>();
    const { data: attConvs, error: attsError } = await supabase
      .rpc('get_conversations_with_attachments', { conv_ids: convIds });
    if (attsError) {
      console.warn('[inbox] attachment presence read failed:', attsError.message);
    }
    for (const row of attConvs ?? []) {
      attachmentConvIds.add(row.conversation_id);
    }

    const enriched: Conversation[] = (convs ?? []).map((c) => {
      const parts = (allParts ?? [])
        .filter((p) => p.conversation_id === c.id)
        .map((p) => ({
          id: p.id,
          conversation_id: p.conversation_id,
          user_id: p.user_id,
          last_read_at: p.last_read_at,
          display_name: nameMap.get(p.user_id) ?? null,
          is_admin: adminSet.has(p.user_id),
          last_seen_at: lastSeenMap.get(p.user_id) ?? null,
        }));
      const lastMsg = lastMsgMap.get(c.id) ?? null;
      const unread = unreadConversationIds.has(c.id);
      return {
        ...c,
        participants: parts,
        last_message: lastMsg,
        unread,
        home_cleared_at: homeClearedMap.get(c.id) ?? null,
        hasAttachments: attachmentConvIds.has(c.id),
      };
    });

    setError(null);
    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime: refresh on any new message in conversations the user participates in
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`inbox-feed-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` }, () => {
        loadConversations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

  // A thread view marks itself read after its messages load. Refresh this
  // hook's list after that write so the Unread filter clears immediately in
  // the same tab, even if Realtime is delayed.
  useEffect(() => {
    const handleRead = () => void loadConversations();
    window.addEventListener('inbox:read', handleRead);
    return () => window.removeEventListener('inbox:read', handleRead);
  }, [loadConversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    // Optimistic remove; messages + participants cascade off the conversation row.
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) {
      // Restore on failure so the list reflects reality.
      await loadConversations();
      throw error;
    }
  }, [loadConversations]);

  // Reading a thread without opening it: Home's message card clears one from
  // the preview, and a card the student has cleared must not keep counting as
  // unread anywhere else. Same write ConversationView does on open, so the
  // rail badge and the inbox agree with the card.
  const markConversationRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread: false } : c)),
    );
    const { error: markError } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
    if (markError) {
      console.warn('[inbox] mark-as-read failed:', markError.message);
      return;
    }
    window.dispatchEvent(new CustomEvent('inbox:read'));
  }, [user]);

  /**
   * Clear a thread off the Classroom Home card, through the message the viewer
   * was actually looking at.
   *
   * This is deliberately NOT mark-as-read and NOT a delete. The conversation,
   * its messages and its unread state are all left alone, so the inbox still
   * shows the thread as unread and every per-student surface keeps its dot.
   * Clearing only says "not on my Home screen". Because the watermark is the
   * message's own timestamp rather than now(), a message that arrives while
   * the request is in flight is never swallowed - it is newer, so it comes
   * back to Home as new, which is the whole point.
   */
  const clearConversationFromHome = useCallback(async (conversationId: string, throughIso: string) => {
    if (!user) return;
    const previous = conversations;
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, home_cleared_at: throughIso } : c)),
    );
    const { error: clearError } = await supabase
      .from('conversation_participants')
      .update({ home_cleared_at: throughIso })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
    if (clearError) {
      // Put the card back rather than leave it hidden on a write that failed:
      // a silently-swallowed clear is a message the viewer never sees again.
      console.error('[inbox] clear-from-home failed:', clearError);
      setConversations(previous);
      throw clearError;
    }
    window.dispatchEvent(new CustomEvent('inbox:home-cleared'));
  }, [user, conversations]);

  const unreadCount = useMemo(() => conversations.filter((c) => c.unread).length, [conversations]);

  return {
    conversations,
    loading,
    error,
    unreadCount,
    refresh: loadConversations,
    deleteConversation,
    clearConversationFromHome,
    markConversationRead,
  };
}

export function useConversationMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (msgsError) {
      // Don't render an empty thread as if the conversation had no messages.
      console.error('[inbox] load thread failed:', msgsError);
      setError('Could not load this conversation');
      setLoading(false);
      return;
    }

    const ids = (msgs ?? []).map((m) => m.id);
    const attMap = new Map<string, MessageAttachment[]>();
    if (ids.length) {
      const { data: atts, error: attsError } = await supabase
        .from('message_attachments')
        .select('*')
        .in('message_id', ids);
      if (attsError) {
        console.warn('[inbox] thread attachments read failed:', attsError.message);
      }
      for (const a of atts ?? []) {
        const arr = attMap.get(a.message_id) ?? [];
        arr.push(a as MessageAttachment);
        attMap.set(a.message_id, arr);
      }
    }

    setError(null);
    setMessages(
      (msgs ?? []).map((m) => ({ ...m, attachments: attMap.get(m.id) ?? [] }))
    );
    setLoading(false);
  }, [conversationId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mark as read when opening
  useEffect(() => {
    if (!conversationId || !user) return;
    supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .then(({ error: markError }) => {
        // Non-blocking, but don't discard the error: a failed mark-as-read
        // leaves a stale unread badge, so at least log it.
        if (markError) {
          console.warn('[inbox] mark-as-read failed:', markError.message);
          return;
        }
        window.dispatchEvent(new CustomEvent('inbox:read'));
      });
  }, [conversationId, user, messages.length]);

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  return { messages, loading, error, refresh: load, deleteMessage };
}
