import * as React from "react";
import { supabase } from '@/integrations/supabase/client';
import { ArrowUp, ArrowRight, PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LRQuestion } from '@/lib/questionLoader';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import ReactMarkdown from 'react-markdown';
import type { TutorMode } from './tutorBehavior';
import { readDrillNotes, writeDrillNotes } from '@/lib/drillNotesStorage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TutorQuestionPayload {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  stimulus: string;
  questionStem: string;
  answerChoices: LRQuestion['answerChoices'];
  userAnswer: string;
  correctAnswer: string;
  breakdown: LRQuestion['breakdown'];
  answerChoiceExplanations: LRQuestion['answerChoiceExplanations'];
  reasoningType: LRQuestion['reasoningType'];
  tutorContext?: TutorContext;
}

interface TutorContext {
  eliminatedAnswers: string[];
  timeMs: number | null;
  flagged: boolean;
  answerRevealed: boolean;
}

type PanelTab = 'coach' | 'breakdown' | 'notes';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface TutorChatModalProps {
  open: boolean;
  question: LRQuestion | null;
  userAnswer: string;
  onClose: () => void;
  mode?: TutorMode;
  sessionId?: string;
  tutorContext?: TutorContext;
  onNext?: () => void;
  /** Which tab to open on. Defaults from `mode` (preview → breakdown). */
  initialTab?: PanelTab;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// The live coaching mode for the Coach tab, derived from drill state.
function coachModeFor(userAnswer: string, answerRevealed: boolean): TutorMode {
  if (answerRevealed) return 'post-answer';
  return userAnswer ? 'socratic' : 'pre-answer';
}

export function TutorChatModal({
  open,
  question,
  userAnswer,
  onClose,
  mode = 'socratic',
  sessionId,
  tutorContext,
  onNext,
  initialTab,
}: TutorChatModalProps) {
  const isMobile = useIsMobile();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<PanelTab>(
    initialTab ?? (mode === 'preview' ? 'breakdown' : 'coach'),
  );
  const [dock, setDock] = React.useState<'left' | 'right'>('left');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const initKeyRef = React.useRef<string>('');

  const answerRevealed = !!tutorContext?.answerRevealed;
  const coachMode = coachModeFor(userAnswer, answerRevealed);
  // The Breakdown tab is always the answer-blind structural preview; the Coach
  // tab is the live, state-resolved conversation.
  const activeMode: TutorMode = activeTab === 'breakdown' ? 'preview' : coachMode;

  // ── Notes (folded in from the standalone Notes panel) ──────────────────────
  const [notesValue, setNotesValue] = React.useState('');
  const [notesSaved, setNotesSaved] = React.useState(true);
  React.useEffect(() => {
    if (!question) return;
    setNotesValue(readDrillNotes(question.qid));
    setNotesSaved(true);
  }, [question?.qid]);
  React.useEffect(() => {
    if (notesSaved || !question) return;
    const t = setTimeout(() => {
      writeDrillNotes(question.qid, notesValue);
      setNotesSaved(true);
    }, 400);
    return () => clearTimeout(t);
  }, [notesValue, notesSaved, question?.qid]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  React.useEffect(() => {
    if (!isLoading && !initializing && activeTab === 'coach') {
      inputRef.current?.focus();
    }
  }, [isLoading, initializing, activeTab]);

  // (Re)initialize the conversation whenever the question or the active tutor
  // mode changes. Notes tab never streams.
  React.useEffect(() => {
    if (!open || !question || activeTab === 'notes') return;
    const key = `${question.qid}:${activeMode}`;
    if (initKeyRef.current === key) return;
    initKeyRef.current = key;
    loadInitialQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question?.qid, activeMode, activeTab]);

  React.useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages([]);
      setInput('');
      setInitializing(true);
      initKeyRef.current = '';
      setActiveTab(initialTab ?? (mode === 'preview' ? 'breakdown' : 'coach'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    tutorContext,
  });

  const loadStoredConversation = async (q: LRQuestion): Promise<boolean> => {
    try {
      let query = supabase
        .from('tutor_conversations')
        .select('role, content')
        .eq('qid', q.qid)
        .eq('mode', activeMode)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: true })
        .limit(30);

      query = sessionId ? query.eq('session_id', sessionId) : query.is('session_id', null);

      const { data, error } = await query;
      if (error || !data || data.length === 0) return false;

      const restored = data
        .filter((row): row is Message => (
          (row.role === 'user' || row.role === 'assistant') &&
          typeof row.content === 'string' &&
          row.content.length > 0
        ));

      if (restored.length === 0) return false;
      setMessages(restored);
      setInitializing(false);
      setIsLoading(false);
      return true;
    } catch (e) {
      console.warn('load stored tutor conversation failed', e);
      return false;
    }
  };

  // Persist a single message to the tutor_conversations table (best-effort).
  const persistMessage = async (q: LRQuestion, role: 'user' | 'assistant', content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('tutor_conversations').insert({
        user_id: user.id,
        qid: q.qid,
        session_id: sessionId ?? null,
        pt: q.pt,
        section: q.section,
        qnum: q.qnum,
        qtype: q.qtype,
        user_answer: userAnswer,
        correct_answer: q.correctAnswer,
        role,
        content,
        mode: activeMode,
      });
    } catch (e) {
      // non-fatal
      console.warn('persist tutor message failed', e);
    }
  };

  const streamTutorReply = async (
    body: { question: TutorQuestionPayload; messages: Message[]; mode: TutorMode },
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
        const err = await resp.json() as { error?: string; message?: string };
        msg = err.error || err.message || msg;
      } catch {
        // Response body was not JSON; keep the HTTP fallback.
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
          // Ignore malformed SSE keepalive chunks.
        }
      }
    }
  };

  // Preview is a one-shot, non-streaming structural breakdown (cache-first on
  // the server). Returns the markdown the panel renders.
  const fetchPreviewBreakdown = async (
    q: LRQuestion,
    signal: AbortSignal,
  ): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPABASE_ANON_KEY;

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/tutor-chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: buildQuestionData(q), messages: [], mode: 'preview' }),
      signal,
    });

    if (!resp.ok) {
      let msg = `Joshua is having trouble (HTTP ${resp.status}).`;
      try {
        const err = await resp.json() as { error?: string };
        msg = err.error || msg;
      } catch { /* keep fallback */ }
      throw new Error(msg);
    }

    const data = await resp.json() as { content_markdown?: string };
    return data.content_markdown || 'No breakdown available for this question.';
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

    setMessages([{ role: 'assistant', content: '' }]);
    setInitializing(true);
    setIsLoading(true);

    let final = '';
    try {
      const restored = await loadStoredConversation(question);
      if (restored) return;

      if (activeMode === 'preview') {
        // One-shot structural breakdown; no streaming.
        final = await fetchPreviewBreakdown(question, controller.signal);
        setMessages([{ role: 'assistant', content: final }]);
        setInitializing(false);
        if (final.trim()) persistMessage(question, 'assistant', final);
        return;
      }

      await streamTutorReply(
        { question: buildQuestionData(question), messages: [], mode: activeMode },
        controller.signal,
        (d) => { final += d; appendDelta(d); },
      );
      setInitializing(false);
      if (final.trim()) persistMessage(question, 'assistant', final);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const msg = errorMessage(e, 'Unexpected error from coaching service.');
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

    persistMessage(question, 'user', userMessage);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // After a preview breakdown, follow-up chat is answer-blind coaching.
    const followUpMode: TutorMode = activeMode === 'preview' ? 'pre-answer' : activeMode;

    let final = '';
    try {
      await streamTutorReply(
        { question: buildQuestionData(question), messages: nextHistory, mode: followUpMode },
        controller.signal,
        (d) => { final += d; appendDelta(d); },
      );
      if (final.trim()) persistMessage(question, 'assistant', final);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const msg = errorMessage(e, 'Unexpected error from coaching service.');
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

  const isPostAnswer = coachMode === 'post-answer';
  const isConversation = activeTab !== 'notes';

  const TABS: { key: PanelTab; label: string }[] = [
    { key: 'coach', label: 'Coach' },
    { key: 'breakdown', label: 'Breakdown' },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col font-sans",
        "bg-neutral-950/95 backdrop-blur-xl",
        "border border-white/[0.06] ring-1 ring-white/[0.04]",
        "shadow-2xl shadow-black/40",
        isMobile
          ? "inset-x-0 bottom-0 h-[88dvh] rounded-t-2xl animate-in slide-in-from-bottom duration-300"
          : cn(
              "bottom-6 w-[440px] max-h-[78vh] rounded-2xl animate-in slide-in-from-bottom-4 fade-in duration-300",
              dock === 'left' ? "left-6" : "right-6",
            )
      )}
    >
      {isMobile && (
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
      )}

      {/* Header: tab strip + dock toggle */}
      <div className="shrink-0 px-3 pt-2.5 pb-0 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "relative px-3 py-2 text-[12px] font-medium transition-colors select-none",
                activeTab === t.key
                  ? "text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-amber-400/80" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pr-1">
          {isPostAnswer && isConversation && (
            <span className="text-[10px] text-neutral-500 tabular-nums">
              You: ({userAnswer}) · Correct: ({question.correctAnswer})
            </span>
          )}
          {!isMobile && (
            <button
              type="button"
              aria-label={dock === 'left' ? 'Dock right' : 'Dock left'}
              onClick={() => setDock((d) => (d === 'left' ? 'right' : 'left'))}
              className="text-neutral-500 hover:text-neutral-200 transition-colors"
            >
              {dock === 'left'
                ? <PanelRight className="w-3.5 h-3.5" />
                : <PanelLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Notes tab */}
      {activeTab === 'notes' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <p className="px-5 pt-3 pb-2 text-[12.5px] leading-relaxed text-neutral-500 italic">
            Jot down any thoughts for this question. Saved and visible next time you review it.
          </p>
          <textarea
            value={notesValue}
            onChange={(e) => { setNotesValue(e.target.value); setNotesSaved(false); }}
            placeholder="Notes for this question…"
            className={cn(
              "flex-1 w-full resize-none px-5 py-3 border-t border-white/[0.04] bg-transparent",
              "text-neutral-100 placeholder:text-neutral-600 leading-relaxed focus:outline-none select-text",
              isMobile ? "text-[16px]" : "text-[14px]",
            )}
          />
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">{notesSaved ? 'Saved' : 'Saving…'}</span>
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                notesSaved ? "bg-emerald-400" : "bg-amber-400",
              )}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
            <div className="space-y-3.5">
              {messages.map((msg, idx) =>
                msg.role === 'assistant' ? (
                  msg.content.length > 0 ? (
                    <div
                      key={idx}
                      className={cn(
                        "leading-[1.65] text-neutral-100 select-text prose prose-invert prose-sm max-w-none",
                        "prose-p:my-2 prose-strong:text-white prose-strong:font-semibold",
                        "prose-code:text-amber-300 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded",
                        isMobile ? "text-[15px]" : "text-[13.5px]"
                      )}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : null
                ) : (
                  <div
                    key={idx}
                    className={cn(
                      "ml-8 px-3 py-2 rounded-lg bg-white/[0.05] text-neutral-200 select-text",
                      isMobile ? "text-[14.5px] leading-[1.55]" : "text-[12.5px] leading-[1.5]"
                    )}
                  >
                    {msg.content}
                  </div>
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

          {/* Input + actions */}
          <div
            className={cn(
              "shrink-0 px-4 pt-2 border-t border-white/[0.04]",
              isMobile
                ? "pb-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] bg-neutral-950/95"
                : "pb-3"
            )}
          >
            <div className={cn(
              "flex items-center gap-2 px-3",
              isMobile ? "py-3" : "py-2",
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
                className={cn(
                  "flex-1 bg-transparent border-0 outline-none text-neutral-200 placeholder:text-neutral-600 disabled:opacity-40 select-text",
                  isMobile ? "text-[16px]" : "text-[13px]"
                )}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || initializing}
                className={cn(
                  "shrink-0 rounded-full flex items-center justify-center transition-all duration-150",
                  isMobile ? "w-9 h-9" : "w-7 h-7",
                  input.trim() && !isLoading && !initializing
                    ? "bg-white/15 text-neutral-100 hover:bg-white/25 active:scale-95"
                    : "bg-white/[0.04] text-neutral-600 cursor-not-allowed"
                )}
              >
                <ArrowUp className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
              </button>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={onClose}
                className={cn(
                  "flex-1 rounded-lg bg-white/[0.06] text-neutral-300 font-medium hover:bg-white/[0.1] active:bg-white/[0.12] transition-colors duration-150 select-none",
                  isMobile ? "py-3 text-[14px]" : "py-2 text-[12.5px]"
                )}
              >
                Close
              </button>
              {isPostAnswer && onNext ? (
                <button
                  onClick={onNext}
                  className={cn(
                    "flex-[1.4] rounded-lg bg-white text-neutral-900 font-semibold hover:bg-neutral-100 active:bg-neutral-200 transition-colors duration-150 select-none flex items-center justify-center gap-1.5",
                    isMobile ? "py-3 text-[14px]" : "py-2 text-[13px]"
                  )}
                >
                  Next question <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className={cn(
                    "flex-1 rounded-lg bg-white text-neutral-900 font-semibold hover:bg-neutral-100 active:bg-neutral-200 transition-colors duration-150 select-none",
                    isMobile ? "py-3 text-[14px]" : "py-2 text-[13px]"
                  )}
                >
                  Return to question →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
