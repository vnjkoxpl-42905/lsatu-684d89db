import * as React from "react";
import { supabase } from '@/integrations/supabase/client';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LRQuestion } from '@/lib/questionLoader';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TutorChatModalProps {
  open: boolean;
  question: LRQuestion | null;
  userAnswer: string;
  onClose: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function TutorChatModal({
  open,
  question,
  userAnswer,
  onClose,
}: TutorChatModalProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Scroll to bottom as messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when coaching surface is ready
  React.useEffect(() => {
    if (!isLoading && !initializing) {
      inputRef.current?.focus();
    }
  }, [isLoading, initializing]);

  // Open → load first Socratic question
  React.useEffect(() => {
    if (open && question && initializing) {
      loadInitialQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question, initializing]);

  // Reset + abort on close
  React.useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages([]);
      setInput('');
      setInitializing(true);
      setIsLoading(false);
    }
  }, [open]);

  // Abort on unmount
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const buildQuestionData = (q: LRQuestion) => ({
    qid: q.qid,
    pt: q.pt,
    section: q.section,
    qnum: q.qnum,
    qtype: q.qtype,
    level: q.difficulty,
    stimulus: q.stimulus,
    questionStem: q.questionStem,
    answerChoices: q.answerChoices,
    userAnswer,
    correctAnswer: q.correctAnswer,
    breakdown: q.breakdown,
    answerChoiceExplanations: q.answerChoiceExplanations,
    reasoningType: q.reasoningType,
  });

  // Stream SSE chunks from the tutor-chat edge function, appending deltas.
  const streamTutorReply = async (
    body: { question: any; messages: Message[] },
    signal: AbortSignal,
    onDelta: (text: string) => void,
  ): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPABASE_ANON_KEY;

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/tutor-chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });

    if (!resp.ok) {
      let msg = `Joshua is having trouble (HTTP ${resp.status}).`;
      try {
        const err = await resp.json();
        msg = err.error || err.message || msg;
      } catch {
        // non-JSON error body
      }
      throw new Error(msg);
    }

    if (!resp.body) throw new Error('No response stream from coaching service.');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) onDelta(delta);
        } catch {
          // skip malformed chunk
        }
      }
    }
  };

  const appendDelta = (delta: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;
      return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
    });
  };

  const loadInitialQuestion = async () => {
    if (!question) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Prime empty assistant message we'll stream into
    setMessages([{ role: 'assistant', content: '' }]);
    setIsLoading(true);

    try {
      await streamTutorReply(
        { question: buildQuestionData(question), messages: [] },
        controller.signal,
        appendDelta,
      );
      setInitializing(false);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const msg = e?.message || 'Unexpected error from coaching service.';
      setMessages([{ role: 'assistant', content: msg }]);
      setInitializing(false);
      toast.error(msg);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !question || isLoading) return;
    const userMessage = input.trim();
    setInput('');

    const nextHistory: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages([...nextHistory, { role: 'assistant', content: '' }]);
    setIsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamTutorReply(
        { question: buildQuestionData(question), messages: nextHistory },
        controller.signal,
        appendDelta,
      );
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const msg = e?.message || 'Unexpected error from coaching service.';
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.role !== 'assistant') return prev;
        return [...prev.slice(0, -1), { ...last, content: msg }];
      });
      toast.error(msg);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open || !question) return null;

  const lastMsg = messages[messages.length - 1];
  const awaitingFirstToken =
    isLoading && (!lastMsg || (lastMsg.role === 'assistant' && lastMsg.content === ''));

  return (
    <div className={cn(
      "fixed bottom-6 left-6 z-50 w-[380px] max-h-[420px] flex flex-col",
      "bg-neutral-950/90 backdrop-blur-xl",
      "border border-white/[0.06] ring-1 ring-white/[0.04]",
      "shadow-2xl shadow-black/40 rounded-2xl",
      "animate-in slide-in-from-bottom-4 fade-in duration-300"
    )}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        <span className="text-[10px] tracking-[0.18em] text-neutral-500 font-medium uppercase select-none">
          Coach
        </span>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-2">
        <div className="space-y-4">
          {messages.map((msg, idx) =>
            msg.role === 'assistant' ? (
              msg.content.length > 0 ? (
                <p
                  key={idx}
                  className="text-[13px] leading-[1.65] text-neutral-200 whitespace-pre-wrap animate-in fade-in duration-200 select-text"
                >
                  {msg.content}
                </p>
              ) : null
            ) : (
              <p
                key={idx}
                className="text-right text-[12px] leading-[1.5] text-neutral-500 italic whitespace-pre-wrap animate-in fade-in duration-150 select-text"
              >
                {msg.content}
              </p>
            )
          )}

          {awaitingFirstToken && (
            <p className="text-[18px] tracking-widest text-neutral-600 animate-pulse leading-none select-none">
              ···
            </p>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-2 pb-3">
        <div className={cn(
          "flex items-center gap-2 px-3 py-2",
          "bg-white/[0.04] border border-white/[0.06] rounded-lg"
        )}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || initializing}
            placeholder="Ask a follow-up…"
            className="flex-1 bg-transparent border-0 outline-none text-[13px] text-neutral-200 placeholder:text-neutral-600 disabled:opacity-40 select-text"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || initializing}
            className={cn(
              "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150",
              input.trim() && !isLoading && !initializing
                ? "bg-white/10 text-neutral-200 hover:bg-white/20 active:scale-95"
                : "bg-white/[0.04] text-neutral-600 cursor-not-allowed"
            )}
          >
            <ArrowUp className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-2 px-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-white text-neutral-900 text-[13px] font-semibold hover:bg-neutral-100 active:bg-neutral-200 transition-colors duration-150 select-none"
          >
            Return to question →
          </button>
        </div>
      </div>
    </div>
  );
}
