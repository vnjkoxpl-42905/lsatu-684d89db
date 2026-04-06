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
  }, [open, question, initializing]);

  // Reset state on close
  React.useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      setInitializing(true);
      setIsLoading(false);
    }
  }, [open]);

  const extractFunctionError = async (err: any): Promise<string> => {
    try {
      const ctx = (err as any)?.context;
      if (ctx && typeof (ctx as any).text === 'function') {
        const status = (ctx as any).status;
        const raw = await (ctx as any).text();
        try {
          const json = JSON.parse(raw);
          const msg = json.error || json.message || raw;
          return status ? `${msg} (HTTP ${status})` : msg;
        } catch {
          return status ? `${raw} (HTTP ${status})` : raw;
        }
      }
      return (err as any)?.message || 'Unexpected error from coaching service.';
    } catch {
      return (err as any)?.message || 'Unexpected error from coaching service.';
    }
  };

  const loadInitialQuestion = async () => {
    if (!question) return;
    setIsLoading(true);
    try {
      const questionData = {
        qid: question.qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: question.qtype,
        level: question.difficulty,
        stimulus: question.stimulus,
        questionStem: question.questionStem,
        answerChoices: question.answerChoices,
        userAnswer,
        correctAnswer: question.correctAnswer,
        breakdown: question.breakdown,
        answerChoiceExplanations: question.answerChoiceExplanations,
        reasoningType: question.reasoningType,
      };
      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: { question: questionData, messages: [] },
      });
      if (error) throw error;
      setMessages([{ role: 'assistant', content: data.content }]);
      setInitializing(false);
    } catch (e: any) {
      const msg = await extractFunctionError(e);
      setMessages([{ role: 'assistant', content: msg }]);
      setInitializing(false);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !question || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      const questionData = {
        qid: question.qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: question.qtype,
        level: question.difficulty,
        stimulus: question.stimulus,
        questionStem: question.questionStem,
        answerChoices: question.answerChoices,
        userAnswer,
        correctAnswer: question.correctAnswer,
        breakdown: question.breakdown,
        answerChoiceExplanations: question.answerChoiceExplanations,
        reasoningType: question.reasoningType,
      };
      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: {
          question: questionData,
          messages: [...messages, { role: 'user', content: userMessage }],
        },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e: any) {
      const msg = await extractFunctionError(e);
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      toast.error(msg);
    } finally {
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
              <p
                key={idx}
                className="text-[13px] leading-[1.65] text-neutral-200 whitespace-pre-wrap animate-in fade-in duration-200 select-text"
              >
                {msg.content}
              </p>
            ) : (
              <p
                key={idx}
                className="text-right text-[12px] leading-[1.5] text-neutral-500 italic whitespace-pre-wrap animate-in fade-in duration-150 select-text"
              >
                {msg.content}
              </p>
            )
          )}

          {(isLoading || initializing) && (
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
