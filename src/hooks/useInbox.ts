import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { clearConversationNotifications } from '@/hooks/useNotifications';

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
  /** Newest incoming unread message, independent of the latest overall send. */
  latest_unread_message?: { body: string; created_at: string; sender_id: string } | null;
  latest_unread_at?: string | null;
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
  const [conversationOwner, setConversationOwner] = useState<string | null>(null);
  const inboxIdentity = useRef(user?.id);
  inboxIdentity.current = user?.id;
  const inboxRequest = useRef(0);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const viewerId = user.id;
    const sequence = ++inboxRequest.current;
    const isCurrent = () => inboxIdentity.current === viewerId && inboxRequest.current === sequence;
    setLoading(true);

    // Get conversations the user participates in. A swallowed error here (and
    // in each read below) yielded null -> an empty inbox rendered as if the
    // student had no messages: a swallowed-error AND a truthful-UI violation.
    // On any failure we set an error, KEEP the prior conversations, and stop.
    const { data: myParts, error: partsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at, home_cleared_at')
      .eq('user_id', user.id);
    if (!isCurrent()) return;
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
      setConversationOwner(viewerId);
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
    if (!isCurrent()) return;
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
    if (!isCurrent()) return;
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
    if (!isCurrent()) return;
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
    if (!isCurrent()) return;
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
    const readTimes = Array.from(lastReadMap.values()).filter(Number.isFinite);
    const oldestReadAt = readTimes.length ? Math.min(...readTimes) : 0;
    const unreadMessages: Array<{ id: string; conversation_id: string; created_at: string }> = [];
    for (let offset = 0; ; offset += 500) {
      const { data: page, error: unreadMessagesError } = await supabase
        .from('messages').select('id, conversation_id, created_at')
        .in('conversation_id', convIds).neq('sender_id', user.id)
        .gt('created_at', new Date(oldestReadAt).toISOString())
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 499);
      if (!isCurrent()) return;
      if (unreadMessagesError) {
        console.error('[inbox] load unread messages failed:', unreadMessagesError);
        setError('Could not load your messages'); setLoading(false); return;
      }
      unreadMessages.push(...(page ?? []));
      if ((page?.length ?? 0) < 500) break;
    }
    const newestUnread = new Map<string, (typeof unreadMessages)[number]>();
    for (const message of unreadMessages) {
      const timestamp = new Date(message.created_at).getTime();
      if (timestamp <= (lastReadMap.get(message.conversation_id) ?? 0)) continue;
      const previous = newestUnread.get(message.conversation_id);
      if (!previous || timestamp > new Date(previous.created_at).getTime()
        || (timestamp === new Date(previous.created_at).getTime() && message.id > previous.id)) {
        newestUnread.set(message.conversation_id, message);
      }
    }
    const unreadConversationIds = new Set(newestUnread.keys());
    const unreadPreviewMap = new Map<string, { body: string; created_at: string; sender_id: string }>();
    // Read full bodies only for one newest unread incoming message per thread.
    // Keep the paginated unread scan lean, even for long-unread conversations.
    const previewIds = Array.from(newestUnread.values(), (message) => message.id);
    for (let offset = 0; offset < previewIds.length; offset += 100) {
      const { data: previews, error: previewError } = await supabase
        .from('messages').select('id, conversation_id, body, created_at, sender_id')
        .in('id', previewIds.slice(offset, offset + 100));
      if (!isCurrent()) return;
      if (previewError) {
        console.error('[inbox] load unread previews failed:', previewError);
        setError('Could not load your messages'); setLoading(false); return;
      }
      for (const message of previews ?? []) {
        unreadPreviewMap.set(message.conversation_id, {
          body: message.body, created_at: message.created_at, sender_id: message.sender_id,
        });
      }
    }

    // Per-conversation attachment presence via RPC — exact across ALL messages in
    // the conversation. The old stopgap only inspected recently-fetched messages,
    // so an attachment older than the cutoff lost its paperclip. Non-fatal: on
    // failure the indicator is simply missing, so warn (don't blank the inbox).
    const attachmentConvIds = new Set<string>();
    const { data: attConvs, error: attsError } = await supabase
      .rpc('get_conversations_with_attachments', { conv_ids: convIds });
    if (!isCurrent()) return;
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
        latest_unread_message: unreadPreviewMap.get(c.id) ?? null,
        latest_unread_at: newestUnread.get(c.id)?.created_at ?? null,
        home_cleared_at: homeClearedMap.get(c.id) ?? null,
        hasAttachments: attachmentConvIds.has(c.id),
      };
    });

    setError(null);
    setConversationOwner(viewerId);
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
    window.addEventListener('inbox:participants', handleRead);
    return () => {
      window.removeEventListener('inbox:read', handleRead);
      window.removeEventListener('inbox:participants', handleRead);
    };
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
    if (!user || conversationOwner !== user.id) return;
    const through = conversations.find((conversation) => conversation.id === conversationId)?.last_message?.created_at;
    if (!through) return;
    await acknowledgeConversationMessages(user.id, conversationId, through);
  }, [user, conversations, conversationOwner]);

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

  const ownedConversations = conversationOwner === user?.id ? conversations : [];
  const unreadCount = ownedConversations.filter((c) => c.unread).length;

  return {
    conversations: ownedConversations,
    loaded: !!user && conversationOwner === user.id,
    loading: loading || (!!user && conversationOwner !== user.id && !error),
    error,
    unreadCount,
    refresh: loadConversations,
    deleteConversation,
    clearConversationFromHome,
    markConversationRead,
  };
}

/** Acknowledge only messages actually loaded for this viewer, never client wall-clock time. */
export async function acknowledgeConversationMessages(userId: string, conversationId: string, through: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (auth.user?.id !== userId) throw new Error('The signed-in reader changed before this conversation could be marked read');
  const { data, error } = await supabase.from('conversation_participants')
    .update({ last_read_at: through })
    .eq('conversation_id', conversationId).eq('user_id', userId)
    .or(`last_read_at.is.null,last_read_at.lt.${through}`).select('conversation_id,last_read_at');
  if (error) throw error;
  if (!data?.length) {
    const { data: participant, error: verifyError } = await supabase.from('conversation_participants')
      .select('last_read_at').eq('conversation_id', conversationId).eq('user_id', userId).maybeSingle();
    if (verifyError) throw verifyError;
    if (!participant?.last_read_at || new Date(participant.last_read_at).getTime() < new Date(through).getTime()) {
      throw new Error('Could not confirm that this conversation was marked read');
    }
  }
  try { await clearConversationNotifications(userId, conversationId, through); }
  catch (notificationError) { console.warn('[inbox] message notification reconciliation failed:', notificationError); }
  window.dispatchEvent(new CustomEvent('inbox:read', { detail: { userId, conversationId, readThrough: through } }));
}

export function useConversationMessages(conversationId: string | null, readEnabled = true) {
  const { user } = useAuth();
  const userId = user?.id;
  const identity = `${userId ?? ''}:${conversationId ?? ''}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const request = useRef(0);
  const [snapshot, setSnapshot] = useState<{ identity: string; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foreground, setForeground] = useState(() => document.visibilityState === 'visible' && document.hasFocus());
  const messages = snapshot?.identity === identity ? snapshot.messages : [];

  useEffect(() => {
    const update = () => setForeground(document.visibilityState === 'visible' && document.hasFocus());
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
    };
  }, []);

  const load = useCallback(async () => {
    const sequence = ++request.current;
    if (!conversationId || !userId) { setSnapshot(null); setLoading(false); setError(null); return; }
    const current = () => identityRef.current === identity && request.current === sequence;
    setLoading(true);
    setError(null);
    const msgs: Array<Omit<Message, 'attachments'>> = [];
    for (let offset = 0; ; offset += 500) {
      const { data: page, error: msgsError } = await supabase.from('messages').select('*')
        .eq('conversation_id', conversationId).order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 499);
      if (!current()) return;
      if (msgsError) {
        console.error('[inbox] load thread failed:', msgsError);
        setError('Could not load this conversation'); setLoading(false); return;
      }
      msgs.push(...(page ?? []));
      if ((page?.length ?? 0) < 500) break;
    }
    const ids = (msgs ?? []).map((m) => m.id);
    const attMap = new Map<string, MessageAttachment[]>();
    if (ids.length) {
      const { data: atts, error: attsError } = await supabase.from('message_attachments').select('*').in('message_id', ids);
      if (!current()) return;
      if (attsError) console.warn('[inbox] thread attachments read failed:', attsError.message);
      for (const a of atts ?? []) {
        const arr = attMap.get(a.message_id) ?? []; arr.push(a as MessageAttachment); attMap.set(a.message_id, arr);
      }
    }
    setSnapshot({ identity, messages: (msgs ?? []).map((m) => ({ ...m, attachments: attMap.get(m.id) ?? [] })) });
    setLoading(false);
  }, [conversationId, userId, identity]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const startedAs = identityRef.current;
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
    if (identityRef.current !== startedAs) return;
    setSnapshot((prev) => prev?.identity === startedAs ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) } : prev);
  }, []);

  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);

  const acknowledged = useRef(new Map<string, string>());
  useEffect(() => { acknowledged.current.delete(identity); }, [identity]);
  useEffect(() => {
    if (!conversationId || !userId || !readEnabled || !foreground || loading || error || snapshot?.identity !== identity) return;
    const through = messages.filter((message) => message.sender_id !== userId)
      .reduce<string | null>((latest, message) => !latest || new Date(message.created_at) > new Date(latest) ? message.created_at : latest, null);
    if (!through || (acknowledged.current.get(identity) ?? '') >= through) return;
    acknowledged.current.set(identity, through);
    void acknowledgeConversationMessages(userId, conversationId, through).catch((markError) => {
      if (acknowledged.current.get(identity) === through) acknowledged.current.delete(identity);
      console.warn('[inbox] mark-as-read failed:', markError);
    });
  }, [conversationId, userId, identity, messages, snapshot, readEnabled, foreground, loading, error]);

  useEffect(() => {
    if (!conversationId || !userId) return;
    const channel = supabase.channel(`conv-${userId}-${conversationId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, userId, load]);
  return { messages, loading: loading || (!!conversationId && !!userId && snapshot?.identity !== identity && !error), error, refresh: load, deleteMessage };
}
