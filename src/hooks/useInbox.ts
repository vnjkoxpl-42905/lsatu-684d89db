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

// Shape from public.attachments (Phase 1 canonical model). Renderer reads
// `source` to decide how to open `source_url` (Storage path vs Drive deep
// link) and `sync_status` to drive badges + disabled states.
export type AttachmentSource = 'lsat_u_upload' | 'google_drive' | 'gmail_attachment';
export type AttachmentSyncStatus =
  | 'pending'
  | 'synced'
  | 'syncing'
  | 'stale'
  | 'failed'
  | 'permission_blocked'
  | 'deleted_externally'
  | 'needs_linking';

export interface MessageAttachment {
  id: string;
  message_id: string | null;
  source: AttachmentSource;
  source_external_id: string | null;
  source_url: string | null;
  display_name: string;
  mime_type: string;
  size_bytes: number;
  sync_status: AttachmentSyncStatus;
  sync_error: string | null;
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

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get conversations the user participates in
    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);

    const convIds = (myParts ?? []).map((p) => p.conversation_id);
    if (convIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const lastReadMap = new Map<string, string>(
      (myParts ?? []).map((p) => [p.conversation_id, p.last_read_at])
    );

    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });

    const { data: allParts } = await supabase
      .from('conversation_participants')
      .select('id, conversation_id, user_id, last_read_at')
      .in('conversation_id', convIds);

    // Resolve display names via SECURITY DEFINER RPC — RLS on `profiles` blocks
    // non-admin cross-user SELECTs, so a direct `.from('profiles').select(...)`
    // silently drops the admin row and leaves the thread titled "Conversation".
    // The RPC returns display_name only for users who share a conversation with
    // the caller.
    const userIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id)));
    const { data: nameRows } = await supabase
      .rpc('get_conversation_participant_names', { _user_ids: userIds });
    const rows = (nameRows ?? []) as Array<{ user_id: string; display_name: string | null; is_admin: boolean }>;
    const nameMap = new Map(rows.map((r) => [r.user_id, r.display_name]));
    // RLS on user_roles blocks students from reading other users' roles, so
    // admin status is sourced from the RPC (which runs SECURITY DEFINER).
    const adminSet = new Set(rows.filter((r) => r.is_admin).map((r) => r.user_id));

    // Last message per conversation
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, body, created_at, sender_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });
    const lastMsgMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
    const msgIdToConv = new Map<string, string>();
    for (const m of msgs ?? []) {
      msgIdToConv.set(m.id, m.conversation_id);
      if (!lastMsgMap.has(m.conversation_id)) {
        lastMsgMap.set(m.conversation_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id });
      }
    }

    // Per-conversation attachment presence (single query, ids only).
    // Reads from public.attachments (the canonical model from Phase 1).
    const attachmentConvIds = new Set<string>();
    if (convIds.length) {
      const { data: atts } = await supabase
        .from('attachments')
        .select('thread_id')
        .in('thread_id', convIds);
      for (const a of atts ?? []) {
        if (a.thread_id) attachmentConvIds.add(a.thread_id);
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

  const unreadCount = useMemo(() => conversations.filter((c) => c.unread).length, [conversations]);

  return { conversations, loading, unreadCount, refresh: loadConversations };
}

export function useConversationMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const ids = (msgs ?? []).map((m) => m.id);
    const attMap = new Map<string, MessageAttachment[]>();
    if (ids.length) {
      const { data: atts } = await supabase
        .from('attachments')
        .select(
          'id, message_id, source, source_external_id, source_url, display_name, mime_type, size_bytes, sync_status, sync_error',
        )
        .in('message_id', ids)
        .order('created_at', { ascending: true });
      for (const a of atts ?? []) {
        const mid = a.message_id;
        if (!mid) continue;
        const arr = attMap.get(mid) ?? [];
        arr.push(a as MessageAttachment);
        attMap.set(mid, arr);
      }
    }

    setMessages(
      (msgs ?? []).map((m) => ({ ...m, attachments: attMap.get(m.id) ?? [] }))
    );
    setLoading(false);
  }, [conversationId]);

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
      .then(() => {});
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

  return { messages, loading, refresh: load };
}
