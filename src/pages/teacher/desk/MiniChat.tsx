import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ArrowUp, Check, ChevronRight, Loader2, Lock, Pencil, Plus, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOperatorChat, type OperatorToolResult } from '@/hooks/useOperatorChat';
import { DraftEditor } from './DraftEditor';
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

function draftLabel(task: DeskTask): string {
  if (task.sourceKind === 'conversation') return 'Draft reply';
  if (task.sourceKind === 'draft') return 'Draft recap';
  return 'Draft';
}

/**
 * The AI assistant chat that lives in the WorkSurface. Per the desk page glossary
 * (./CONTEXT.md → "Draft Bubble"):
 *
 * - There is NO standing draft box. Before a draft exists the Stage shows only the
 *   transcript + Composer.
 * - When the assistant produces a draft (create_draft), it renders as a distinct
 *   full-width DOCUMENT CARD with a header strip (type label + Edit/Send), visually
 *   separate from ordinary chatter (which stays a small bubble).
 * - Each revision is a new card; older revisions collapse to a one-line chip.
 * - Send is a two-tap confirm ("Send to {name}?") that commits via the parent's
 *   handler, then locks the card to a receipt.
 *
 * variant 'advisory' (assign): assistant only recommends in the transcript; the
 * drill picker + right-panel button remain the commit, so no draft card renders.
 *
 * Honest in local preview: the chat is read-only (no failing Supabase invoke).
 */
export function MiniChat({
  task,
  variant,
  draft,
  onDraftChange,
  onSend,
  sending,
  localPreview,
}: {
  task: DeskTask;
  variant: 'draft' | 'advisory';
  draft: string;
  onDraftChange: (value: string) => void;
  onSend?: () => void | Promise<void>;
  sending?: boolean;
  localPreview: boolean;
}) {
  const { messages, isLoading, error, sendMessage, newConversation } = useOperatorChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastBoundMsgId = useRef<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftsInto = variant === 'draft';

  // Per-task draft card state. Reset whenever the selected task changes.
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [openVersion, setOpenVersion] = useState<number | null>(null);
  const [sent, setSent] = useState<{ text: string; at: string } | null>(null);

  useEffect(() => {
    setEditing(false);
    setConfirming(false);
    setHistory([]);
    setOpenVersion(null);
    setSent(null);
    lastBoundMsgId.current = null;
  }, [task.id]);

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  // When an assistant turn finishes with a create_draft, the new draft becomes the
  // live card. Any prior draft text is pushed into the collapsed revision history.
  useEffect(() => {
    if (!draftsInto) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant || lastAssistant.pending) return;
    if (lastAssistant.id === lastBoundMsgId.current) return;
    const created = findCreateDraft(lastAssistant.tool_results);
    if (!created?.draft_markdown) return;
    lastBoundMsgId.current = lastAssistant.id;
    const prior = draft.trim();
    if (prior && prior !== created.draft_markdown.trim()) {
      setHistory((current) => [...current, prior]);
    }
    setEditing(false);
    setConfirming(false);
    setSent(null);
    onDraftChange(created.draft_markdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, draftsInto]);

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

  const beginConfirm = () => {
    setConfirming(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
  };

  const confirmSend = async () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirming(false);
    const text = draft;
    if (onSend) await onSend();
    setEditing(false);
    setSent({ text, at: format(new Date(), 'h:mm a') });
  };

  const hasMessages = messages.length > 0;
  const studentName = task.studentName?.trim() || 'student';
  const hasDraft = draft.trim().length > 0 || sent !== null;

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

      {/* DRAFT CARD — the student-facing artifact. Only renders once a draft exists. */}
      {draftsInto && hasDraft ? (
        <div className="px-3 pt-2.5">
          {/* collapsed superseded revisions */}
          {history.map((text, index) => {
            const open = openVersion === index;
            return (
              <div key={index} className="mb-1.5">
                <button
                  type="button"
                  onClick={() => setOpenVersion(open ? null : index)}
                  className="flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40 transition hover:text-black/70"
                >
                  <ChevronRight className={cn('h-3 w-3 transition', open && 'rotate-90')} strokeWidth={1.5} />
                  v{index + 1} · superseded
                </button>
                {open ? (
                  <div className="mt-1 border border-black/10 bg-white/40 px-2.5 py-1.5 text-[12px] leading-relaxed text-black/55">
                    <div className="prose prose-sm prose-neutral max-w-none prose-p:my-1">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* live document card (or locked receipt once sent) */}
          <div className={cn('border', sent ? 'border-black/14 bg-white/30' : 'border-black/30 bg-white/75')}>
            <div
              className={cn(
                'flex items-center justify-between border-b px-3 py-1.5',
                sent ? 'border-black/10' : 'border-black/14',
              )}
            >
              {sent ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/55">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} /> Sent to {studentName} · {sent.at}
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> {draftLabel(task)}
                  </span>
                  {confirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={confirmSend}
                        disabled={sending || localPreview}
                        className="inline-flex h-6 items-center gap-1 bg-black px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-black/85 disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <Send className="h-3 w-3" strokeWidth={1.5} />}
                        Send to {studentName}?
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmTimer.current) clearTimeout(confirmTimer.current);
                          setConfirming(false);
                        }}
                        aria-label="Cancel send"
                        className="inline-flex h-6 w-6 items-center justify-center border border-black/16 text-black/55 transition hover:bg-black hover:text-white"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing((v) => !v)}
                        className={cn(
                          'inline-flex h-6 items-center gap-1 border px-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition',
                          editing
                            ? 'border-black bg-black text-white'
                            : 'border-black/16 text-black/60 hover:bg-black hover:text-white',
                        )}
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.5} /> {editing ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={beginConfirm}
                        disabled={localPreview || !draft.trim()}
                        className="inline-flex h-6 items-center gap-1 border border-black/16 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/60 transition hover:bg-black hover:text-white disabled:opacity-40"
                      >
                        <Send className="h-3 w-3" strokeWidth={1.5} /> Send
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-3 py-2.5">
              {sent ? (
                <div className="prose prose-sm prose-neutral max-w-none text-black/55 prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown>{sent.text}</ReactMarkdown>
                </div>
              ) : editing ? (
                <DraftEditor
                  value={draft}
                  onChange={onDraftChange}
                  canUseAi={!localPreview}
                  ariaLabel={`Edit ${draftLabel(task).toLowerCase()}`}
                />
              ) : (
                <div className="prose prose-sm prose-neutral max-w-none text-[13px] prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown>{draft}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : !draftsInto && !hasMessages ? (
        <p className="px-3 py-2.5 text-[12px] leading-5 text-black/45">
          Ask the assistant which drill fits, then pick it below.
        </p>
      ) : null}

      {error ? <div className="mx-3 mt-2 border border-black/25 bg-white/40 px-2.5 py-1 text-[11px]">{error}</div> : null}

      {/* composer */}
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
                  ? hasDraft
                    ? 'ask for a change…'
                    : task.sourceKind === 'conversation'
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
