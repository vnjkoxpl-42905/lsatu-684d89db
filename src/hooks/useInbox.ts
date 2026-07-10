import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
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
      .select('conversation_id, last_read_at')
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

    const lastReadMap = new Map<string, string>(
      (myParts ?? []).map((p) => [p.conversation_id, p.last_read_at])
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

    // Last message per conversation.
    // STOPGAP (H22): this previously downloaded every message in every
    // conversation. Bound it to the most recent ~5 per conversation (floor 25)
    // so the list load stays cheap for the admin, who sees every thread. The
    // proper fix is a DISTINCT ON (conversation_id) RPC (get_latest_messages);
    // see docs/agent/handoffs PHASE6 for the Lovable-side migration. Trade-off:
    // a conversation whose only attachment predates the cutoff can lose its
    // paperclip indicator (already a non-fatal, warn-only signal below).
    const msgFetchLimit = Math.max(convIds.length * 5, 25);
    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('id, conversation_id, body, created_at, sender_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(msgFetchLimit);
    if (msgsError) {
      console.error('[inbox] load messages failed:', msgsError);
      setError('Could not load your messages');
      setLoading(false);
      return;
    }
    const lastMsgMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
    const msgIdToConv = new Map<string, string>();
    for (const m of msgs ?? []) {
      msgIdToConv.set(m.id, m.conversation_id);
      if (!lastMsgMap.has(m.conversation_id)) {
        lastMsgMap.set(m.conversation_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id });
      }
    }

    // Per-conversation attachment presence (single query, ids only)
    const attachmentConvIds = new Set<string>();
    const allMsgIds = Array.from(msgIdToConv.keys());
    if (allMsgIds.length) {
      const { data: atts, error: attsError } = await supabase
        .from('message_attachments')
        .select('message_id')
        .in('message_id', allMsgIds);
      if (attsError) {
        // Non-fatal: worst case the paperclip indicator is missing. Warn only.
        console.warn('[inbox] attachment presence read failed:', attsError.message);
      }
      for (const a of atts ?? []) {
        const cid = msgIdToConv.get(a.message_id);
        if (cid) attachmentConvIds.add(cid);
      }
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
      const lastRead = lastReadMap.get(c.id);
      const lastMsg = lastMsgMap.get(c.id) ?? null;
      const unread = !!(lastMsg && lastRead && new Date(lastMsg.created_at) > new Date(lastRead) && lastMsg.sender_id !== user.id);
      return {
        ...c,
        participants: parts,
        last_message: lastMsg,
        unread,
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

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

  const unreadCount = useMemo(() => conversations.filter((c) => c.unread).length, [conversations]);

  return { conversations, loading, error, unreadCount, refresh: loadConversations, deleteConversation };
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
        if (markError) console.warn('[inbox] mark-as-read failed:', markError.message);
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
