import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { useOperatorChat } from '@/hooks/useOperatorChat';
import { ActionCard } from './ActionCard';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'List my students',
  'Draft a session recap for ',
  'Message ',
  'Summarize how ',
];

export default function OperatorChat() {
  const { messages, isLoading, error, sendMessage, newConversation } = useOperatorChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-[#16110c]">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-zinc-800/60 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-1.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100 tracking-tight">
              AI Teaching Assistant
            </div>
            <div className="text-[11px] text-zinc-500">
              Your operator — drafts, messages, plans
            </div>
          </div>
        </div>
        <button
          onClick={newConversation}
          className="text-[11px] text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-900 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New chat
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
          {empty && (
            <div className="text-center py-12 space-y-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                  What do you want to get done?
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Tell me what you'd tell a chief of staff. I'll draft, message, and
                  organize. Nothing destructive happens without your approval.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs text-zinc-300 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-amber-500/40 hover:text-amber-200 hover:bg-amber-500/5 transition-colors"
                  >
                    {s}…
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-amber-500/15 border border-amber-500/20 text-amber-50'
                    : 'bg-zinc-900/70 border border-zinc-800 text-zinc-100',
                )}
              >
                {m.pending && !m.content ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-strong:text-amber-200">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {m.tool_results && m.tool_results.length > 0 && (
                <div className="w-full max-w-[85%] space-y-1.5">
                  {m.tool_results.map((tr, i) => (
                    <ActionCard key={i} tr={tr} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800/60 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-2 text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-1.5">
              {error}
            </div>
          )}
          <PromptInputBox
            isLoading={isLoading}
            onSend={async (msg, files) => {
              if (files && files.length > 0) {
                const { buildAttachmentBlock } = await import('./extractFileText');
                const block = await buildAttachmentBlock(files);
                sendMessage(`${msg}${block}`);
              } else {
                sendMessage(msg);
              }
            }}
            placeholder="Tell me what to do…"
          />
          <div className="mt-2 text-[10px] text-zinc-600 text-center">
            Operator mode · drafts are queued for your approval
          </div>
        </div>
      </div>
    </div>
  );
}
