import { useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  acknowledgeConversationRead,
  announceInboxChange,
  fetchAllAscending,
  getInboxSnapshot,
  patchInbox,
  refreshInbox,
  subscribeInbox,
  timestampKey,
} from './inboxSummaries';

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
   * created_at of the newest incoming message past the viewer's receipt. Null
   * when nothing is unread. Lets a read write tell whether it covered the
   * whole backlog or only part of it.
   */
  latest_unread_at?: string | null;
  /**
   * The newest unread INCOMING message itself. Attention previews use this,
   * so a reply the viewer sent afterwards never replaces what is waiting for
   * them. `last_message` stays the ordinary newest line for the inbox list.
   */
  latest_unread_message?: { body: string; created_at: string; sender_id: string } | null;
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

/**
 * The signed-in actor's conversations, read from the one shared owner in
 * `inboxSummaries`. Mounting this hook in ten places costs one fetch and one
 * realtime channel, and all ten agree on the same unread total.
 */
export function useInbox() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const subscribe = useCallback((listener: () => void) => subscribeInbox(userId, listener), [userId]);
  const getSnapshot = useCallback(() => getInboxSnapshot(userId), [userId]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const conversations = snapshot.conversations;
  const loadConversations = useCallback(() => refreshInbox(userId), [userId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!userId) return;
    // Optimistic remove; messages + participants cascade off the conversation row.
    patchInbox(userId, (prev) => prev.filter((c) => c.id !== conversationId));
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    await refreshInbox(userId);
    if (error) throw error;
  }, [userId]);

  /**
   * Clear a thread off the Classroom Home card, through the message the viewer
   * was actually looking at.
   *
   * Deliberately NOT mark-as-read and NOT a delete. The conversation, its
   * messages and its unread state are all left alone. Because the watermark is
   * the message's own timestamp rather than now(), a message that arrives while
   * the request is in flight is newer, so it comes back to Home as new.
   */
  const clearConversationFromHome = useCallback(async (conversationId: string, throughIso: string) => {
    if (!userId) return;
    const previous = getInboxSnapshot(userId).conversations;
    patchInbox(userId, (prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, home_cleared_at: throughIso } : c)),
    );
    const { error: clearError } = await supabase
      .from('conversation_participants')
      .update({ home_cleared_at: throughIso })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (clearError) {
      // Put the card back rather than leave it hidden on a write that failed.
      console.error('[inbox] clear-from-home failed:', clearError);
      patchInbox(userId, () => previous);
      throw clearError;
    }
    announceInboxChange(userId, 'home-cleared', conversationId);
    void refreshInbox(userId);
  }, [userId]);

  const unreadCount = useMemo(() => conversations.filter((c) => c.unread).length, [conversations]);

  return {
    conversations,
    loading: snapshot.loading,
    /** True once a read has succeeded for this actor; separates "none" from "unknown". */
    loaded: snapshot.loaded,
    error: snapshot.error,
    /** Unread conversations, the one unit every badge uses. */
    unreadCount,
    refresh: loadConversations,
    deleteConversation,
    clearConversationFromHome,
  };
}

export interface ConversationMessagesOptions {
  /**
   * The thread is open and on screen. Only an active thread acknowledges what
   * it shows; a closed help panel that receives a message must leave it unread.
   */
  active?: boolean;
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

const ATTACHMENT_ID_CHUNK = 100;

type MessageRow = Omit<Message, 'attachments'>;

/** The whole thread, oldest first, paged past the backend's row cap. */
async function loadThread(conversationId: string): Promise<Message[]> {
  const rows = await fetchAllAscending<MessageRow>(() =>
    supabase.from('messages').select('*').eq('conversation_id', conversationId),
  );
  const attMap = new Map<string, MessageAttachment[]>();
  const ids = rows.map((m) => m.id);
  for (let i = 0; i < ids.length; i += ATTACHMENT_ID_CHUNK) {
    const { data: atts, error: attsError } = await supabase
      .from('message_attachments')
      .select('*')
      .in('message_id', ids.slice(i, i + ATTACHMENT_ID_CHUNK));
    if (attsError) {
      // Non-fatal: the message still shows, without its paperclip.
      console.warn('[inbox] thread attachments read failed:', attsError.message);
      continue;
    }
    for (const a of atts ?? []) {
      const arr = attMap.get(a.message_id) ?? [];
      arr.push(a as MessageAttachment);
      attMap.set(a.message_id, arr);
    }
  }
  return rows.map((m) => ({ ...m, attachments: attMap.get(m.id) ?? [] }));
}

/**
 * One thread's messages for the signed-in actor.
 *
 * Everything the hook holds is keyed by WHO is reading and WHICH thread: the
 * rendered payload, the in-flight load, and the acknowledgement watermark. A
 * change of either clears the rendered payload in the same render, and a
 * read or write that started under the old identity is ignored when it lands.
 */
export function useConversationMessages(
  conversationId: string | null,
  { active = false }: ConversationMessagesOptions = {},
) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const identity = userId && conversationId ? `${userId}:${conversationId}` : null;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const [thread, setThread] = useState<{ identity: string | null; messages: Message[] }>({ identity: null, messages: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ identity: string; message: string } | null>(null);
  const [readError, setReadError] = useState<{ identity: string; message: string } | null>(null);
  const [readAttempt, setReadAttempt] = useState(0);
  const seqRef = useRef(0);
  /** Newest watermark acknowledged per actor+thread, in microseconds. */
  const acknowledgedRef = useRef(new Map<string, number>());
  const visible = useDocumentVisible();

  const load = useCallback(async () => {
    const mySeq = ++seqRef.current;
    const loadingFor = identity;
    if (!loadingFor || !conversationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const messages = await loadThread(conversationId);
      if (mySeq !== seqRef.current || identityRef.current !== loadingFor) return;
      setError(null);
      setThread({ identity: loadingFor, messages });
    } catch (loadError) {
      if (mySeq !== seqRef.current || identityRef.current !== loadingFor) return;
      // Don't render an empty thread as if the conversation had no messages.
      console.error('[inbox] load thread failed:', loadError);
      setError({ identity: loadingFor, message: 'Could not load this conversation' });
    } finally {
      if (mySeq === seqRef.current) setLoading(false);
    }
  }, [conversationId, identity]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error: deleteError } = await supabase.from('messages').delete().eq('id', messageId);
    if (deleteError) throw deleteError;
    setThread((prev) => ({ ...prev, messages: prev.messages.filter((m) => m.id !== messageId) }));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Only what belongs to the current identity is ever returned.
  const messages = thread.identity === identity && identity ? thread.messages : EMPTY_MESSAGES;
  const currentError = error && error.identity === identity ? error.message : null;
  const currentReadError = readError && readError.identity === identity ? readError.message : null;

  /*
   * Acknowledge only what this thread has fetched and rendered, and only while
   * it is open and the tab is visible. The watermark is the newest INCOMING
   * message on screen, never the client clock, so a message that lands a
   * moment later stays unread until it too has been shown.
   */
  const newestIncoming = useMemo(() => {
    if (!userId || currentError) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id !== userId) return messages[i].created_at;
    }
    return null;
  }, [messages, userId, currentError]);

  useEffect(() => {
    if (!active || !visible || !identity || !conversationId || !userId || !newestIncoming) return;
    const key = timestampKey(newestIncoming);
    if ((acknowledgedRef.current.get(identity) ?? 0) >= key) return;
    const writingFor = identity;
    let cancelled = false;
    acknowledgeConversationRead({ userId, conversationId, watermark: newestIncoming })
      .then(() => {
        acknowledgedRef.current.set(writingFor, Math.max(acknowledgedRef.current.get(writingFor) ?? 0, key));
        if (!cancelled && identityRef.current === writingFor) setReadError(null);
      })
      .catch((markError: unknown) => {
        // The thread stays unread everywhere; the reader can retry.
        console.warn('[inbox] mark-as-read failed:', markError);
        if (!cancelled && identityRef.current === writingFor) {
          setReadError({ identity: writingFor, message: 'Could not mark this conversation as read.' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, visible, identity, conversationId, userId, newestIncoming, readAttempt]);

  const retryRead = useCallback(() => setReadAttempt((n) => n + 1), []);

  // Realtime. The topic is unique per hook so two views of one thread do not
  // collide on the same channel name.
  useEffect(() => {
    if (!conversationId || !userId) return;
    const channel = supabase
      .channel(`conv-${conversationId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, load]);

  return {
    messages,
    // A thread whose payload is not this identity's yet is still loading.
    loading: loading || (!!identity && thread.identity !== identity && !currentError),
    error: currentError,
    /** The receipt write failed; the thread is still unread. */
    readError: currentReadError,
    retryRead,
    refresh: load,
    deleteMessage,
  };
}

const EMPTY_MESSAGES: Message[] = [];
