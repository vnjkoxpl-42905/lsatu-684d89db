import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OperatorToolResult {
  name: string;
  arguments: any;
  result: { ok: boolean; data?: any; error?: string };
}

export interface OperatorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_results?: OperatorToolResult[];
  pending?: boolean;
  created_at: string;
}

const uid = () =>
  (typeof crypto !== 'undefined' && (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2));

export function useOperatorChat() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OperatorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // Load most recent conversation on mount.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: conv } = await (supabase as any)
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
        const { data: msgs } = await (supabase as any)
          .from('operator_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });
        if (!cancelled && msgs) {
          setMessages(
            (msgs as any[]).map((m) => ({
              id: m.id,
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content ?? '',
              tool_results: (m.tool_results as OperatorToolResult[]) ?? undefined,
              created_at: m.created_at,
            })),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationIdRef.current) return conversationIdRef.current;
    if (!user) throw new Error('Not signed in');
    const { data, error: e } = await (supabase as any)
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
    async (text: string) => {
      if (!text.trim() || !user) return;
      setError(null);
      setIsLoading(true);

      const userMsg: OperatorMessage = {
        id: uid(),
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };
      const placeholderId = uid();
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: placeholderId,
          role: 'assistant',
          content: '',
          pending: true,
          created_at: new Date().toISOString(),
        },
      ]);

      try {
        const convId = await ensureConversation();
        // Persist the user message before the round-trip so it survives a refresh.
        await (supabase as any).from('operator_messages').insert({
          conversation_id: convId,
          role: 'user',
          content: text,
        });

        // Build the conversation payload for the model.
        const history = [...messages, userMsg]
          .filter((m) => !m.pending)
          .map((m) => ({ role: m.role, content: m.content }));

        const { data, error: invokeErr } = await (supabase as any).functions.invoke(
          'teacher-operator-chat',
          { body: { messages: history } },
        );
        if (invokeErr) throw invokeErr;
        if (data?.error) throw new Error(data.error);

        const finalContent: string = data?.content ?? '';
        const toolResults: OperatorToolResult[] = data?.tool_results ?? [];

        // Persist assistant turn.
        await (supabase as any).from('operator_messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: finalContent,
          tool_results: toolResults.length ? toolResults : null,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: finalContent,
                  tool_results: toolResults.length ? toolResults : undefined,
                  pending: false,
                }
              : m,
          ),
        );
      } catch (e: any) {
        const msg = e?.message ?? 'Something went wrong';
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, content: `⚠️ ${msg}`, pending: false }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [ensureConversation, messages, user],
  );

  const newConversation = useCallback(async () => {
    if (!user) return;
    const { data, error: e } = await (supabase as any)
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
    setMessages([]);
    setError(null);
  }, [user]);

  return { messages, isLoading, error, sendMessage, newConversation, conversationId };
}
