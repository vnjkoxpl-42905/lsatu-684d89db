import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export interface OperatorToolResult {
  name: string;
  arguments: unknown;
  result: { ok: boolean; data?: unknown; error?: string };
}

export interface OperatorImage {
  /** data URL (data:image/...;base64,...) for inline display + gateway upload. */
  dataUrl: string;
  name: string;
}

export interface OperatorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Attached screenshots — kept in memory for display only, not persisted. */
  images?: OperatorImage[];
  tool_results?: OperatorToolResult[];
  pending?: boolean;
  created_at: string;
}

export interface OperatorConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

/** Typed scope the desk attaches to a seeded turn (kept generic for the hook). */
export type OperatorChatContext = object;

const uid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const SMALL_TITLE_WORDS = new Set(['and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'from', 'by']);

function toTitleCase(text: string) {
  return text
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      const lower = word.toLowerCase();
      if (index > 0 && SMALL_TITLE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function truncateTitle(text: string, maxLength = 52) {
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  return clipped || text.slice(0, maxLength).trim();
}

export function titleFromFirstUserMessage(text: string) {
  const cleaned = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^\[(attached context|google drive files):/i.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/^[“"'`]+|[”"'`.?!,:;]+$/g, '')
    .trim();

  if (!cleaned) return 'New conversation';

  let title = cleaned
    .replace(/^(can|could|would|will)\s+you\s+/i, '')
    .replace(/^please\s+/i, '')
    .replace(/^(help\s+me|i\s+want\s+you\s+to|i\s+need\s+you\s+to)\s+/i, '')
    .replace(/^please\s+/i, '')
    .replace(/\b(a|an|the)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  title = title.replace(/^refine\s+my\s+(.+?)\s+process$/i, '$1 refinement process');

  if (!title) return 'New conversation';
  return truncateTitle(toTitleCase(title)) || 'New conversation';
}

export function useOperatorChat() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OperatorMessage[]>([]);
  const [conversations, setConversations] = useState<OperatorConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  // Mirrors `messages` synchronously so serialized sends always build history
  // from the latest turns (the closure-read version raced on rapid sends).
  const messagesRef = useRef<OperatorMessage[]>([]);
  // Serializes sends so concurrent calls cannot interleave their round-trips.
  const lockRef = useRef<Promise<void>>(Promise.resolve());

  const applyMessages = useCallback(
    (updater: (prev: OperatorMessage[]) => OperatorMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    [],
  );

  const loadConversationList = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('operator_conversations')
      .select('id, title, updated_at')
      .eq('admin_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (data) setConversations(data as OperatorConversationSummary[]);
  }, [user]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data: msgs } = await supabase
      .from('operator_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    const mapped: OperatorMessage[] = (msgs ?? []).map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content ?? '',
      tool_results: (m.tool_results as unknown as OperatorToolResult[]) ?? undefined,
      created_at: m.created_at,
    }));
    applyMessages(() => mapped);
  }, [applyMessages]);

  // Load most recent conversation + the recent-chats list on mount.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: conv } = await supabase
        .from('operator_conversations')
        .select('id')
        .eq('admin_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (conv?.id) {
        setConversationId(conv.id);
        conversationIdRef.current = conv.id;
        await loadMessages(conv.id);
      }
      if (!cancelled) await loadConversationList();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadMessages, loadConversationList]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationIdRef.current) return conversationIdRef.current;
    if (!user) throw new Error('Not signed in');
    const { data, error: e } = await supabase
      .from('operator_conversations')
      .insert({ admin_id: user.id, title: 'New conversation' })
      .select('id')
      .single();
    if (e) throw e;
    conversationIdRef.current = data.id;
    setConversationId(data.id);
    return data.id;
  }, [user]);

  const sendMessage = useCallback(
    (text: string, context?: OperatorChatContext, images?: OperatorImage[]): Promise<void> => {
      const run = async () => {
        if ((!text.trim() && !images?.length) || !user) return;
        setError(null);
        setIsLoading(true);

        const userMsg: OperatorMessage = {
          id: uid(),
          role: 'user',
          content: text,
          images: images?.length ? images : undefined,
          created_at: new Date().toISOString(),
        };
        const placeholderId = uid();
        applyMessages((prev) => [
          ...prev,
          userMsg,
          { id: placeholderId, role: 'assistant', content: '', pending: true, created_at: new Date().toISOString() },
        ]);

        // First user turn of this conversation: title it from the message so the
        // saved-chats history is readable (otherwise every row reads "New conversation").
        const isFirstUserTurn = !messagesRef.current.some((m) => m.role === 'user' && !m.pending && m.id !== userMsg.id);

        try {
          const convId = await ensureConversation();
          await supabase.from('operator_messages').insert({ conversation_id: convId, role: 'user', content: text });
          if (isFirstUserTurn) {
            const title = titleFromFirstUserMessage(text);
            await supabase.from('operator_conversations').update({ title }).eq('id', convId);
            loadConversationList();
          }

          // Build history from the synchronous mirror, excluding the pending
          // placeholder we just added.
          const history: { role: string; content: unknown }[] = messagesRef.current
            .filter((m) => !m.pending)
            .map((m) => ({ role: m.role, content: m.content }));

          // Attach the screenshots to the final user turn as OpenAI-style
          // multimodal parts so Gemini actually sees them. Images ride only this
          // request; they are never persisted, so later turns stay text-only.
          if (images?.length) {
            const last = history[history.length - 1];
            if (last && last.role === 'user') {
              last.content = [
                ...(text.trim() ? [{ type: 'text', text }] : []),
                ...images.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
              ];
            }
          }

          const body: Record<string, unknown> = { messages: history, conversation_id: convId };
          if (context) body.context = context;
          const { data, error: invokeErr } = await supabase.functions.invoke('teacher-operator-chat', { body });
          if (invokeErr) throw invokeErr;
          if (data?.error) throw new Error(data.error);

          const finalContent: string = data?.content ?? '';
          const toolResults: OperatorToolResult[] = data?.tool_results ?? [];

          await supabase.from('operator_messages').insert({
            conversation_id: convId,
            role: 'assistant',
            content: finalContent,
            tool_results: toolResults.length ? (toolResults as unknown as Json) : null,
          });

          applyMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? { ...m, content: finalContent, tool_results: toolResults.length ? toolResults : undefined, pending: false }
                : m,
            ),
          );
          loadConversationList();
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Something went wrong';
          setError(msg);
          applyMessages((prev) =>
            prev.map((m) => (m.id === placeholderId ? { ...m, content: `⚠️ ${msg}`, pending: false } : m)),
          );
        } finally {
          setIsLoading(false);
        }
      };

      const next = lockRef.current.then(run, run);
      lockRef.current = next.then(
        () => {},
        () => {},
      );
      return next;
    },
    [applyMessages, ensureConversation, loadConversationList, user],
  );

  const newConversation = useCallback(async () => {
    if (!user) return;
    const { data, error: e } = await supabase
      .from('operator_conversations')
      .insert({ admin_id: user.id, title: 'New conversation' })
      .select('id')
      .single();
    if (e) {
      setError(e.message);
      return;
    }
    conversationIdRef.current = data.id;
    setConversationId(data.id);
    applyMessages(() => []);
    setError(null);
    loadConversationList();
  }, [applyMessages, loadConversationList, user]);

  const openConversation = useCallback(
    async (id: string) => {
      conversationIdRef.current = id;
      setConversationId(id);
      setError(null);
      await loadMessages(id);
    },
    [loadMessages],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!user) return;
      setError(null);
      const { error: e } = await supabase.from('operator_conversations').delete().eq('admin_id', user.id).eq('id', id);
      if (e) {
        setError(e.message);
        return;
      }
      if (conversationIdRef.current === id) {
        conversationIdRef.current = null;
        setConversationId(null);
        applyMessages(() => []);
      }
      await loadConversationList();
    },
    [applyMessages, loadConversationList, user],
  );

  return {
    messages,
    conversations,
    isLoading,
    error,
    sendMessage,
    newConversation,
    openConversation,
    deleteConversation,
    conversationId,
  };
}
