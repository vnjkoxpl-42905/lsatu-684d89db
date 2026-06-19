import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles } from 'lucide-react';
import { useOperatorChatContext } from '@/components/teacher/ai-ta/OperatorChatProvider';
import { cn } from '@/lib/utils';
import { AssistantComposer } from './AssistantComposer';

/**
 * Center chat surface for the Teacher Desk. Light "instrument-panel" transcript
 * (not the dark AI TA page) plus the existing AssistantComposer. Reads the
 * shared OperatorChat session, so opening a saved chat from the left rail loads
 * its transcript here.
 */
export function DeskChatPanel({ localPreview }: { localPreview: boolean }) {
  const { messages, isLoading, error, sendMessage } = useOperatorChatContext();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = (text: string, context?: Record<string, unknown>) => {
    if (!text.trim() || localPreview || isLoading) return;
    sendMessage(text, context);
  };

  const submit = (sources?: import('./AssistantComposer').ComposerSubmitSources) => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const parts = [text];
    if (sources?.labels.length) {
      parts.push(`[Attached context: ${sources.labels.join(', ')}]`);
    }
    if (sources?.drive.length) {
      const drive = sources.drive.map((f) => `${f.name} (${f.url})`).join(', ');
      parts.push(`[Google Drive files: ${drive}]`);
    }

    const context = sources?.driveConnector ? { driveConnector: true } : undefined;
    send(parts.join('\n\n'), context);
  };

  return (
    <div className="flex w-full max-w-[680px] flex-col">
      <div
        ref={scrollRef}
        className="min-h-[320px] flex-1 overflow-y-auto border border-black/18 bg-white/22 p-5 backdrop-blur-[1px]"
      >
        {empty ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/15 bg-white/40">
              <Sparkles className="h-5 w-5 text-[#c8841f]" strokeWidth={1.6} />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">What can I help you get done?</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-black/52">
              Draft replies, plan a student's next work, or summarize a session. Saved chats stay in the left rail to
              return to.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={cn('flex flex-col', message.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[88%] border px-3.5 py-2.5 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'border-[#c8841f]/30 bg-[#c8841f]/12 text-black/80'
                      : 'border-black/12 bg-white/70 text-black/80',
                  )}
                >
                  {message.pending && !message.content ? (
                    <Loader2 className="h-4 w-4 animate-spin text-black/40" />
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-2 border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-700">{error}</div>
      ) : null}

      <AssistantComposer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        loading={isLoading}
        disabled={localPreview}
        onUtilityCommand={send}
        readOnlyMessage={
          localPreview ? 'Assistant is read-only in local preview. It connects on the live teacher desk.' : undefined
        }
        placeholder="Ask the assistant anything..."
      />
    </div>
  );
}
