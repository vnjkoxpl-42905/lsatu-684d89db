import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, Loader2, Lock, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOperatorChat, type OperatorToolResult } from '@/hooks/useOperatorChat';
import { buildSeedCommand, buildTaskContext, type DeskTask } from './deskTasks';

interface CreatedDraft {
  id?: string;
  draft_markdown?: string;
  draft_type?: string;
}

function findCreateDraft(results?: OperatorToolResult[]): CreatedDraft | undefined {
  const data = results?.find((r) => r.name === 'create_draft' && r.result?.ok)?.result?.data;
  return (data as { draft?: CreatedDraft } | undefined)?.draft;
}

/**
 * The compact "mini terminal chat" that lives where the white draft textbox used
 * to be inside the WorkSurface. It does NOT overtake the desk: the cube, rails,
 * and right-panel action button stay. The assistant drafts/refines into the
 * editable draft below; the right-panel button is still the single commit.
 *
 * - variant 'draft' (reply/review): assistant output fills the editable draft
 *   (bound to the parent's editValue), which the right-panel button sends.
 * - variant 'advisory' (assign): assistant only recommends in the transcript;
 *   the drill picker remains the input the right-panel button assigns.
 *
 * Honest in local preview: the chat is read-only (no failing Supabase invoke).
 */
export function MiniChat({
  task,
  variant,
  draft,
  onDraftChange,
  localPreview,
}: {
  task: DeskTask;
  variant: 'draft' | 'advisory';
  draft: string;
  onDraftChange: (value: string) => void;
  localPreview: boolean;
}) {
  const { messages, isLoading, error, sendMessage, newConversation } = useOperatorChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastBoundMsgId = useRef<string | null>(null);
  const draftsInto = variant === 'draft';

  // When an assistant turn finishes with a create_draft, drop the body into the
  // editable draft (draft variant only) so the right-panel button can send it.
  useEffect(() => {
    if (!draftsInto) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant || lastAssistant.pending) return;
    if (lastAssistant.id === lastBoundMsgId.current) return;
    lastBoundMsgId.current = lastAssistant.id;
    const created = findCreateDraft(lastAssistant.tool_results);
    if (created?.draft_markdown) onDraftChange(created.draft_markdown);
  }, [messages, draftsInto, onDraftChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(
    (text: string) => {
      if (!text.trim() || localPreview || isLoading) return;
      sendMessage(text, buildTaskContext(task));
    },
    [isLoading, localPreview, sendMessage, task],
  );

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    send(text);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="mt-4 border border-black/16 bg-white/35">
      {/* terminal header */}
      <div className="flex items-center justify-between border-b border-black/10 px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> AI assistant
        </span>
        {hasMessages && !localPreview ? (
          <button
            type="button"
            onClick={() => newConversation()}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45 transition hover:text-black"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} /> New
          </button>
        ) : null}
      </div>

      {/* transcript (compact) */}
      {hasMessages ? (
        <div ref={scrollRef} className="max-h-[160px] space-y-2 overflow-y-auto px-3 py-2.5">
          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[88%] border px-2.5 py-1.5 text-[12.5px] leading-relaxed',
                  m.role === 'user' ? 'border-black bg-black text-white' : 'border-black/14 bg-white/70 text-[#11181c]',
                )}
              >
                {m.pending && !m.content ? (
                  <span className="inline-flex items-center gap-1.5 text-black/55">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> Drafting…
                  </span>
                ) : (
                  <div
                    className={cn(
                      'prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1',
                      m.role === 'user' ? 'prose-invert' : 'prose-neutral',
                    )}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* editable draft — the artifact the right-panel button commits */}
      {draftsInto ? (
        <div className="px-3 pt-2.5">
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40">Draft</div>
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={
              task.sourceKind === 'conversation'
                ? 'Ask the assistant to draft a reply, or write your own…'
                : 'Ask the assistant to refine this, or edit it directly…'
            }
            className="min-h-[96px] w-full resize-y border border-black/16 bg-white/70 px-3 py-2 text-[13px] leading-relaxed outline-none placeholder:text-black/35 focus:border-black"
          />
        </div>
      ) : !hasMessages ? (
        <p className="px-3 py-2.5 text-[12px] leading-5 text-black/45">
          Ask the assistant which drill fits, then pick it below.
        </p>
      ) : null}

      {error ? <div className="mx-3 mt-2 border border-black/25 bg-white/40 px-2.5 py-1 text-[11px]">{error}</div> : null}

      {/* terminal input */}
      <div className="m-3 flex items-center gap-2 border border-black/16 bg-white/45 px-2.5 py-1.5">
        {localPreview ? (
          <>
            <Lock className="h-3.5 w-3.5 shrink-0 text-black/40" strokeWidth={1.5} />
            <span className="truncate text-[12px] text-black/45">
              Assistant is read-only in local preview. It connects on the live teacher desk.
            </span>
          </>
        ) : (
          <>
            <span className="font-mono text-[13px] text-black/40">❯</span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={
                draftsInto
                  ? task.sourceKind === 'conversation'
                    ? 'draft a reply…'
                    : 'refine this draft…'
                  : 'which drill should I assign?'
              }
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-[#11181c] outline-none placeholder:text-black/35"
            />
            {!hasMessages ? (
              <button
                type="button"
                onClick={() => send(buildSeedCommand(task))}
                disabled={isLoading}
                className="shrink-0 whitespace-nowrap border border-black/16 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/60 transition hover:bg-black hover:text-white disabled:opacity-40"
              >
                {draftsInto ? 'Draft with AI' : 'Recommend'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim() || isLoading}
              aria-label="Send command"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center border border-black/16 text-black/60 transition hover:bg-black hover:text-white disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
              ) : (
                <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
